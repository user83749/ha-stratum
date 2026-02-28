<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getEntityName } from '$lib/ha/entities';

	interface Props {
		tile: Tile;
		entity: HassEntity | null;
	}

	const { tile, entity }: Props = $props();

	const title = $derived((tile.config.name as string) ?? (entity ? getEntityName(entity) : 'Map'));
	const lat = $derived((entity?.attributes.latitude ?? tile.config.latitude) as number | undefined);
	const lon = $derived((entity?.attributes.longitude ?? tile.config.longitude) as number | undefined);
	const radius = $derived((entity?.attributes.radius as number | undefined) ?? undefined);
	const sourceType = $derived((entity?.attributes.source_type as string | undefined) ?? '');
	const stateLabel = $derived(entity?.state ?? '');
	const battery = $derived(entity?.attributes.battery_level as number | undefined);

	const mapUrl = $derived.by(() => {
		if (lat === undefined || lon === undefined) return '';
		return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01},${lat - 0.01},${lon + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lon}`;
	});
	const googleMapsUrl = $derived.by(() => {
		if (lat === undefined || lon === undefined) return '';
		return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
	});

	// Mock data for proximity
	const zones = [
		{ name: 'Home', distance: 1.2, unit: 'km', active: stateLabel === 'home' },
		{ name: 'Work', distance: 8.4, unit: 'km', active: stateLabel === 'work' },
		{ name: 'Gym', distance: 3.1, unit: 'km', active: stateLabel === 'gym' }
	];
</script>

<div class="mtmi">
	<div class="mtmi__header">
		<div class="mtmi__header-left">
			<div class="mtmi__icon">
				<Icon name="map-pinned" size={24} />
			</div>
			<div class="mtmi__titles">
				<h2 class="mtmi__title">{title}</h2>
				<span class="mtmi__subtitle">{stateLabel || 'Unknown Location'}</span>
			</div>
		</div>
		{#if battery !== undefined}
			<div class="mtmi__battery">
				<Icon name="battery" size={14} />
				<span>{battery}%</span>
			</div>
		{/if}
	</div>

	<div class="mtmi__body">
		<div class="mtmi__map-container">
			{#if mapUrl}
				<iframe 
					src={mapUrl} 
					title={`${title} map`} 
					loading="lazy" 
					sandbox="allow-scripts allow-same-origin"
					class="mtmi__map-iframe"
				></iframe>
				<div class="mtmi__map-overlay">
					<a href={googleMapsUrl} target="_blank" rel="noreferrer" class="mtmi__external-btn">
						<Icon name="external-link" size={14} />
						<span>Open in Google Maps</span>
					</a>
				</div>
			{:else}
				<div class="mtmi__empty">
					<Icon name="map" size={48} />
					<p>No coordinates available for this entity.</p>
				</div>
			{/if}
		</div>

		<div class="mtmi__dash">
			<div class="mtmi__section">
				<h3 class="mtmi__section-title">Current Coordinates</h3>
				<div class="mtmi__coords-grid">
					<div class="mtmi__coord">
						<span class="mtmi__coord-label">Latitude</span>
						<span class="mtmi__coord-val">{lat?.toFixed(5) ?? '—'}</span>
					</div>
					<div class="mtmi__coord">
						<span class="mtmi__coord-label">Longitude</span>
						<span class="mtmi__coord-val">{lon?.toFixed(5) ?? '—'}</span>
					</div>
				</div>
			</div>

			<div class="mtmi__section">
				<h3 class="mtmi__section-title">Zone Proximity</h3>
				<div class="mtmi__zones">
					{#each zones as zone}
						<div class="mtmi__zone" class:mtmi__zone--active={zone.active}>
							<div class="mtmi__zone-info">
								<span class="mtmi__zone-name">{zone.name}</span>
								<span class="mtmi__zone-dist">{zone.distance}{zone.unit}</span>
							</div>
							{#if zone.active}
								<div class="mtmi__zone-status">Current</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<div class="mtmi__details">
			<h3 class="mtmi__section-title">Entity Metadata</h3>
			<div class="mtmi__meta-rows">
				<div class="mtmi__meta-row">
					<span class="mtmi__meta-key">Source Type</span>
					<span class="mtmi__meta-val">{sourceType || 'gps'}</span>
				</div>
				<div class="mtmi__meta-row">
					<span class="mtmi__meta-key">GPS Accuracy</span>
					<span class="mtmi__meta-val">{radius ?? 0}m</span>
				</div>
				<div class="mtmi__meta-row">
					<span class="mtmi__meta-key">Tracking Entity</span>
					<span class="mtmi__meta-val">{tile.entity_id}</span>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.mtmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 560px;
		color: var(--fg);
	}

	.mtmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		border-bottom: 1px solid var(--border);
	}

	.mtmi__header-left {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.mtmi__icon {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.mtmi__titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mtmi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.mtmi__subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
		text-transform: capitalize;
	}

	.mtmi__battery {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--hover);
		border-radius: 99px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
	}

	.mtmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.mtmi__map-container {
		position: relative;
		height: 240px;
		border-radius: 20px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--hover);
	}

	.mtmi__map-iframe {
		width: 100%;
		height: 100%;
		border: none;
		filter: grayscale(0.2) contrast(1.1);
	}

	.mtmi__map-overlay {
		position: absolute;
		bottom: 12px;
		right: 12px;
		z-index: 2;
	}

	.mtmi__external-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--fg);
		text-decoration: none;
		box-shadow: 0 4px 12px rgba(0,0,0,0.1);
		transition: all 0.2s ease;
	}

	.mtmi__external-btn:hover {
		transform: translateY(-2px);
		background: var(--hover);
	}

	.mtmi__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--fg-subtle);
		gap: 12px;
	}

	.mtmi__empty p {
		margin: 0;
		font-size: 0.9rem;
	}

	.mtmi__section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mtmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.mtmi__coords-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.mtmi__coord {
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.mtmi__coord-label {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--fg-subtle);
	}

	.mtmi__coord-val {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.mtmi__zones {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.mtmi__zone {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		background: var(--hover);
		border-radius: 14px;
		border: 1px solid var(--border);
		transition: all 0.2s ease;
	}

	.mtmi__zone--active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 5%, var(--hover));
	}

	.mtmi__zone-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.mtmi__zone-name {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.mtmi__zone-dist {
		font-size: 0.75rem;
		color: var(--fg-subtle);
	}

	.mtmi__zone-status {
		font-size: 0.65rem;
		font-weight: 800;
		text-transform: uppercase;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		padding: 4px 8px;
		border-radius: 6px;
	}

	.mtmi__meta-rows {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.mtmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.mtmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.mtmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: capitalize;
	}
</style>
