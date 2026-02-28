<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { mediaService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import { formatDuration } from '$lib/utils/format';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const __state = $derived(entity?.state ?? 'off');
	const isUnavail = $derived(__state === 'unavailable' || !entity);
	const isPlaying = $derived(__state === 'playing');

	const title = $derived(entity?.attributes.media_title as string | undefined);
	const artist = $derived(entity?.attributes.media_artist as string | undefined);
	const artwork = $derived(entity?.attributes.entity_picture as string | undefined);
	const volume = $derived((entity?.attributes.volume_level as number | undefined) ?? 0);
	const groupMembers = $derived((entity?.attributes.group_members as string[] | undefined) ?? []);
	
	// Progressive position logic
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

	// Grouping logic
	const allMediaPlayers = $derived(
		Object.entries($optimisticEntities)
			.filter(([id, e]) => id.startsWith('media_player.') && id !== entityId && e.state !== 'unavailable')
			.map(([id, e]) => ({ id, name: e.attributes.friendly_name || id }))
	);

	let showGrouping = $state(false);

	function call(fn: () => Promise<any>) { if (!isUnavail) fn().catch(() => {}); }
	function togglePlay() { 
		if (isDemo) applyPatch(entityId, { state: isPlaying ? 'paused' : 'playing' });
		else call(() => mediaService.playPause(entityId));
	}

	function toggleGroup(otherId: string) {
		const isMember = groupMembers.includes(otherId);
		if (isMember) {
			// In many HA implementations, you unjoin the member, or remove from lead
			// For Sonos/Join, you usually call join on the member to join the lead, or unjoin the member.
			call(() => mediaService.unjoinGroup(otherId));
		} else {
			call(() => mediaService.joinGroup(entityId, [otherId]));
		}
	}
</script>

<div class="ios-media">
	<!-- Background Blur Layer -->
	{#if artwork && !isUnavail}
		<div class="ios-media__bg" style="background-image: url({artwork})"></div>
	{/if}

	<div class="ios-media__content">
		<!-- Artwork -->
		<div class="ios-media__art-section">
			<div class="ios-media__art-frame" class:ios-media__art-frame--playing={isPlaying}>
				{#if artwork && !isUnavail}
					<img src={artwork} alt="Artwork" class="ios-media__art" />
				{:else}
					<div class="ios-media__art-placeholder">
						<Icon name="music" size={80} fill="currentColor" />
					</div>
				{/if}
			</div>
		</div>

		<!-- Metadata (iOS Style: Bold Title, Soft Artist) -->
		<div class="ios-media__meta">
			<div class="ios-media__title">{title || (isUnavail ? 'Unavailable' : 'Not Playing')}</div>
			<div class="ios-media__artist">{artist || 'No Metadata'}</div>
		</div>

		<!-- Progress (Thick iOS Pill Bar) -->
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

		<!-- Playback Controls (Futuristic Minimalist) -->
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

		<!-- Volume & Grouping (Futuristic AirPlay Style) -->
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
							if (isDemo) applyPatch(entityId, { attributes: { volume_level: v } });
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
				class:ios-media__group-btn--active={groupMembers.length > 0}
				onclick={() => (showGrouping = !showGrouping)}
			>
				<Icon name="airplay" size={26} />
			</button>
		</div>
	</div>

	<!-- Grouping Overlay (Frosted Glass) -->
	{#if showGrouping}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="ios-media__overlay" onclick={() => (showGrouping = false)}>
			<div class="ios-media__overlay-content" onclick={(e) => e.stopPropagation()}>
				<div class="ios-media__overlay-header">
					<h3>Speakers & TVs</h3>
					<button class="ios-media__close" onclick={() => (showGrouping = false)}>
						<Icon name="x" size={20} />
					</button>
				</div>
				<div class="ios-media__speaker-list">
					<div class="ios-media__speaker ios-media__speaker--current">
						<Icon name="circle-dot" size={18} fill="currentColor" />
						<div class="ios-media__speaker-info">
							<span class="ios-media__speaker-name">This Device</span>
							<span class="ios-media__speaker-status">{groupMembers.length > 0 ? `Leading ${groupMembers.length} others` : 'Standalone'}</span>
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
	.ios-media {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 100%;
		background: black;
		overflow: hidden;
		color: white;
	}

	/* Ambient Background Blur */
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

	.ios-media__content {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 24px 28px;
		gap: 24px;
	}

	/* Artwork styling */
	.ios-media__art-section {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ios-media__art-frame {
		width: min(100%, 340px);
		aspect-ratio: 1;
		border-radius: 28px;
		overflow: hidden;
		background: #1c1c1e;
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
		display: flex;
		align-items: center;
		justify-content: center;
		color: #3a3a3c;
	}

	/* Meta Section */
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
		color: rgba(255,255,255,0.6);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Sliders (iOS 26 Thick Pill Style) */
	.ios-media__track {
		position: relative;
		height: 6px;
		background: rgba(255,255,255,0.15);
		border-radius: 10px;
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
		background: rgba(255,255,255,0.9);
		border-radius: 10px;
	}
	.ios-media__fill--volume {
		background: rgba(255,255,255,0.5);
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
		color: rgba(255,255,255,0.4);
		font-variant-numeric: tabular-nums;
	}

	/* Playback Controls */
	.ios-media__controls {
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 0 10px;
	}
	.ios-media__btn {
		background: none;
		border: none;
		color: white;
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
		color: white;
		cursor: pointer;
		transition: transform 0.2s;
	}
	.ios-media__play-btn:active {
		transform: scale(0.85);
	}

	/* Footer & Volume */
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
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s, color 0.2s;
	}
	.ios-media__vol-btn:active {
		transform: scale(0.9);
		color: white;
	}
	.ios-media__track--volume {
		height: 8px;
		flex: 1;
		background: rgba(255,255,255,0.1);
	}
	.ios-media__fill--volume {
		background: rgba(255,255,255,0.8);
	}
	.ios-media__group-btn {
		background: none;
		border: none;
		color: rgba(255,255,255,0.4);
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

	/* Grouping Overlay (Frosted iOS Style) */
	.ios-media__overlay {
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,0.4);
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
		background: rgba(28, 28, 30, 0.85);
		border-radius: 32px 32px 0 0;
		padding: 24px 24px 40px;
		box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
		border-top: 1px solid rgba(255,255,255,0.1);
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
		background: rgba(255,255,255,0.1);
		border: none;
		color: white;
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
		background: rgba(255,255,255,0.05);
		border: none;
		border-radius: 16px;
		padding: 16px;
		display: flex;
		align-items: center;
		gap: 16px;
		color: white;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s;
	}
	.ios-media__speaker:hover {
		background: rgba(255,255,255,0.1);
	}
	.ios-media__speaker--current {
		background: rgba(255,255,255,0.1);
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
		color: rgba(255,255,255,0.5);
	}

	button:disabled {
		opacity: 0.2 !important;
		cursor: not-allowed;
	}
</style>
