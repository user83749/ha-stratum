<script lang="ts">
	import { optimisticEntities } from '$lib/ha/optimistic';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const picture = $derived((entity?.attributes.entity_picture as string | undefined) ?? '');
	const state = $derived((entity?.state as string | undefined) ?? 'unknown');
	
	const battery = $derived(entity?.attributes.battery_level as number | undefined);
	const latitude = $derived(entity?.attributes.latitude as number | undefined);
	const longitude = $derived(entity?.attributes.longitude as number | undefined);
	const source = $derived(entity?.attributes.source as string | undefined);
	const gps_accuracy = $derived(entity?.attributes.gps_accuracy as number | undefined);

	const isHome = $derived(state.toLowerCase() === 'home');
	const statusColor = $derived(isHome ? 'var(--color-on)' : 'var(--color-warning)');

	function openInMaps() {
		if (latitude !== undefined && longitude !== undefined) {
			const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
			window.open(url, '_blank');
		}
	}
</script>

<div class="pmi">
	<div class="pmi__header">
		<div class="pmi__avatar-wrap" style="--sc: {statusColor};">
			{#if picture}
				<img src={picture} alt="Avatar" class="pmi__avatar" />
			{:else}
				<div class="pmi__avatar pmi__avatar--placeholder">
					<Icon name="user-round" size={32} />
				</div>
			{/if}
			<div class="pmi__status-dot" style="background: {statusColor};"></div>
		</div>
		<div class="pmi__titles">
			<h2 class="pmi__title">{entity?.attributes.friendly_name ?? 'Person'}</h2>
			<div class="pmi__status">
				<Icon name={isHome ? 'home' : 'map-pin'} size={14} />
				<span>{state.replace(/_/g, ' ')}</span>
			</div>
		</div>
	</div>

	<div class="pmi__body">
		<div class="pmi__metrics">
			<div class="pmi__metric">
				<Icon name="battery" size={16} />
				<div class="pmi__metric-info">
					<span class="pmi__metric-label">Battery</span>
					<span class="pmi__metric-val">{battery ?? '--'}%</span>
				</div>
			</div>
			<div class="pmi__metric">
				<Icon name="target" size={16} />
				<div class="pmi__metric-info">
					<span class="pmi__metric-label">Accuracy</span>
					<span class="pmi__metric-val">{gps_accuracy ?? '--'}m</span>
				</div>
			</div>
		</div>

		<div class="pmi__section">
			<h3 class="pmi__section-title">Location Details</h3>
			<div class="pmi__location-card">
				<div class="pmi__coords">
					<div class="pmi__coord">
						<span class="pmi__coord-label">Latitude</span>
						<span class="pmi__coord-val">{latitude?.toFixed(6) ?? '--'}</span>
					</div>
					<div class="pmi__coord">
						<span class="pmi__coord-label">Longitude</span>
						<span class="pmi__coord-val">{longitude?.toFixed(6) ?? '--'}</span>
					</div>
				</div>
				<button 
					class="pmi__maps-btn" 
					onclick={openInMaps} 
					disabled={latitude === undefined}
				>
					<Icon name="external-link" size={16} />
					<span>Open in Google Maps</span>
				</button>
			</div>
		</div>

		<div class="pmi__meta">
			<div class="pmi__meta-row">
				<span class="pmi__meta-key">Entity ID</span>
				<span class="pmi__meta-val">{entityId}</span>
			</div>
			<div class="pmi__meta-row">
				<span class="pmi__meta-key">Source</span>
				<span class="pmi__meta-val">{source ?? 'Unknown'}</span>
			</div>
			<div class="pmi__meta-row">
				<span class="pmi__meta-key">Last Updated</span>
				<span class="pmi__meta-val">{entity?.last_changed ? new Date(entity.last_changed).toLocaleTimeString() : 'Unknown'}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.pmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 480px;
		color: var(--fg);
	}

	.pmi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 20px;
		border-bottom: 1px solid var(--border);
	}

	.pmi__avatar-wrap {
		position: relative;
		width: 72px;
		height: 72px;
	}

	.pmi__avatar {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		border: 4px solid var(--border);
		object-fit: cover;
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
	}

	.pmi__avatar--placeholder {
		background: var(--hover);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-subtle);
	}

	.pmi__status-dot {
		position: absolute;
		bottom: 4px;
		right: 4px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 3px solid var(--bg-elevated);
		box-shadow: 0 0 10px rgba(0,0,0,0.3);
	}

	.pmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pmi__title {
		margin: 0;
		font-size: 1.4rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.pmi__status {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--fg-muted);
		text-transform: capitalize;
	}

	.pmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.pmi__metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.pmi__metric {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
		color: var(--fg-muted);
	}

	.pmi__metric-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.pmi__metric-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.pmi__metric-val {
		font-size: 1rem;
		font-weight: 800;
		color: var(--fg);
	}

	.pmi__section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.pmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.pmi__location-card {
		background: var(--active);
		border: 1px solid var(--border);
		border-radius: 20px;
		overflow: hidden;
	}

	.pmi__coords {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 20px;
		gap: 20px;
		border-bottom: 1px solid var(--border);
	}

	.pmi__coord {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pmi__coord-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.pmi__coord-val {
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.pmi__maps-btn {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px;
		width: 100%;
		box-sizing: border-box;
		font-size: 0.85rem;
		font-weight: 800;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.pmi__maps-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}

	.pmi__maps-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.pmi__meta {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.pmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.pmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.pmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
