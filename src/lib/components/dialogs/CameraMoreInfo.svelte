<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	import { onDestroy, untrack } from 'svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { connection } from '$lib/ha/websocket';
	import { activeDialog } from '$lib/stores/ui';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type Hls from 'hls.js';

	// ── Props ─────────────────────────────────────────────────────────────
	interface Props {
		entityId: string;
		tile?: Tile | null;
	}
	const { entityId, tile = null }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const stateLabel = $derived.by(() => {
		const raw = (entity?.state as string | undefined) ?? 'unknown';
		const map: Record<string, string> = {
			recording:   'Recording',
			streaming:   'Live',
			idle:        'Idle',
			unavailable: 'Unavailable',
			unknown:     'Unknown'
		};
		return map[raw] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
	});

	// ── Types ─────────────────────────────────────────────────────────────
	interface ResolvedCameraFeed {
		id: string;
		label: string;
		sourceType: 'entity' | 'url';
		entityId: string | null;
	}

	// ── Feed Resolution ────────────────────────────────────────────────────
	const feeds = $derived.by<ResolvedCameraFeed[]>(() => {
		const configured = ((tile?.config.camera_feeds as CameraFeedConfig[] | undefined) ?? [])
			.filter((feed) => !!feed && typeof feed.id === 'string' && feed.id.length > 0);

		const resolved = configured.map((feed) => {
			if (feed.type === 'url') {
				return {
					id: feed.id,
					label: feed.label?.trim() || 'Custom feed',
					sourceType: 'url' as const,
					entityId: null
				};
			}
			const sourceEntityId = feed.entity_id?.trim() || entityId;
			const friendlyName = ($optimisticEntities[sourceEntityId]?.attributes?.friendly_name as string | undefined)?.trim();
			return {
				id: feed.id,
				label: feed.label?.trim() || friendlyName || sourceEntityId,
				sourceType: 'entity' as const,
				entityId: sourceEntityId
			};
		});

		if (resolved.length > 0) return resolved;

		return [{
			id: '__default',
			label: 'Camera',
			sourceType: 'entity' as const,
			entityId
		}];
	});

	// ── Active Feed ────────────────────────────────────────────────────────
	const primaryFeedId = $derived.by(() => {
		const contextFeedId = $activeDialog?.context?.feedId as string | undefined;
		if (contextFeedId && feeds.some((f) => f.id === contextFeedId)) {
			return contextFeedId;
		}
		const configuredPrimary = tile?.config.camera_primary_feed as string | undefined;
		return feeds.some((f) => f.id === configuredPrimary)
			? configuredPrimary!
			: (feeds[0]?.id ?? '');
	});

	let userSelectedFeedId = $state('');

	const activeFeedId = $derived.by(() => {
		if (userSelectedFeedId && feeds.some((f) => f.id === userSelectedFeedId)) {
			return userSelectedFeedId;
		}
		return primaryFeedId || feeds[0]?.id || '';
	});

	const activeFeed = $derived(feeds.find((f) => f.id === activeFeedId) ?? null);

	const orderedFeeds = $derived.by(() => {
		if (!activeFeedId) return feeds;
		const index = feeds.findIndex((f) => f.id === activeFeedId);
		if (index <= 0) return feeds;
		const next = [...feeds];
		const [primary] = next.splice(index, 1);
		next.unshift(primary);
		return next;
	});

	// ── Stream State ──────────────────────────────────────────────────────
	type StreamState =
		| { status: 'loading' }
		| { status: 'ready' }
		| { status: 'error'; message: string };

	const STREAM_TIMEOUT_MS = 15000;

	let streamStateByFeed = $state<Record<string, StreamState>>({});
	let hlsInstance: InstanceType<typeof Hls> | null = null;
	let videoEl = $state<HTMLVideoElement | null>(null);
	let activeStreamFeedId = '';

	function setFeedStreamState(feedId: string, next: StreamState) {
		const prev = streamStateByFeed[feedId];
		if (
			prev &&
			prev.status === next.status &&
			(prev.status !== 'error' || (next.status === 'error' && prev.message === next.message))
		) return;
		streamStateByFeed = { ...streamStateByFeed, [feedId]: next };
	}

	function teardown() {
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
		if (videoEl) {
			videoEl.pause();
			videoEl.srcObject = null;
			videoEl.src = '';
			videoEl.load();
		}
	}

	onDestroy(() => {
		activeStreamFeedId = '';
		teardown();
	});

	// ── HLS ───────────────────────────────────────────────────────────────
	async function startHls(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean },
		conn: NonNullable<typeof $connection>
	): Promise<void> {
		const response = await conn.sendMessagePromise<{ url: string }>({
			type: 'camera/stream',
			entity_id: feed.entityId!
		});

		if (signal.cancelled) return;

		const url = response.url;
		if (!url) throw new Error('No URL returned');

		const { default: HlsLib } = await import('hls.js');
		if (signal.cancelled) return;

		if (HlsLib.isSupported()) {
			const localHls = new HlsLib({
				backBufferLength: 60,
				fragLoadingTimeOut: 30000,
				manifestLoadingTimeOut: 30000,
				levelLoadingTimeOut: 30000,
				maxLiveSyncPlaybackRate: 2,
				lowLatencyMode: true,
				// withCredentials ensures HLS segment requests go through
				// the ingress session — relay handles auth server-side
				xhrSetup: (xhr) => {
					xhr.withCredentials = true;
				}
			});
			hlsInstance = localHls;
			localHls.loadSource(url);
			localHls.attachMedia(el);

			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => reject(new Error('HLS manifest timeout')), STREAM_TIMEOUT_MS);
				const cleanup = () => {
					clearTimeout(timer);
					localHls.off(HlsLib.Events.MANIFEST_PARSED, onParsed);
					localHls.off(HlsLib.Events.ERROR, onStartupError);
				};
				const onParsed = () => {
					cleanup();
					if (signal.cancelled) return;
					el.play().catch(() => {});
					setFeedStreamState(feed.id, { status: 'ready' });
					resolve();
				};
				const onStartupError = (_: unknown, data: { fatal: boolean; type?: string }) => {
					if (!data.fatal) return;
					cleanup();
					reject(new Error(data.type ? `HLS ${data.type}` : 'HLS fatal error'));
				};
				localHls.on(HlsLib.Events.MANIFEST_PARSED, onParsed);
				localHls.on(HlsLib.Events.ERROR, onStartupError);
			});

			// post-start error handler
			localHls.on(HlsLib.Events.ERROR, (_, data) => {
				if (hlsInstance !== localHls || signal.cancelled || !data.fatal) return;
				switch (data.type) {
					case HlsLib.ErrorTypes.MEDIA_ERROR:
						localHls.recoverMediaError();
						break;
					case HlsLib.ErrorTypes.NETWORK_ERROR:
						teardown();
						setFeedStreamState(feed.id, { status: 'error', message: 'Network error.' });
						break;
					default:
						teardown();
						setFeedStreamState(feed.id, { status: 'error', message: 'Stream error.' });
				}
			});

		} else if (el.canPlayType('application/vnd.apple.mpegurl')) {
			el.src = url;
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => { cleanup(); reject(new Error('Native HLS timeout')); }, STREAM_TIMEOUT_MS);
				const onLoaded = () => { cleanup(); if (signal.cancelled) return; el.play().catch(() => {}); setFeedStreamState(feed.id, { status: 'ready' }); resolve(); };
				const onError = () => { cleanup(); reject(new Error('Native HLS error')); };
				const cleanup = () => { clearTimeout(timer); el.removeEventListener('loadedmetadata', onLoaded); el.removeEventListener('error', onError); };
				el.addEventListener('loadedmetadata', onLoaded, { once: true });
				el.addEventListener('error', onError, { once: true });
			});
		} else {
			setFeedStreamState(feed.id, { status: 'error', message: 'HLS not supported in this browser.' });
		}
	}

	// ── Start Stream ──────────────────────────────────────────────────────
	async function startStream(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean }
	) {
		if (!feed.entityId) {
			setFeedStreamState(feed.id, { status: 'error', message: 'URL-type feeds do not support streaming.' });
			return;
		}

		const conn = $connection;
		if (!conn) {
			setFeedStreamState(feed.id, { status: 'error', message: 'No connection.' });
			return;
		}

		teardown();
		setFeedStreamState(feed.id, { status: 'loading' });

		try {
			await startHls(feed, el, signal, conn);
		} catch (error: unknown) {
			if (signal.cancelled) return;
			const code = (error as { code?: string })?.code;
			const message = (error as { message?: string })?.message;
			teardown();
			if (code === 'start_stream_failed') {
				setFeedStreamState(feed.id, { status: 'error', message: 'Camera does not support streaming.' });
			} else {
				setFeedStreamState(feed.id, { status: 'error', message: message ?? 'Stream unavailable.' });
			}
		}
	}

	// ── Effect ────────────────────────────────────────────────────────────
	$effect(() => {
		const feedId = activeFeedId;
		const el = videoEl;
		if (!feedId || !el) return;
		if (activeStreamFeedId === feedId) return;
		const feed = untrack(() => feeds.find((f) => f.id === feedId));
		if (!feed) return;
		activeStreamFeedId = feedId;
		const token = { cancelled: false };

		untrack(() => startStream(feed, el, token));

		return () => {
			token.cancelled = true;
			activeStreamFeedId = '';
			teardown();
		};
	});

	const activeStreamState = $derived(
		activeFeed ? (streamStateByFeed[activeFeed.id] ?? { status: 'loading' }) : null
	);

	// ── Feed Selection ─────────────────────────────────────────────────────
	function selectFeed(feedId: string) {
		haptic('medium');
		userSelectedFeedId = feedId;
	}
