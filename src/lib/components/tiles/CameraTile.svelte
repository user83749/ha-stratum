<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import { configStore } from '$lib/stores/config';
	import { getTileSizePreset } from '$lib/layout/tileSizing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { isCustomIcon } from '$lib/icons/customIcons';

	interface Props { tile: Tile; entity: HassEntity | null; }
	const { tile, entity }: Props = $props();
	const sizePreset = $derived(getTileSizePreset(tile));
	const name           = $derived((tile.config.name as string | undefined) ?? entity?.attributes.friendly_name ?? 'Camera');
	const iconOverride   = $derived(((tile.config.icon as string | undefined) ?? '').trim() || undefined);
	const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
	const snapshotUrl = $derived.by(() => {
		const picture = String(entity?.attributes.entity_picture ?? '').trim();
		if (!picture) return '';
		const accessToken = String(entity?.attributes.access_token ?? '').trim();
		const absolute = /^https?:\/\//i.test(picture)
			? picture
			: (() => {
				const base = String($configStore.hassUrl ?? '').trim().replace(/\/+$/, '');
				return base ? `${base}${picture.startsWith('/') ? picture : `/${picture}`}` : picture;
			})();
		if (!accessToken || /[?&]token=/.test(absolute)) return absolute;
		return `${absolute}${absolute.includes('?') ? '&' : '?'}token=${accessToken}`;
	});
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
	{#if snapshotUrl && !unavailable}
		<div class="stream-container">
			<img src={snapshotUrl} alt={name} class="stream-img" style="pointer-events: none;" />

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
			<div class="no-stream-icon" class:recording={isRecording} class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
				{#if iconOverride}
					{#if overrideIsCustom}
						<Icon name={iconOverride} entity={entity} size={32} />
					{:else}
						<Icon name={iconOverride} entity={entity} size={32} />
					{/if}
				{:else}
					<Icon name="camera" size={32} />
				{/if}
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
		width: calc(100% + var(--tile-padding, 10px) * 2);
		height: calc(100% + var(--tile-padding, 10px) * 2);
		margin: calc(var(--tile-padding, 10px) * -1);
		position: relative;
		overflow: hidden;
		border-radius: inherit;
		box-sizing: border-box;
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
		top: calc(var(--tile-padding-effective) * 0.72);
		right: calc(var(--tile-padding-effective) * 0.72);
		width: calc(var(--action-icon-size) * 0.42);
		height: calc(var(--action-icon-size) * 0.42);
		border-radius: 50%;
		background: var(--color-danger);
		box-shadow: 0 0 0 calc(var(--tile-padding-effective) * 0.18) color-mix(in srgb, var(--bg) 40%, transparent);
		animation: blink 1.2s ease-in-out infinite;
		z-index: 2;
	}

	.motion-badge {
		position: absolute;
		bottom: calc(var(--tile-padding-effective) * 2.1);
		left: calc(var(--tile-padding-effective) * 0.72);
		display: flex;
		align-items: center;
		gap: calc(var(--tile-padding-effective) * 0.36);
		font-size: var(--secondary-label-size);
		font-weight: 500;
		color: var(--fg);
		background: color-mix(in srgb, var(--bg) 70%, transparent);
		backdrop-filter: blur(calc(var(--tile-padding-effective) * 0.36));
		border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
		border-radius: 99px;
		padding: calc(var(--tile-padding-effective) * 0.27) calc(var(--tile-padding-effective) * 0.72);
		z-index: 2;
		pointer-events: none;
	}

	.name-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(
			to top,
			color-mix(in srgb, var(--bg) 75%, transparent) 0%,
			transparent 100%
		);
		padding: calc(var(--tile-padding-effective) * 1.8) calc(var(--tile-padding-effective) * 0.9) calc(var(--tile-padding-effective) * 0.72);
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		z-index: 2;
		pointer-events: none;
	}

	.overlay-name {
		font-size: var(--control-label-size);
		font-weight: 500;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.overlay-rec {
		font-size: var(--secondary-label-size);
		font-weight: 500;
		color: var(--color-danger);
		letter-spacing: 0.06em;
		animation: blink 1.2s ease-in-out infinite;
		flex-shrink: 0;
		margin-left: calc(var(--tile-padding-effective) * 0.55);
	}

	/* ── No stream / fallback ────────────────────────────────────────────── */
	.no-stream {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: calc(var(--tile-padding-effective) * 0.55);
	}

	.no-stream-icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(var(--control-chip-size) * 1.15);
		height: calc(var(--control-chip-size) * 1.15);
		border-radius: 50%;
		background: color-mix(in srgb, var(--fg-muted) 10%, transparent);
		color: var(--fg-muted);
	}

	.no-stream-icon.is-custom {
		display: block;
		line-height: 0;
		overflow: visible;
	}

	.no-stream-icon.recording {
		background: color-mix(in srgb, var(--color-danger) 14%, transparent);
		color: var(--color-danger);
	}

	/* If the user explicitly overrides the icon, remove the badge/chip behind it. */
	.no-stream-icon.override {
		background: transparent;
	}
	.no-stream-icon.override.recording {
		background: transparent;
	}

	.rec-indicator {
		position: absolute;
		top: calc(var(--tile-padding-effective) * 0.18);
		right: calc(var(--tile-padding-effective) * 0.18);
		width: calc(var(--action-icon-size) * 0.38);
		height: calc(var(--action-icon-size) * 0.38);
		border-radius: 50%;
		background: var(--color-danger);
		animation: blink 1.2s ease-in-out infinite;
	}

	.no-stream-name {
		font-size: var(--control-label-size);
		font-weight: 500;
		color: var(--fg);
		text-align: center;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.no-stream-state {
		font-size: var(--secondary-label-size);
		color: var(--fg-muted);
	}

	.no-stream-state.recording {
		color: var(--color-danger);
		font-weight: 500;
	}

	.motion-pill {
		display: flex;
		align-items: center;
		gap: calc(var(--tile-padding-effective) * 0.36);
		font-size: var(--secondary-label-size);
		font-weight: 500;
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 30%, transparent);
		border-radius: 99px;
		padding: calc(var(--tile-padding-effective) * 0.27) calc(var(--tile-padding-effective) * 0.72);
	}

	.camera-tile.unavailable { opacity: 0.5; }

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50%      { opacity: 0.25; }
	}

	/* ── Small tile: simplify ───────────────────────────────────────────── */
	.camera-tile[data-size='sm'] .name-overlay,
	.camera-tile[data-size='sm'] .motion-badge,
	.camera-tile[data-size='sm'] .no-stream-state,
	.camera-tile[data-size='sm'] .motion-pill {
		display: none;
	}

	@container tile (max-width: 170px) {
		.name-overlay {
			padding: calc(var(--tile-padding-effective) * 1.26) calc(var(--tile-padding-effective) * 0.72) calc(var(--tile-padding-effective) * 0.55);
		}

		.overlay-name {
			font-size: var(--secondary-label-size);
		}
	}
</style>
