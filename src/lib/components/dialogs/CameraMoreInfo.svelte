<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	import { optimisticEntities } from '$lib/ha/optimistic';
	import { connection } from '$lib/ha/websocket'; // adjust to your actual export
	import { configStore } from '$lib/stores/config';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Hls from 'hls.js';

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
		entityId: string | null; // null for url-type feeds
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

	let activeFeedId = $state('');

	$effect(() => {
		if (!feeds.length) { activeFeedId = ''; return; }
		if (!activeFeedId || !feeds.some((f) => f.id === activeFeedId)) {
			activeFeedId = primaryFeedId;
		}
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
	type FeedStreamState =
		| { status: 'loading' }
		| { status: 'ready'; url: string }
		| { status: 'error'; message: string };

	let streamStateByFeed = $state<Record<string, FeedStreamState>>({});

	async function requestHlsUrl(camEntityId: string): Promise<string | null> {
		try {
			const result = await (connection as any).sendMessagePromise({
				type: 'camera/stream',
				entity_id: camEntityId,
				format: 'hls',
			});
			return (result as { url: string }).url ?? null;
		} catch {
			return null;
		}
	}

	// Fetch HLS URL whenever active feed changes, skip url-type feeds
	$effect(() => {
		const feed = activeFeed;
		if (!feed) return;

		const existing = streamStateByFeed[feed.id];
		if (existing) return; // already fetched or in-flight

		if (feed.sourceType === 'url' || !feed.entityId) {
			streamStateByFeed = {
				...streamStateByFeed,
				[feed.id]: { status: 'error', message: 'URL-type feeds do not support HLS streaming.' }
			};
			return;
		}

		streamStateByFeed = { ...streamStateByFeed, [feed.id]: { status: 'loading' } };

		requestHlsUrl(feed.entityId).then((url) => {
			streamStateByFeed = {
				...streamStateByFeed,
				[feed.id]: url
					? { status: 'ready', url }
					: { status: 'error', message: 'Stream unavailable.' }
			};
		});
	});

	const activeStreamState = $derived(
		activeFeed ? (streamStateByFeed[activeFeed.id] ?? { status: 'loading' }) : null
	);

	// ── Video Element + HLS.js ────────────────────────────────────────────
	let videoEl = $state<HTMLVideoElement | null>(null);
	let hlsInstance: Hls | null = null;

	function teardownHls() {
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
		if (videoEl) {
			videoEl.pause();
			videoEl.src = '';
			videoEl.load(); // forces browser to release the network connection
		}
	}

	// Attach HLS whenever the video element exists and a stream URL is ready
	$effect(() => {
		const el = videoEl;
		const state = activeStreamState;

		if (!el || !state || state.status !== 'ready') return;

		const { url } = state;
		teardownHls(); // clean up any prior session first

		if (el.canPlayType('application/vnd.apple.mpegurl')) {
			// Safari — native HLS support
			el.src = url;
			el.play().catch(() => {});
		} else if (Hls.isSupported()) {
			hlsInstance = new Hls({ enableWorker: true });
			hlsInstance.loadSource(url);
			hlsInstance.attachMedia(el);
			hlsInstance.once(Hls.Events.MANIFEST_PARSED, () => {
				el.play().catch(() => {});
			});
		} else {
			streamStateByFeed = {
				...streamStateByFeed,
				[activeFeed!.id]: { status: 'error', message: 'HLS not supported in this browser.' }
			};
		}

		// Teardown when this effect re-runs (feed change) or component unmounts
		return () => teardownHls();
	});

	// ── Feed Selection ─────────────────────────────────────────────────────
	function selectFeed(feedId: string) {
		haptic('medium');
		activeFeedId = feedId;
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
		<!-- svelte-ignore a11y-media-has-caption -->
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
	.cammi__video--hidden {
		/* keep the element mounted so bind:this is always valid,
		   but hide it until the stream is actually playing */
		visibility: hidden;
	}
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

	/* ── Overlay (loading / error) ────────────────────────────────────────── */
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
	/* spinner rotation — target the svg inside the icon */
	.cammi__overlay :global(.cammi__spinner) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>