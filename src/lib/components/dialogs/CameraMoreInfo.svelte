<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { entities as liveEntities } from '$lib/ha/websocket';
	import { configStore } from '$lib/stores/config';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';

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
		snapshotUrl: string;
		liveUrl: string;
	}

	// ── URL Helpers ─────────────────────────────────────────────────────────────
	function absolutizeHaUrl(url: string): string {
		const raw = String(url ?? '').trim();
		if (!raw) return '';
		if (/^https?:\/\//i.test(raw)) return raw;
		const base = String($configStore.hassUrl ?? '').trim().replace(/\/+$/, '');
		if (base) return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
		return raw;
	}

	function appendToken(url: string, token: string | undefined): string {
		const cleanUrl = String(url ?? '').trim();
		if (!cleanUrl) return '';
		const cleanToken = String(token ?? '').trim();
		if (!cleanToken) return cleanUrl;
		if (/[?&]token=/.test(cleanUrl)) return cleanUrl;
		return `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}token=${cleanToken}`;
	}

	// ── Feed Resolution ─────────────────────────────────────────────────────────────
	function resolveEntityUrls(sourceEntityId: string): { snapshotUrl: string; liveUrl: string } {
		const source = $optimisticEntities[sourceEntityId] ?? $liveEntities[sourceEntityId];
		const imageUrl = (source?.attributes.entity_picture as string | undefined) ?? '';
		if (!imageUrl) return { snapshotUrl: '', liveUrl: '' };
		const accessToken = source?.attributes.access_token as string | undefined;
		const snapshotUrl = appendToken(absolutizeHaUrl(imageUrl), accessToken);
		const liveUrl = snapshotUrl.includes('/api/camera_proxy/')
			? snapshotUrl.replace('/api/camera_proxy/', '/api/camera_proxy_stream/')
			: '';
		return { snapshotUrl, liveUrl };
	}

	// ── Feed Derivations ─────────────────────────────────────────────────────────────
	const feeds = $derived.by<ResolvedCameraFeed[]>(() => {
		const configured = ((tile?.config.camera_feeds as CameraFeedConfig[] | undefined) ?? [])
			.filter((feed) => !!feed && typeof feed.id === 'string' && feed.id.length > 0);
		const resolved = configured.map((feed) => {
			if (feed.type === 'url') {
				const url = absolutizeHaUrl(feed.url?.trim() || '');
				const preferredStreamType = (tile?.config.stream_type as string | undefined) ?? 'auto';
				return {
					id: feed.id,
					label: feed.label?.trim() || 'Custom feed',
					sourceType: 'url' as const,
					snapshotUrl: url,
					liveUrl: preferredStreamType === 'mjpeg' ? url : ''
				};
			}
			const sourceEntityId = feed.entity_id?.trim() || entityId;
			const { snapshotUrl, liveUrl } = resolveEntityUrls(sourceEntityId);
			return {
				id: feed.id,
				label: feed.label?.trim() || sourceEntityId,
				sourceType: 'entity' as const,
				snapshotUrl,
				liveUrl
			};
		});
		if (resolved.length > 0) return resolved;
		const { snapshotUrl, liveUrl } = resolveEntityUrls(entityId);
		return [{
			id: '__default',
			label: 'Camera',
			sourceType: 'entity' as const,
			snapshotUrl,
			liveUrl
		}];
	});

	const primaryFeedId = $derived.by(() => {
		const configuredPrimary = tile?.config.camera_primary_feed as string | undefined;
		return feeds.some((feed) => feed.id === configuredPrimary) ? configuredPrimary! : (feeds[0]?.id ?? '');
	});

	let activeFeedId = $state('');
	$effect(() => {
		if (!feeds.length) {
			activeFeedId = '';
			return;
		}
		if (!activeFeedId || !feeds.some((feed) => feed.id === activeFeedId)) {
			activeFeedId = primaryFeedId;
		}
	});

	const activeFeed = $derived(
		feeds.find((feed) => feed.id === activeFeedId) ?? null
	);
	const orderedFeeds = $derived.by(() => {
		if (!activeFeedId) return feeds;
		const index = feeds.findIndex((feed) => feed.id === activeFeedId);
		if (index <= 0) return feeds;
		const next = [...feeds];
		const [primary] = next.splice(index, 1);
		next.unshift(primary);
		return next;
	});

	// ── Live State ─────────────────────────────────────────────────────────────
	let liveErrorByFeed = $state<Record<string, true>>({});
	let liveBaseByFeed = $state<Record<string, string>>({});
	let liveSessionNonceByFeed = $state<Record<string, string>>({});

	const activeFeedLiveFailed = $derived(activeFeed ? !!liveErrorByFeed[activeFeed.id] : false);
	const activeLiveBase = $derived.by(() => {
		if (!activeFeed) return '';
		return liveBaseByFeed[activeFeed.id] ?? activeFeed.liveUrl ?? '';
	});
	const activeCanUseLive = $derived(
		!!activeLiveBase &&
		(activeFeed?.sourceType === 'entity' ||
			((tile?.config.stream_type as string | undefined) ?? 'auto') === 'mjpeg' ||
			((tile?.config.stream_type as string | undefined) ?? 'auto') === 'auto') &&
		!activeFeedLiveFailed
	);

	// ── Cleanup Stale Feed State ─────────────────────────────────────────────────────────────
	$effect(() => {
		const currentIds = new Set(feeds.map((f) => f.id));
		const staleLive  = Object.keys(liveBaseByFeed).filter((k) => !currentIds.has(k));
		const staleNonce = Object.keys(liveSessionNonceByFeed).filter((k) => !currentIds.has(k));
		const staleErr   = Object.keys(liveErrorByFeed).filter((k) => !currentIds.has(k));
		if (staleLive.length) {
			const next = { ...liveBaseByFeed };
			staleLive.forEach((k) => delete next[k]);
			liveBaseByFeed = next;
		}
		if (staleNonce.length) {
			const next = { ...liveSessionNonceByFeed };
			staleNonce.forEach((k) => delete next[k]);
			liveSessionNonceByFeed = next;
		}
		if (staleErr.length) {
			const next = { ...liveErrorByFeed };
			staleErr.forEach((k) => delete next[k]);
			liveErrorByFeed = next;
		}
	});

	// ── Initialize Active Feed Live Session ─────────────────────────────────────────────────────────────
	$effect(() => {
		const feedId = activeFeed?.id ?? '';
		if (!feedId) return;
		if (!liveBaseByFeed[feedId] && activeFeed?.liveUrl) {
			liveBaseByFeed = {
				...liveBaseByFeed,
				[feedId]: activeFeed.liveUrl
			};
		}
		if (liveSessionNonceByFeed[feedId]) return;
		liveSessionNonceByFeed = {
			...liveSessionNonceByFeed,
			[feedId]: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
		};
	});

	// ── Source Construction ─────────────────────────────────────────────────────────────
	const thumbSeed = Date.now();

	const activeLiveSrc = $derived.by(() => {
		const feedId = activeFeed?.id ?? '';
		if (!feedId || !activeLiveBase || !activeCanUseLive) return '';
		const nonce = liveSessionNonceByFeed[feedId] ?? 'boot';
		return `${activeLiveBase}${activeLiveBase.includes('?') ? '&' : '?'}_live=${nonce}`;
	});

	let liveImgEl = $state<HTMLImageElement | null>(null);

	$effect(() => {
		const img = liveImgEl;
		if (!img) return;
		const src = activeLiveSrc;
		if (src && img.src !== src) {
			img.src = src;
		} else if (!src) {
			img.src = '';
		}
		return () => {
			img.src = '';
		};
	});

	// ── UI Helpers ─────────────────────────────────────────────────────────────
	function thumbnailSrc(feed: ResolvedCameraFeed): string {
		if (!feed.snapshotUrl) return '';
		const nonce = `${thumbSeed}_${feed.id}`;
		return `${feed.snapshotUrl}${feed.snapshotUrl.includes('?') ? '&' : '?'}_thumb=${nonce}`;
	}

	function selectFeed(feedId: string) {
		haptic('medium');
		activeFeedId = feedId;
	}

	function markLiveError(feedId: string, fromLive: boolean) {
		if (!fromLive) return;
		if (!feedId || liveErrorByFeed[feedId]) return;
		liveErrorByFeed = { ...liveErrorByFeed, [feedId]: true };
	}
</script>

<!-- ── Camera More-Info ───────────────────────────────────────────────────────────── -->
<div class="cammi">
	<!-- ── Header ───────────────────────────────────────────────────────────── -->
	<div class="cammi__header">
		<div class="cammi__icon"><Icon name="camera" size={22} /></div>
		<div class="cammi__state">{stateLabel}</div>
	</div>

	<!-- ── Feed Tabs ───────────────────────────────────────────────────────────── -->
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
					{#if thumbnailSrc(feed)}
						<img class="cammi__feed-thumb" src={thumbnailSrc(feed)} alt={feed.label} />
					{:else}
						<span class="cammi__feed-thumb cammi__feed-thumb--empty">
							<Icon name="image-off" size={12} />
						</span>
					{/if}
					<span class="cammi__feed-label">{feed.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- ── Active Feed Media ───────────────────────────────────────────────────────────── -->
	{#if activeLiveSrc || (activeFeed?.snapshotUrl)}
		<div class="cammi__media">
			<img
				bind:this={liveImgEl}
				class="cammi__image"
				alt=""
				onerror={() => markLiveError(activeFeed?.id ?? '', !!activeCanUseLive)}
			/>
			{#if activeCanUseLive && activeLiveSrc}
				<span class="cammi__live-badge" aria-label="Live stream active">LIVE</span>
			{/if}
		</div>
	{:else}
		<div class="cammi__empty">
			<Icon name="image-off" size={24} />
			<span>{activeFeedLiveFailed ? 'Live stream unavailable for this feed' : 'No live stream available for this feed'}</span>
		</div>
	{/if}
</div>

<style>
	/* ── Layout ───────────────────────────────────────────────────────────── */
	.cammi { display:flex; flex-direction:column; gap:12px; padding:18px; }
	.cammi__header { display:flex; align-items:center; gap:10px; color:var(--fg-subtle); }
	.cammi__icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); }
	.cammi__state { font-size:0.84rem; text-transform:capitalize; }

	/* ── Feed Tabs ───────────────────────────────────────────────────────────── */
	.cammi__feeds { display:flex; gap:8px; overflow-x:auto; padding-bottom:2px; }
	.cammi__feed-btn {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		border-radius: 10px;
		padding: 6px 8px;
		font-size: 0.74rem;
		font-weight: 600;
	}
	.cammi__feed-btn--active {
		color: var(--fg);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}
	.cammi__feed-thumb {
		display: block;
		width: 54px;
		height: 34px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
		background: var(--hover);
	}
	.cammi__feed-thumb--empty {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-subtle);
	}
	.cammi__feed-label {
		white-space: nowrap;
		max-width: 12ch;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Media ───────────────────────────────────────────────────────────── */
	.cammi__media { position: relative; width: 100%; }
	.cammi__image { width:100%; aspect-ratio:16 / 9; object-fit:cover; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); }
	.cammi__live-badge {
		position: absolute;
		top: 10px;
		right: 10px;
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
		line-height: 1;
		pointer-events: none;
	}

	/* ── Empty State ───────────────────────────────────────────────────────────── */
	.cammi__empty { width:100%; aspect-ratio:16 / 9; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border-radius:var(--radius); border:1px dashed var(--border); color:var(--fg-subtle); }
</style>
