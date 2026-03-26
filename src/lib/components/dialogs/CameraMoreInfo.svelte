<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	import { onDestroy } from 'svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { connection } from '$lib/ha/websocket';
	import { activeDialog } from '$lib/stores/ui';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type Hls from 'hls.js';

	interface Props {
		entityId: string;
		tile?: Tile | null;
	}
	const { entityId, tile = null }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const showPopupHeaderIcon = $derived((tile?.config.camera_popup_show_icon as boolean | undefined) !== false);
	const showPopupStateText = $derived((tile?.config.camera_popup_show_state as boolean | undefined) !== false);
	const showPopupHeaderMeta = $derived(showPopupHeaderIcon || showPopupStateText);
	const stateLabel = $derived.by(() => {
		const raw = (entity?.state as string | undefined) ?? 'unknown';
		const map: Record<string, string> = {
			recording: 'Recording',
			streaming: 'Live',
			idle: 'Idle',
			unavailable: 'Unavailable',
			unknown: 'Unknown'
		};
		return map[raw] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
	});

	interface ResolvedCameraFeed {
		id: string;
		label: string;
		sourceType: 'entity' | 'url';
		entityId: string | null;
		url: string | null;
		streamMode: 'auto' | 'hls' | 'direct';
		objectFit: 'cover' | 'contain';
		muted: boolean;
		lowLatency: boolean;
		retryLimit: number;
	}

	type StreamState =
		| { status: 'loading' }
		| { status: 'ready' }
		| { status: 'error'; message: string };

	const STREAM_TIMEOUT_MS = 15000;
	const SWIPE_THRESHOLD_PX = 48;
	const HLS_EXT_RE = /\.m3u8($|[?#])/i;

	const feeds = $derived.by<ResolvedCameraFeed[]>(() => {
		const configured = ((tile?.config.camera_feeds as CameraFeedConfig[] | undefined) ?? [])
			.filter((feed) => !!feed && typeof feed.id === 'string' && feed.id.length > 0);

		const resolved = configured.map((feed) => {
			const streamMode: ResolvedCameraFeed['streamMode'] =
				feed.stream_mode === 'hls' || feed.stream_mode === 'direct' ? feed.stream_mode : 'auto';
			const objectFit: ResolvedCameraFeed['objectFit'] = feed.object_fit === 'contain' ? 'contain' : 'cover';
			const retryLimit = Number.isFinite(Number(feed.retry_limit))
				? Math.max(0, Math.min(5, Math.round(Number(feed.retry_limit))))
				: 1;

			if (feed.type === 'url') {
				return {
					id: feed.id,
					label: feed.label?.trim() || 'Custom feed',
					sourceType: 'url' as const,
					entityId: null,
					url: feed.url?.trim() || null,
					streamMode,
					objectFit,
					muted: feed.muted !== false,
					lowLatency: feed.low_latency !== false,
					retryLimit
				};
			}

			const sourceEntityId = feed.entity_id?.trim() || entityId;
			const friendlyName = ($optimisticEntities[sourceEntityId]?.attributes?.friendly_name as string | undefined)?.trim();
			return {
				id: feed.id,
				label: feed.label?.trim() || friendlyName || sourceEntityId,
				sourceType: 'entity' as const,
				entityId: sourceEntityId,
				url: null,
				streamMode,
				objectFit,
				muted: feed.muted !== false,
				lowLatency: feed.low_latency !== false,
				retryLimit
			};
		});

		if (resolved.length > 0) return resolved;

		return [{
			id: '__default',
			label: 'Camera',
			sourceType: 'entity' as const,
			entityId,
			url: null,
			streamMode: 'auto',
			objectFit: 'cover',
			muted: true,
			lowLatency: true,
			retryLimit: 1
		}];
	});

	const configuredViewMode = $derived.by(() => {
		const raw = tile?.config.camera_view_mode as string | undefined;
		if (raw === 'grid2' || raw === 'grid4') return raw;
		return 'single';
	});
	const warmStandbyEnabled = $derived((tile?.config.camera_warm_standby as boolean | undefined) !== false);

	let userSelectedViewMode = $state<'single' | 'grid2' | 'grid4' | ''>('');
	const effectiveViewMode = $derived.by<'single' | 'grid2' | 'grid4'>(() => {
		const desired = userSelectedViewMode || configuredViewMode;
		const count = feeds.length;
		if (count < 2) return 'single';
		if (desired === 'grid4') return count >= 4 ? 'grid4' : 'grid2';
		if (desired === 'grid2') return 'grid2';
		return 'single';
	});

	const primaryFeedId = $derived.by(() => {
		const contextFeedId = $activeDialog?.context?.feedId as string | undefined;
		if (contextFeedId && feeds.some((f) => f.id === contextFeedId)) return contextFeedId;
		const configuredPrimary = tile?.config.camera_primary_feed as string | undefined;
		return feeds.some((f) => f.id === configuredPrimary) ? configuredPrimary! : (feeds[0]?.id ?? '');
	});

	let userSelectedFeedId = $state('');
	const activeFeedId = $derived.by(() => {
		if (userSelectedFeedId && feeds.some((f) => f.id === userSelectedFeedId)) return userSelectedFeedId;
		return primaryFeedId || feeds[0]?.id || '';
	});
	const activeFeed = $derived(feeds.find((f) => f.id === activeFeedId) ?? null);

	const gridFeeds = $derived.by(() => {
		if (effectiveViewMode === 'grid4') return feeds.slice(0, 4);
		if (effectiveViewMode === 'grid2') return feeds.slice(0, 2);
		return [];
	});
	const standbyFeed = $derived.by(() => {
		if (effectiveViewMode !== 'single') return null;
		if (!warmStandbyEnabled) return null;
		if (feeds.length < 2) return null;
		const idx = feeds.findIndex((f) => f.id === activeFeedId);
		const current = idx >= 0 ? idx : 0;
		return feeds[(current + 1) % feeds.length] ?? null;
	});
	const streamFeeds = $derived.by(() => {
		if (effectiveViewMode !== 'single') return gridFeeds;
		const list: ResolvedCameraFeed[] = [];
		if (activeFeed) list.push(activeFeed);
		if (standbyFeed && standbyFeed.id !== activeFeed?.id) list.push(standbyFeed);
		return list;
	});

	let mediaRootEl = $state<HTMLElement | null>(null);
	let streamStateByFeed = $state<Record<string, StreamState>>({});
	let sessionSeqByFeed = $state<Record<string, number>>({});
	const hlsByFeed = new Map<string, InstanceType<typeof Hls>>();
	const attachedVideoByFeed = new Map<string, HTMLVideoElement>();

	let swipeStartX = 0;
	let swipeStartY = 0;
	let swipeTracking = false;

	function bumpSession(feedId: string): number {
		const next = (sessionSeqByFeed[feedId] ?? 0) + 1;
		sessionSeqByFeed = { ...sessionSeqByFeed, [feedId]: next };
		return next;
	}
	function isSessionCurrent(feedId: string, seq: number): boolean {
		return (sessionSeqByFeed[feedId] ?? 0) === seq;
	}
	function setFeedStreamState(feedId: string, next: StreamState) {
		const prev = streamStateByFeed[feedId];
		if (
			prev &&
			prev.status === next.status &&
			(prev.status !== 'error' || (next.status === 'error' && prev.message === next.message))
		) return;
		streamStateByFeed = { ...streamStateByFeed, [feedId]: next };
	}
	function normalizeFeedUrl(raw: string): string {
		const trimmed = raw.trim();
		if (!trimmed) return '';
		if (/^https?:\/\//i.test(trimmed)) return trimmed;
		if (trimmed.startsWith('/')) return trimmed;
		return `/${trimmed}`;
	}
	function isLikelyHlsUrl(url: string): boolean {
		return HLS_EXT_RE.test(url);
	}
	function getVideoEl(feedId: string): HTMLVideoElement | null {
		if (!mediaRootEl) return null;
		const safeId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(feedId) : feedId;
		return mediaRootEl.querySelector<HTMLVideoElement>(`video[data-feed-id="${safeId}"]`);
	}
	function destroyHls(feedId: string) {
		const instance = hlsByFeed.get(feedId);
		if (!instance) return;
		instance.destroy();
		hlsByFeed.delete(feedId);
	}
	function clearVideoElement(el: HTMLVideoElement | null) {
		if (!el) return;
		el.pause();
		el.srcObject = null;
		el.src = '';
		el.load();
	}
	function stopFeed(feedId: string) {
		bumpSession(feedId);
		destroyHls(feedId);
		const el = attachedVideoByFeed.get(feedId) ?? getVideoEl(feedId);
		clearVideoElement(el ?? null);
		attachedVideoByFeed.delete(feedId);
	}
	function stopAllFeeds() {
		for (const id of Array.from(new Set([...Object.keys(streamStateByFeed), ...attachedVideoByFeed.keys()]))) {
			stopFeed(id);
		}
	}

	async function wait(ms: number) {
		return new Promise<void>((resolve) => setTimeout(resolve, ms));
	}

	async function startNativeVideo(url: string, feed: ResolvedCameraFeed, el: HTMLVideoElement, seq: number): Promise<void> {
		el.src = url;
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => { cleanup(); reject(new Error('Native stream timeout')); }, STREAM_TIMEOUT_MS);
			const onLoaded = () => { cleanup(); resolve(); };
			const onError = () => { cleanup(); reject(new Error('Native stream error')); };
			const cleanup = () => {
				clearTimeout(timer);
				el.removeEventListener('loadedmetadata', onLoaded);
				el.removeEventListener('error', onError);
			};
			el.addEventListener('loadedmetadata', onLoaded, { once: true });
			el.addEventListener('error', onError, { once: true });
		});
		if (!isSessionCurrent(feed.id, seq)) return;
		el.play().catch(() => {});
		setFeedStreamState(feed.id, { status: 'ready' });
	}

	async function startHlsPlayback(url: string, feed: ResolvedCameraFeed, el: HTMLVideoElement, seq: number): Promise<void> {
		const { default: HlsLib } = await import('hls.js');
		if (!isSessionCurrent(feed.id, seq)) return;

		if (HlsLib.isSupported()) {
			const hls = new HlsLib({
				backBufferLength: 60,
				fragLoadingTimeOut: 30000,
				manifestLoadingTimeOut: 30000,
				levelLoadingTimeOut: 30000,
				maxLiveSyncPlaybackRate: 2,
				lowLatencyMode: feed.lowLatency,
				xhrSetup: (xhr) => {
					xhr.withCredentials = true;
				}
			});
			hlsByFeed.set(feed.id, hls);
			hls.loadSource(url);
			hls.attachMedia(el);

			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => reject(new Error('HLS manifest timeout')), STREAM_TIMEOUT_MS);
				const cleanup = () => {
					clearTimeout(timer);
					hls.off(HlsLib.Events.MANIFEST_PARSED, onParsed);
					hls.off(HlsLib.Events.ERROR, onError);
				};
				const onParsed = () => {
					cleanup();
					resolve();
				};
				const onError = (_: unknown, data: { fatal: boolean; type?: string }) => {
					if (!data.fatal) return;
					cleanup();
					reject(new Error(data.type ? `HLS ${data.type}` : 'HLS fatal error'));
				};
				hls.on(HlsLib.Events.MANIFEST_PARSED, onParsed);
				hls.on(HlsLib.Events.ERROR, onError);
			});

			if (!isSessionCurrent(feed.id, seq)) return;
			el.play().catch(() => {});
			setFeedStreamState(feed.id, { status: 'ready' });
			return;
		}

		if (el.canPlayType('application/vnd.apple.mpegurl')) {
			await startNativeVideo(url, feed, el, seq);
			return;
		}

		throw new Error('HLS not supported in this browser.');
	}

	async function startUrlFeed(feed: ResolvedCameraFeed, el: HTMLVideoElement, seq: number): Promise<void> {
		const rawUrl = feed.url?.trim() ?? '';
		if (!rawUrl) throw new Error('URL feed is empty.');
		const url = normalizeFeedUrl(rawUrl);
		const mode = feed.streamMode;
		const useHls = mode === 'hls' || (mode === 'auto' && isLikelyHlsUrl(url));
		if (useHls) {
			await startHlsPlayback(url, feed, el, seq);
			return;
		}
		await startNativeVideo(url, feed, el, seq);
	}

	async function startEntityFeed(feed: ResolvedCameraFeed, el: HTMLVideoElement, seq: number): Promise<void> {
		if (!feed.entityId) throw new Error('No camera entity.');
		const conn = $connection;
		if (!conn) throw new Error('No connection.');
		const response = await conn.sendMessagePromise<{ url: string }>({
			type: 'camera/stream',
			entity_id: feed.entityId
		});
		if (!isSessionCurrent(feed.id, seq)) return;
		const url = response.url?.trim();
		if (!url) throw new Error('No stream URL returned.');
		await startHlsPlayback(url, feed, el, seq);
	}

	async function startFeed(feed: ResolvedCameraFeed, el: HTMLVideoElement, seq: number) {
		setFeedStreamState(feed.id, { status: 'loading' });
		el.muted = feed.muted;
		el.playsInline = true;
		attachedVideoByFeed.set(feed.id, el);

		const maxRetries = Math.max(0, feed.retryLimit);
		let attempt = 0;
		while (attempt <= maxRetries) {
			try {
				destroyHls(feed.id);
				clearVideoElement(el);
				if (feed.sourceType === 'url') {
					await startUrlFeed(feed, el, seq);
				} else {
					await startEntityFeed(feed, el, seq);
				}
				return;
			} catch (error: unknown) {
				if (!isSessionCurrent(feed.id, seq)) return;
				if (attempt >= maxRetries) {
					const message = (error as { message?: string })?.message ?? 'Stream unavailable.';
					setFeedStreamState(feed.id, { status: 'error', message });
					return;
				}
				attempt += 1;
				await wait(250 * attempt);
			}
		}
	}

	function ensureFeedStarted(feed: ResolvedCameraFeed) {
		const el = getVideoEl(feed.id);
		if (!el) return;
		const attached = attachedVideoByFeed.get(feed.id);
		if (attached === el) return;
		stopFeed(feed.id);
		const seq = bumpSession(feed.id);
		void startFeed(feed, el, seq);
	}

	function selectFeed(feedId: string) {
		haptic('medium');
		userSelectedFeedId = feedId;
	}
	function cycleFeed(direction: 1 | -1) {
		if (feeds.length < 2) return;
		const idx = feeds.findIndex((f) => f.id === activeFeedId);
		const start = idx >= 0 ? idx : 0;
		const next = (start + direction + feeds.length) % feeds.length;
		const target = feeds[next];
		if (!target) return;
		selectFeed(target.id);
	}
	function selectViewMode(mode: 'single' | 'grid2' | 'grid4') {
		haptic('light');
		userSelectedViewMode = mode;
	}
	function onKeyDown(event: KeyboardEvent) {
		if (effectiveViewMode !== 'single' || feeds.length < 2) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			cycleFeed(-1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			cycleFeed(1);
		}
	}
	function onMediaPointerDown(event: PointerEvent) {
		if (effectiveViewMode !== 'single' || feeds.length < 2) return;
		swipeTracking = true;
		swipeStartX = event.clientX;
		swipeStartY = event.clientY;
	}
	function onMediaPointerUp(event: PointerEvent) {
		if (!swipeTracking || effectiveViewMode !== 'single' || feeds.length < 2) return;
		swipeTracking = false;
		const dx = event.clientX - swipeStartX;
		const dy = event.clientY - swipeStartY;
		if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
		if (dx < 0) cycleFeed(1);
		else cycleFeed(-1);
	}

	$effect(() => {
		if (effectiveViewMode === 'single' && userSelectedViewMode && feeds.length < 2) {
			userSelectedViewMode = 'single';
		}
	});

	$effect(() => {
		const targets = streamFeeds;
		const targetIds = new Set(targets.map((f) => f.id));

		for (const existingId of Array.from(attachedVideoByFeed.keys())) {
			if (!targetIds.has(existingId)) stopFeed(existingId);
		}
		for (const feed of targets) ensureFeedStarted(feed);
	});

	const activeStreamState = $derived(activeFeed ? (streamStateByFeed[activeFeed.id] ?? { status: 'loading' }) : null);

	onDestroy(() => {
		stopAllFeeds();
	});
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="cammi" class:cammi--no-header={!showPopupHeaderMeta}>
	{#if showPopupHeaderMeta}
		<div class="cammi__header">
			{#if showPopupHeaderIcon}
				<div class="cammi__icon"><Icon name="camera" size={22} /></div>
			{/if}
			{#if showPopupStateText}
				<div class="cammi__state">{stateLabel}</div>
			{/if}
		</div>
	{/if}

	{#if feeds.length > 1}
		<div class="cammi__view-controls" role="tablist" aria-label="Camera popup view">
			<button class="cammi__view-btn" class:cammi__view-btn--active={effectiveViewMode === 'single'} onclick={() => selectViewMode('single')}>Single</button>
			<button class="cammi__view-btn" class:cammi__view-btn--active={effectiveViewMode === 'grid2'} onclick={() => selectViewMode('grid2')}>2-up</button>
			<button class="cammi__view-btn" class:cammi__view-btn--active={effectiveViewMode === 'grid4'} onclick={() => selectViewMode('grid4')} disabled={feeds.length < 3}>4-up</button>
		</div>
	{/if}

	{#if effectiveViewMode === 'single' && feeds.length > 1}
		<div class="cammi__feeds" role="tablist" aria-label="Camera feeds">
			{#each feeds as feed (feed.id)}
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

	<div class="cammi__media-root" bind:this={mediaRootEl}>
		{#if effectiveViewMode === 'single' && activeFeed}
			{#key activeFeed.id}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div class="cammi__media" onpointerdown={onMediaPointerDown} onpointerup={onMediaPointerUp}>
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						data-feed-id={activeFeed.id}
						class="cammi__video"
						class:cammi__video--hidden={activeStreamState?.status !== 'ready'}
						style={`object-fit:${activeFeed.objectFit}`}
						autoplay
						muted={activeFeed.muted}
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
			{/key}

			{#if standbyFeed}
				{#key standbyFeed.id}
					<div class="cammi__standby" aria-hidden="true">
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							data-feed-id={standbyFeed.id}
							class="cammi__video"
							style={`object-fit:${standbyFeed.objectFit}`}
							autoplay
							muted={standbyFeed.muted}
							playsinline
						></video>
					</div>
				{/key}
			{/if}
		{:else}
			<div class="cammi__grid" class:cammi__grid--quad={effectiveViewMode === 'grid4'}>
				{#each gridFeeds as feed (feed.id)}
					<div class="cammi__grid-item">
						<div class="cammi__grid-label">{feed.label}</div>
						<div class="cammi__grid-media">
							<!-- svelte-ignore a11y_media_has_caption -->
							<video
								data-feed-id={feed.id}
								class="cammi__video"
								class:cammi__video--hidden={(streamStateByFeed[feed.id] ?? { status: 'loading' }).status !== 'ready'}
								style={`object-fit:${feed.objectFit}`}
								autoplay
								muted={feed.muted}
								playsinline
							></video>
							{#if (streamStateByFeed[feed.id] ?? { status: 'loading' }).status === 'error'}
								<div class="cammi__overlay">
									<Icon name="video-off" size={20} />
									<span>{(streamStateByFeed[feed.id] as { status: 'error'; message: string }).message}</span>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.cammi {
		--cammi-pad: 18px;
		--cammi-pad-top: 8px;
		--cammi-gap: 8px;
		display:flex;
		flex-direction:column;
		gap: var(--cammi-gap);
		padding: var(--cammi-pad-top) var(--cammi-pad) var(--cammi-pad) var(--cammi-pad);
		box-sizing: border-box;
		min-height: 0 !important;
		height: 100%;
	}
	.cammi--no-header {
		/* Remove the visual "header-to-controls" dead space when header is hidden. */
		--cammi-pad-top: 4px;
		--cammi-gap: 8px;
	}
	.cammi__header { display:flex; align-items:center; gap:10px; color:var(--fg-subtle); }
	.cammi__icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); }
	.cammi__state { font-size:0.84rem; text-transform:capitalize; }

	.cammi__view-controls { display:flex; gap:8px; }
	.cammi__view-btn {
		height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
	}
	.cammi__view-btn:disabled { opacity: 0.45; cursor: not-allowed; }
	.cammi__view-btn--active {
		color: var(--fg);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}

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

	.cammi__media-root {
		width: 100%;
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
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
	.cammi__standby {
		position: absolute;
		width: 0;
		height: 0;
		opacity: 0;
		pointer-events: none;
		overflow: hidden;
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

	.cammi__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		/* Keep inter-tile gap equal to popup side padding on larger screens. */
		gap: var(--cammi-pad);
		grid-auto-rows: max-content;
		align-content: start;
		flex: 1 1 auto;
		min-height: 0;
		height: 100%;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		padding-right: 2px;
	}
	.cammi__grid--quad {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.cammi__grid-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cammi__grid-label {
		font-size: 0.72rem;
		color: var(--fg-muted);
		font-weight: 600;
	}
	.cammi__grid-media {
		position: relative;
		aspect-ratio: 16 / 9;
		background: var(--hover);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.cammi__overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		color: var(--fg-subtle);
		font-size: 0.78rem;
		padding: 8px;
		text-align: center;
	}

	@media (max-width: 800px) {
		.cammi {
			--cammi-pad: 16px;
			--cammi-pad-top: 7px;
			--cammi-gap: 10px;
		}
		.cammi__view-controls {
			gap: 6px;
		}
		.cammi__view-btn {
			height: 26px;
			padding: 0 8px;
			font-size: 0.7rem;
		}
		.cammi__feeds {
			gap: 6px;
		}
		.cammi__feed-btn {
			padding: 5px 9px;
			font-size: 0.7rem;
		}
		.cammi__grid {
			gap: 6px;
			height: 100%;
		}
		.cammi__grid--quad {
			grid-template-columns: 1fr;
		}
		.cammi__grid-label {
			font-size: 0.68rem;
			opacity: 0.92;
		}
		.cammi__overlay {
			font-size: 0.72rem;
			gap: 8px;
			padding: 6px;
		}
	}

	@media (max-width: 560px) {
		.cammi__grid {
			grid-template-columns: 1fr;
			gap: 6px;
		}
		.cammi__grid-label {
			font-size: 0.66rem;
		}
	}

	@media (pointer: coarse) {
		.cammi__grid {
			gap: 6px;
		}
	}
</style>
