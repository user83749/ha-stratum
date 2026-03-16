<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	import { optimisticEntities } from '$lib/ha/optimistic';
	import { connection } from '$lib/ha/websocket';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Hls from 'hls.js';
	import type { ErrorData } from 'hls.js';

	// ── Props ─────────────────────────────────────────────────────────────
	interface Props {
		entityId: string;
		tile?: Tile | null;
	}
	const { entityId, tile = null }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const stateLabel = $derived((entity?.state as string | undefined) ?? 'unknown');

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
			return {
				id: feed.id,
				label: feed.label?.trim() || sourceEntityId,
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

	// ── HLS Stream ────────────────────────────────────────────────────────
	type StreamState =
		| { status: 'loading' }
		| { status: 'ready' }
		| { status: 'error'; message: string };

	let streamStateByFeed = $state<Record<string, StreamState>>({});
	let hlsInstance: Hls | null = null;
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
			videoEl.src = '';
			videoEl.load();
		}
	}

	async function startHls(feed: ResolvedCameraFeed, el: HTMLVideoElement, signal: { cancelled: boolean }) {
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
			const result = await conn.sendMessagePromise<{ url?: string }>({
				type: 'camera/stream',
				entity_id: feed.entityId,
				format: 'hls',
			});
			if (signal.cancelled) return;

			const url = result.url;
			if (!url) throw new Error('No URL returned');

			if (el.canPlayType('application/vnd.apple.mpegurl')) {
				// Safari — native HLS
				el.src = url;
				el.play().catch(() => {});
				if (signal.cancelled) return;
				setFeedStreamState(feed.id, { status: 'ready' });
			} else if (Hls.isSupported()) {
				hlsInstance = new Hls({ enableWorker: true });
				hlsInstance.loadSource(url);
				hlsInstance.attachMedia(el);
				hlsInstance.once(Hls.Events.MANIFEST_PARSED, () => {
					if (signal.cancelled) return;
					el.play().catch(() => {});
					setFeedStreamState(feed.id, { status: 'ready' });
				});
				hlsInstance.once(Hls.Events.ERROR, (_event: string, data: ErrorData) => {
					if (signal.cancelled) return;
					if (data.fatal) {
						teardown();
						setFeedStreamState(feed.id, { status: 'error', message: 'Stream error.' });
					}
				});
			} else {
				setFeedStreamState(feed.id, { status: 'error', message: 'HLS not supported in this browser.' });
			}

		} catch {
			if (signal.cancelled) return;
			teardown();
			setFeedStreamState(feed.id, { status: 'error', message: 'Stream unavailable.' });
		}
	}

	$effect(() => {
		const feed = activeFeed;
		const el = videoEl;
		if (!feed || !el) return;
		if (activeStreamFeedId === feed.id) return;
		activeStreamFeedId = feed.id;
		const token = { cancelled: false };

		startHls(feed, el, token);

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
			muted
			playsinline
		></video>

		{#if activeStreamState?.status === 'loading'}
			<div class="cammi__overlay">
				<Icon name="loader-2" size={28} class="cammi__spinner" />
			</div>
		{:else if activeStreamState?.status === 'error'}
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
	.cammi__overlay :global(.cammi__spinner) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
