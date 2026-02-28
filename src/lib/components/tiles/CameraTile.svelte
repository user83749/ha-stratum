<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { tile: Tile; entity: HassEntity | null; }
	const { tile, entity }: Props = $props();

	const sizePreset     = $derived(tile.sizePreset ?? 'md');
	const name           = $derived((tile.config.name as string | undefined) ?? entity?.attributes.friendly_name ?? 'Camera');
	const streamUrl      = $derived(entity?.attributes.entity_picture as string | undefined);
	const motionDetected = $derived(entity?.attributes.motion_detection as boolean | undefined);
	const isRecording    = $derived(entity?.state === 'recording');
	const isStreaming    = $derived(entity?.state === 'streaming' || entity?.state === 'idle');
	const unavailable    = $derived(entity?.state === 'unavailable' || entity?.state === 'unknown');

	const stateLabel = $derived(
		isRecording ? 'Recording' :
		isStreaming  ? 'Live' :
		unavailable  ? 'Unavailable' :
		'Idle'
	);
	const showStreamBadge = $derived((sizePreset === 'lg' || sizePreset === 'xl') && motionDetected);
	const showOverlayMeta = $derived(sizePreset !== 'sm');
	const showFallbackStatus = $derived(sizePreset !== 'sm');
</script>

<div class="camera-tile" class:unavailable data-size={sizePreset}>
	{#if streamUrl && !unavailable}
		<div class="stream-container">
			<img src={streamUrl} alt={name} class="stream-img" style="pointer-events: none;" />
			{#if isRecording}
				<span class="rec-dot"></span>
			{/if}
			{#if showStreamBadge}
				<span class="motion-badge">
					<Icon name="activity" size={10} />
					Motion
				</span>
			{/if}
			{#if showOverlayMeta}
			<div class="name-overlay">
				<span class="overlay-name">{name}</span>
				{#if isRecording}
					<span class="overlay-rec">REC</span>
				{/if}
			</div>
			{/if}
		</div>
	{:else}
		<div class="no-stream">
			<div class="no-stream-icon" class:recording={isRecording}>
				<Icon name="camera" size={32} />
				{#if isRecording}
					<span class="rec-indicator"></span>
				{/if}
			</div>
			<span class="no-stream-name">{name}</span>
			{#if showFallbackStatus}
				<span class="no-stream-state" class:recording={isRecording}>{stateLabel}</span>
			{/if}
			{#if motionDetected}
				<span class="motion-pill">
					<Icon name="activity" size={11} />
					Motion
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.camera-tile {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	/* ── Stream view ─────────────────────────────────────────────────────── */
	.stream-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.stream-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.rec-dot {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--color-danger);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--bg) 40%, transparent);
		animation: blink 1.2s ease-in-out infinite;
		z-index: 2;
	}

	.motion-badge {
		position: absolute;
		bottom: 36px;
		left: 8px;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.62rem;
		font-weight: 600;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 70%, transparent);
		backdrop-filter: blur(4px);
		border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
		border-radius: 99px;
		padding: 3px 8px;
		z-index: 2;
		pointer-events: none;
	}

	.name-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to top, color-mix(in srgb, var(--bg) 75%, transparent) 0%, transparent 100%);
		padding: 20px 10px 8px;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		z-index: 2;
		pointer-events: none;
	}

	.overlay-name {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.overlay-rec {
		font-size: 0.58rem;
		font-weight: 700;
		color: var(--color-danger);
		letter-spacing: 0.06em;
		animation: blink 1.2s ease-in-out infinite;
		flex-shrink: 0;
		margin-left: 6px;
	}

	/* ── No stream / fallback ────────────────────────────────────────────── */
	.no-stream {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.no-stream-icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--fg-muted) 10%, transparent);
		color: var(--fg-muted);
	}

	.no-stream-icon.recording {
		background: color-mix(in srgb, var(--color-danger) 14%, transparent);
		color: var(--color-danger);
	}

	.rec-indicator {
		position: absolute;
		top: 2px;
		right: 2px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-danger);
		animation: blink 1.2s ease-in-out infinite;
	}

	.no-stream-name {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--fg);
		text-align: center;
	}

	.no-stream-state {
		font-size: 0.65rem;
		color: var(--fg-muted);
	}

	.no-stream-state.recording {
		color: var(--color-danger);
		font-weight: 600;
	}

	.motion-pill {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.62rem;
		font-weight: 600;
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
		border-radius: 99px;
		padding: 3px 8px;
	}

	.camera-tile.unavailable { opacity: 0.5; }

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.25; }
	}

	/* ── Responsive: small tile — simplify ────────────────────────────────── */
	@container tile (max-width: 100px) {
		.name-overlay { display: none; }
		.motion-badge { display: none; }
		.no-stream-name { font-size: 0.65rem; }
		.motion-pill { display: none; }
	}

	.camera-tile[data-size='sm'] .name-overlay,
	.camera-tile[data-size='sm'] .motion-badge,
	.camera-tile[data-size='sm'] .no-stream-state,
	.camera-tile[data-size='sm'] .motion-pill { display: none; }

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    :global(.hue-icon-wrap) { width: 38px !important; height: 38px !important; }
    :global(.vac-btn), :global(.fan-btn), :global(.icon-badge), :global(.power-btn), :global(.avatar-wrap) { width: 44px !important; height: 44px !important; }
    :global(.bottom) { gap: 0px !important; }
    :global(.tile-content) { padding-bottom: 2px !important; }
  }


  .name-text {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .state-text {
    line-height: 1.15;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
