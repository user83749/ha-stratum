<script lang="ts">
	// ── MediaMoreInfo ─────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { mediaService } from '$lib/ha/services';
	import { browser } from '$app/environment';
	import { formatDuration } from '$lib/utils/format';

	// ── Props ────────────────────────────────────────────────────────────────
	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	// ── Derived State ────────────────────────────────────────────────────────
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const optimisticPreviewEnabled = false;
	const __state = $derived(entity?.state ?? 'off');
	const isUnavail = $derived(__state === 'unavailable' || !entity);
	const isPlaying = $derived(__state === 'playing');

	const title = $derived(entity?.attributes.media_title as string | undefined);
	const artist = $derived(entity?.attributes.media_artist as string | undefined);
	const artwork = $derived(entity?.attributes.entity_picture as string | undefined);
	const volume = $derived((entity?.attributes.volume_level as number | undefined) ?? 0);
	const groupMembers = $derived((entity?.attributes.group_members as string[] | undefined) ?? []);
	const groupedOthers = $derived(groupMembers.filter((id) => id !== entityId));
	
	// ── Position / Progress ─────────────────────────────────────────────────────────────
	const duration = $derived(entity?.attributes.media_duration as number | undefined);
	const position = $derived(entity?.attributes.media_position as number | undefined);
	const posUpdatedAt = $derived(entity?.attributes.media_position_updated_at as string | undefined);

	let livePos = $state(0);
	$effect(() => {
		if (!isPlaying || !duration) { livePos = position ?? 0; return; }
		const base = position ?? 0;
		const startMs = posUpdatedAt ? new Date(posUpdatedAt).getTime() : Date.now();
		const tick = () => { livePos = Math.min(base + (Date.now() - startMs) / 1000, duration!); };
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});

	// ── Grouping ─────────────────────────────────────────────────────────────
	const allMediaPlayers = $derived(
		Object.entries($optimisticEntities)
			.filter(([id, e]) => id.startsWith('media_player.') && id !== entityId && e.state !== 'unavailable')
			.map(([id, e]) => ({ id, name: e.attributes.friendly_name || id }))
	);

	let showGrouping = $state(false);

	function call(fn: () => Promise<any>) { if (!isUnavail) fn().catch(() => {}); }
	function togglePlay() { 
		if (optimisticPreviewEnabled) applyPatch(entityId, { state: isPlaying ? 'paused' : 'playing' });
		else call(() => mediaService.playPause(entityId));
	}

	function toggleGroup(otherId: string) {
		const isMember = groupMembers.includes(otherId);
		if (isMember) {
			call(() => mediaService.unjoinGroup(otherId));
		} else {
			call(() => mediaService.joinGroup(entityId, [otherId]));
		}
	}
</script>