</script>

<!-- ── Camera More-Info ───────────────────────────────────────────────────── -->
<div class="cammi">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="cammi__header">
		<div class="cammi__icon"><Icon name="camera" size={22} /></div>
		<div class="cammi__state">{stateLabel}</div>
	</div>

	<!-- ── Feed Tabs ────────────────────────────────────────────────────────── -->
	{#if feeds.length > 1}
		<div class="cammi__feeds" role="tablist" aria-label="Camera feeds">
			{#each orderedFeeds as feed (feed.id)}
				<button
					class="cammi__feed-btn"
					class:cammi__feed-btn--active={feed.id === activeFeedId}
					type="button"
					role="tab"
					aria-selected={feed.id === activeFeedId}
					onclick={() => selectFeed(feed.id)}
				>
					<span class="cammi__feed-label">{feed.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- ── Video ────────────────────────────────────────────────────────────── -->
	<div class="cammi__media">
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			bind:this={videoEl}
			class="cammi__video"
			class:cammi__video--hidden={activeStreamState?.status !== 'ready'}
			autoplay
			muted
			playsinline
		></video>

		{#if activeStreamState?.status === 'error'}
			<div class="cammi__overlay">
				<Icon name="video-off" size={28} />
				<span>{activeStreamState.message}</span>
			</div>
		{:else if activeStreamState?.status === 'ready'}
			<span class="cammi__live-badge" aria-label="Live stream active">LIVE</span>
		{/if}
	</div>

</div>

<style>
	/* ── Layout ───────────────────────────────────────────────────────────── */
	.cammi { display:flex; flex-direction:column; gap:12px; padding:18px; }
	.cammi__header { display:flex; align-items:center; gap:10px; color:var(--fg-subtle); }
	.cammi__icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); }
	.cammi__state { font-size:0.84rem; text-transform:capitalize; }

	/* ── Feed Tabs ────────────────────────────────────────────────────────── */
	.cammi__feeds { display:flex; gap:8px; overflow-x:auto; padding-bottom:2px; }
	.cammi__feed-btn {
		flex: 0 0 auto;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		border-radius: 10px;
		padding: 6px 12px;
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
	}
	.cammi__feed-btn--active {
		color: var(--fg);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}

	/* ── Media ────────────────────────────────────────────────────────────── */
	.cammi__media {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--hover);
		border-radius: var(--radius);
		border: 1px solid var(--border);
		overflow: hidden;
	}
	.cammi__video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cammi__video--hidden { visibility: hidden; }
	.cammi__live-badge {
		position: absolute;
		top: 10px; right: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 18px;
		padding: 0 7px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-danger) 65%, transparent);
		background: color-mix(in srgb, var(--color-danger) 20%, var(--bg-elevated));
		color: var(--color-danger);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		pointer-events: none;
	}

	/* ── Overlay ──────────────────────────────────────────────────────────── */
	.cammi__overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		color: var(--fg-subtle);
		font-size: 0.84rem;
	}
</style>