<!-- ── Media More-Info Root ───────────────────────────────────────────────────────────── -->
<div class="ios-media">
	<!-- ── Background Layer ───────────────────────────────────────────────────────────── -->
	{#if artwork && !isUnavail}
		<div class="ios-media__bg" style="background-image: url({artwork})"></div>
	{/if}

	<div class="ios-media__content">
		<!-- ── Artwork ───────────────────────────────────────────────────────────── -->
		<div class="ios-media__art-section">
			<div class="ios-media__art-frame" class:ios-media__art-frame--playing={isPlaying}>
				{#if artwork && !isUnavail}
					<img src={artwork} alt="Artwork" class="ios-media__art" />
				{:else}
					<div class="ios-media__art-placeholder">
						<div class="ios-media__ph-bg"></div>
						<div class="ios-media__ph-content">
							<div class="ios-media__ph-disc" aria-hidden="true"></div>
							<div class="ios-media__ph-lines" aria-hidden="true">
								<span class="ios-media__ph-line ios-media__ph-line--a"></span>
								<span class="ios-media__ph-line ios-media__ph-line--b"></span>
							</div>
							<span class="ios-media__ph-label">No Media Playing</span>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- ── Metadata ───────────────────────────────────────────────────────────── -->
		<div class="ios-media__meta">
			<div class="ios-media__title">{title || (isUnavail ? 'Unavailable' : 'Not Playing')}</div>
			{#if isPlaying}
				<div class="ios-media__artist">{artist || 'No Metadata'}</div>
			{/if}
		</div>

		<!-- ── Progress ───────────────────────────────────────────────────────────── -->
		{#if duration}
			<div class="ios-media__progress">
				<div class="ios-media__track">
					<div class="ios-media__fill" style="width: {(livePos / duration) * 100}%"></div>
					<input 
						type="range" min="0" max={duration} 
						value={livePos} 
						onchange={(e) => call(() => mediaService.seek(entityId, (e.target as HTMLInputElement).valueAsNumber))} 
						class="ios-media__slider" 
					/>
				</div>
				<div class="ios-media__time">
					<span>{formatDuration(livePos)}</span>
					<span>-{formatDuration(duration - livePos)}</span>
				</div>
			</div>
		{/if}

		<!-- ── Playback Controls ───────────────────────────────────────────────────────────── -->
		<div class="ios-media__controls">
			<button class="ios-media__btn" onclick={() => call(() => mediaService.previous(entityId))} disabled={isUnavail}>
				<Icon name="skip-back" size={32} fill="currentColor" />
			</button>
			<button class="ios-media__play-btn" onclick={togglePlay} disabled={isUnavail}>
				<Icon name={isPlaying ? 'pause' : 'play'} size={48} fill="currentColor" />
			</button>
			<button class="ios-media__btn" onclick={() => call(() => mediaService.next(entityId))} disabled={isUnavail}>
				<Icon name="skip-forward" size={32} fill="currentColor" />
			</button>
		</div>

		<!-- ── Volume & Grouping ───────────────────────────────────────────────────────────── -->
		<div class="ios-media__footer">
			<div class="ios-media__volume">
				<button class="ios-media__vol-btn" onclick={() => call(() => mediaService.setVolume(entityId, Math.max(0, volume - 0.1)))} disabled={isUnavail}>
					<Icon name="volume-1" size={16} fill="currentColor" />
				</button>
				<div class="ios-media__track ios-media__track--volume">
					<div class="ios-media__fill ios-media__fill--volume" style="width: {volume * 100}%"></div>
					<input 
						type="range" min="0" max="1" step="0.01" 
						value={volume} 
						oninput={(e) => {
							const v = (e.target as HTMLInputElement).valueAsNumber;
							if (optimisticPreviewEnabled) applyPatch(entityId, { attributes: { volume_level: v } });
							else call(() => mediaService.setVolume(entityId, v));
						}} 
						class="ios-media__slider" 
					/>
				</div>
				<button class="ios-media__vol-btn" onclick={() => call(() => mediaService.setVolume(entityId, Math.min(1, volume + 0.1)))} disabled={isUnavail}>
					<Icon name="volume-2" size={16} fill="currentColor" />
				</button>
			</div>

			<button 
				class="ios-media__group-btn" 
				class:ios-media__group-btn--active={groupedOthers.length > 0}
				onclick={() => (showGrouping = !showGrouping)}
			>
				<Icon name="airplay" size={26} />
			</button>
		</div>
	</div>

	<!-- ── Grouping Overlay ───────────────────────────────────────────────────────────── -->
	{#if showGrouping}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="ios-media__overlay" onclick={() => (showGrouping = false)}>
			<div class="ios-media__overlay-content" onclick={(e) => e.stopPropagation()}>
				<div class="ios-media__overlay-header">
					<button class="ios-media__close" onclick={() => (showGrouping = false)}>
						<Icon name="x" size={20} />
					</button>
					<h3>Speakers & TVs</h3>
				</div>
				<div class="ios-media__speaker-list">
					<div class="ios-media__speaker ios-media__speaker--current">
						<Icon name="circle-dot" size={18} fill="currentColor" />
						<div class="ios-media__speaker-info">
							<span class="ios-media__speaker-name">This Device</span>
							<span class="ios-media__speaker-status">{groupedOthers.length > 0 ? `Leading ${groupedOthers.length} ${groupedOthers.length === 1 ? 'other' : 'others'}` : 'Standalone'}</span>
						</div>
						<Icon name="check-circle-2" size={18} fill="var(--accent)" />
					</div>

					{#each allMediaPlayers as speaker}
						{@const isMember = groupMembers.includes(speaker.id)}
						<button class="ios-media__speaker" onclick={() => toggleGroup(speaker.id)}>
							<Icon name="circle" size={18} fill={isMember ? 'var(--accent)' : 'none'} />
							<div class="ios-media__speaker-info">
								<span class="ios-media__speaker-name">{speaker.name}</span>
								<span class="ios-media__speaker-status">{isMember ? 'Playing' : 'Ready'}</span>
							</div>
							{#if isMember}
								<Icon name="check-circle-2" size={18} fill="var(--accent)" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ── Shell ───────────────────────────────────────────────────────────── */
	.ios-media {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		background: var(--bg-elevated);
		overflow: hidden;
		color: var(--fg);
		--mmi-fg: var(--fg);
		--mmi-fg-muted: color-mix(in srgb, var(--fg) 64%, transparent);
		--mmi-fg-subtle: color-mix(in srgb, var(--fg) 46%, transparent);
		--mmi-track-bg: color-mix(in srgb, var(--fg) 16%, transparent);
		--mmi-track-fill: color-mix(in srgb, var(--fg) 92%, transparent);
		--mmi-track-fill-soft: color-mix(in srgb, var(--fg) 72%, transparent);
		--mmi-overlay-bg: color-mix(in srgb, var(--bg-elevated) 86%, black 14%);
		--mmi-surface-soft: color-mix(in srgb, var(--fg) 8%, transparent);
		--mmi-surface-strong: color-mix(in srgb, var(--fg) 14%, transparent);
		--mmi-border-soft: color-mix(in srgb, var(--fg) 14%, transparent);
	}

	/* ── Background ───────────────────────────────────────────────────────────── */
	.ios-media__bg {
		position: absolute;
		inset: -50px;
		background-size: cover;
		background-position: center;
		filter: blur(80px) saturate(1.8) brightness(0.4);
		opacity: 0.6;
		z-index: 0;
		transition: background-image 0.5s ease;
	}

	/* ── Content ───────────────────────────────────────────────────────────── */
	.ios-media__content {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 24px 28px;
		gap: 24px;
	}

	/* ── Artwork ───────────────────────────────────────────────────────────── */
	.ios-media__art-section {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ios-media__art-frame {
		width: min(100%, 340px);
		aspect-ratio: 1;
		border-radius: var(--dialog-radius);
		overflow: hidden;
		background: color-mix(in srgb, var(--bg-elevated) 92%, black 8%);
		box-shadow: 0 20px 60px rgba(0,0,0,0.6);
		transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
		transform: scale(0.92);
	}
	.ios-media__art-frame--playing {
		transform: scale(1);
	}
	.ios-media__art {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.ios-media__art-placeholder {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(160deg, #202127 0%, #17181d 48%, #111216 100%);
		color: #a7abb8;
		overflow: hidden;
	}
	.ios-media__ph-bg {
		position: absolute;
		inset: -24%;
		background:
			radial-gradient(circle at 24% 22%, rgba(255,255,255,0.09) 0%, transparent 34%),
			radial-gradient(circle at 78% 68%, rgba(124, 145, 255, 0.18) 0%, transparent 42%);
		filter: blur(8px);
	}
	.ios-media__ph-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.ios-media__ph-disc {
		width: 66px;
		height: 66px;
		border-radius: 50%;
		background:
			radial-gradient(circle, rgba(255,255,255,0.5) 0 6px, transparent 7px),
			conic-gradient(from 120deg, rgba(255,255,255,0.32), rgba(255,255,255,0.1), rgba(255,255,255,0.22), rgba(255,255,255,0.32));
		box-shadow:
			inset 0 0 0 2px rgba(255,255,255,0.18),
			0 8px 20px rgba(0,0,0,0.35);
	}
	.ios-media__ph-lines {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.ios-media__ph-line {
		display: block;
		height: 6px;
		border-radius: 999px;
		background: rgba(255,255,255,0.22);
	}
	.ios-media__ph-line--a { width: 112px; }
	.ios-media__ph-line--b { width: 72px; }
	.ios-media__ph-label {
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: rgba(255,255,255,0.45);
	}

	/* ── Metadata ───────────────────────────────────────────────────────────── */
	.ios-media__meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.ios-media__title {
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ios-media__artist {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--mmi-fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Sliders ───────────────────────────────────────────────────────────── */
	.ios-media__track {
		position: relative;
		height: 6px;
		background: var(--mmi-track-bg);
		border-radius: var(--dialog-radius);
		overflow: hidden;
	}
	.ios-media__track--volume {
		height: 4px;
		flex: 1;
	}
	.ios-media__fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		background: var(--mmi-track-fill);
		border-radius: var(--dialog-radius);
	}
	.ios-media__fill--volume {
		background: var(--mmi-track-fill-soft);
	}
	.ios-media__slider {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		margin: 0;
	}

	.ios-media__time {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--mmi-fg-subtle);
		font-variant-numeric: tabular-nums;
	}

	/* ── Playback Controls ───────────────────────────────────────────────────────────── */
	.ios-media__controls {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 0 10px;
	}
	.ios-media__btn {
		background: none;
		border: none;
		color: var(--mmi-fg);
		cursor: pointer;
		opacity: 0.9;
		transition: transform 0.2s, opacity 0.2s;
	}
	.ios-media__btn:active {
		transform: scale(0.9);
		opacity: 0.6;
	}
	.ios-media__play-btn {
		background: none;
		border: none;
		color: var(--mmi-fg);
		cursor: pointer;
		transition: transform 0.2s;
	}
	.ios-media__play-btn:active {
		transform: scale(0.85);
	}

	/* ── Footer & Volume ───────────────────────────────────────────────────────────── */
	.ios-media__footer {
		display: flex;
		align-items: center;
		gap: 20px;
		padding-bottom: 20px;
	}
	.ios-media__volume {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.ios-media__vol-btn {
		background: none;
		border: none;
		padding: 4px;
		color: var(--mmi-fg-subtle);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s, color 0.2s;
	}
	.ios-media__vol-btn:active {
		transform: scale(0.9);
		color: var(--mmi-fg);
	}
	.ios-media__track--volume {
		height: 8px;
		flex: 1;
		background: var(--mmi-track-bg);
	}
	.ios-media__fill--volume {
		background: var(--mmi-track-fill-soft);
	}
	.ios-media__group-btn {
		background: none;
		border: none;
		color: var(--mmi-fg-subtle);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.2s, transform 0.2s;
	}
	.ios-media__group-btn--active {
		color: var(--accent);
	}
	.ios-media__group-btn:active {
		transform: scale(0.9);
	}

	/* ── Grouping Overlay ───────────────────────────────────────────────────────────── */
	.ios-media__overlay {
		position: absolute;
		inset: 0;
		background: color-mix(in srgb, var(--bg-elevated) 45%, transparent);
		backdrop-filter: blur(20px);
		z-index: 10;
		display: flex;
		align-items: flex-end;
		animation: overlay-in 0.4s cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes overlay-in {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.ios-media__overlay-content {
		width: 100%;
		background: var(--mmi-overlay-bg);
		border-radius: 32px 32px 0 0;
		padding: 24px 24px 40px;
		/* Allow scrolling when there are many speakers */
		max-height: min(70dvh, 640px);
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		touch-action: pan-y;
		box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
		border-top: 1px solid var(--mmi-border-soft);
	}

	.ios-media__overlay-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
	}
	.ios-media__overlay-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}
	.ios-media__close {
		background: var(--mmi-surface-soft);
		border: none;
		color: var(--mmi-fg);
		width: 32px;
		height: 32px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.ios-media__speaker-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ios-media__speaker {
		width: 100%;
		background: var(--mmi-surface-soft);
		border: none;
		border-radius: var(--dialog-radius);
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 16px;
		color: var(--mmi-fg);
		cursor: pointer;
		text-align: left;
		transition: background 0.2s;
	}
	.ios-media__speaker:hover {
		background: var(--mmi-surface-strong);
	}
	.ios-media__speaker--current {
		background: var(--mmi-surface-strong);
	}
	.ios-media__speaker-info {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	.ios-media__speaker-name {
		font-weight: 600;
		font-size: 0.95rem;
	}
	.ios-media__speaker-status {
		font-size: 0.75rem;
		color: var(--mmi-fg-subtle);
	}

	button:disabled {
		opacity: 0.2 !important;
		cursor: not-allowed;
	}
</style>
