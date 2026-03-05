<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getEntityName } from '$lib/ha/entities';

	interface Props {
		tile: Tile;
		entity: HassEntity | null;
		mode: 'history' | 'gauge' | 'statistic';
	}

	const { tile, entity, mode }: Props = $props();

	const title = $derived((tile.config.name as string) ?? (entity ? getEntityName(entity) : 'Graph'));
	const unit = $derived(
		(tile.config.unit_of_measurement as string | undefined) ??
		(entity?.attributes.unit_of_measurement as string | undefined) ??
		''
	);
	const numericValue = $derived.by(() => {
		const parsed = entity ? Number(entity.state) : NaN;
		return Number.isFinite(parsed) ? parsed : null;
	});
	const valueLabel = $derived(
		numericValue === null ? '—' : Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1)
	);
	const entityName = $derived(entity ? getEntityName(entity) : 'No source entity');
	const modeLabel = $derived(
		mode === 'history' ? 'History' : mode === 'gauge' ? 'Gauge' : 'Statistic'
	);
	const deviceClass = $derived((entity?.attributes.device_class as string | undefined) ?? '');
	const stateClass = $derived((entity?.attributes.state_class as string | undefined) ?? '');
	const lastChanged = $derived(entity?.last_changed ?? '');
	const minVal = $derived((tile.config.min as number | undefined) ?? 0);
	const maxVal = $derived((tile.config.max as number | undefined) ?? 100);
	const percentage = $derived.by(() => {
		if (numericValue === null) return 0;
		const range = maxVal - minVal || 1;
		return Math.max(0, Math.min(100, ((numericValue - minVal) / range) * 100));
	});

	// Mock data for deep view visualization
	const historyData = [24, 25, 23, 26, 28, 27, 29, 31, 30, 32, 34, 33, 31, 29, 28, 27, 26, 25, 24, 25, 26, 27, 28, 30];
	const sparklinePath = $derived.by(() => {
		const max = Math.max(...historyData);
		const min = Math.min(...historyData);
		const range = max - min || 1;
		const width = 400;
		const height = 120;
		const points = historyData.map((v, i) => {
			const x = (i / (historyData.length - 1)) * width;
			const y = height - ((v - min) / range) * height;
			return `${x},${y}`;
		});
		return `M ${points.join(' L ')}`;
	});
</script>

<div class="gtmi">
	<div class="gtmi__header">
		<div class="gtmi__header-left">
			<div class="gtmi__icon" class:gtmi__icon--accent={mode !== 'gauge'}>
				<Icon name={mode === 'history' ? 'activity' : mode === 'gauge' ? 'gauge' : 'chart-column'} size={24} />
			</div>
			<div class="gtmi__titles">
				<h2 class="gtmi__title">{title}</h2>
				<span class="gtmi__subtitle">{modeLabel} Inspector</span>
			</div>
		</div>
		<div class="gtmi__badge">{modeLabel}</div>
	</div>

	<div class="gtmi__body">
		<div class="gtmi__main">
			<div class="gtmi__hero">
				<div class="gtmi__hero-label">Current Reading</div>
				<div class="gtmi__hero-value">
					{valueLabel}{#if unit}<span class="gtmi__unit">{unit}</span>{/if}
				</div>
			</div>

			<div class="gtmi__stats-grid">
				<div class="gtmi__stat">
					<span class="gtmi__stat-label">Min (24h)</span>
					<span class="gtmi__stat-value">{Math.min(...historyData)}{unit}</span>
				</div>
				<div class="gtmi__stat">
					<span class="gtmi__stat-label">Max (24h)</span>
					<span class="gtmi__stat-value">{Math.max(...historyData)}{unit}</span>
				</div>
				<div class="gtmi__stat">
					<span class="gtmi__stat-label">Average</span>
					<span class="gtmi__stat-value">{(historyData.reduce((a,b)=>a+b)/historyData.length).toFixed(1)}{unit}</span>
				</div>
			</div>

			{#if mode === 'history' || mode === 'statistic'}
				<div class="gtmi__graph-shell">
					<div class="gtmi__graph-header">
						<span>Historical Trend (Past 24 Hours)</span>
						<span class="gtmi__update-time">Last updated {lastChanged ? new Date(lastChanged).toLocaleTimeString() : 'now'}</span>
					</div>
					<div class="gtmi__spark-wrap">
						<svg viewBox="0 0 400 120" class="gtmi__spark-svg" preserveAspectRatio="none">
							<path d={sparklinePath} fill="none" class="gtmi__spark-path" />
						</svg>
					</div>
				</div>
			{:else if mode === 'gauge'}
				<div class="gtmi__gauge-box">
					<div class="gtmi__gauge-range">
						<span class="gtmi__range-tag">{minVal}</span>
						<div class="gtmi__progress-track">
							<div class="gtmi__progress-fill" style="width: {percentage}%"></div>
						</div>
						<span class="gtmi__range-tag">{maxVal}</span>
					</div>
					<div class="gtmi__gauge-info">
						The value is currently at <strong>{percentage}%</strong> of the configured 0-{maxVal} range.
					</div>
				</div>
			{/if}
		</div>

		<div class="gtmi__info-panel">
			<h3 class="gtmi__section-title">Entity Metadata</h3>
			<div class="gtmi__meta-list">
				<div class="gtmi__meta-row">
					<span class="gtmi__meta-key">Entity ID</span>
					<span class="gtmi__meta-val">{tile.entity_id ?? 'None'}</span>
				</div>
				<div class="gtmi__meta-row">
					<span class="gtmi__meta-key">Source</span>
					<span class="gtmi__meta-val">{entityName}</span>
				</div>
				{#if deviceClass}
					<div class="gtmi__meta-row">
						<span class="gtmi__meta-key">Device Class</span>
						<span class="gtmi__meta-val">{deviceClass}</span>
					</div>
				{/if}
				{#if stateClass}
					<div class="gtmi__meta-row">
						<span class="gtmi__meta-key">State Class</span>
						<span class="gtmi__meta-val">{stateClass}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.gtmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 520px;
		color: var(--fg);
	}

	.gtmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		border-bottom: 1px solid var(--border);
	}

	.gtmi__header-left {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.gtmi__icon {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--hover);
		color: var(--fg-subtle);
		border: 1px solid var(--border);
	}

	.gtmi__icon--accent {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.gtmi__titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.gtmi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.gtmi__subtitle {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.gtmi__badge {
		padding: 4px 12px;
		background: var(--hover);
		border: 1px solid var(--border);
		border-radius: 99px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-muted);
	}

	.gtmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.gtmi__hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		margin-bottom: 24px;
	}

	.gtmi__hero-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
		letter-spacing: 0.05em;
	}

	.gtmi__hero-value {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1;
	}

	.gtmi__unit {
		font-size: 1.25rem;
		margin-left: 4px;
		color: var(--fg-subtle);
		font-weight: 600;
	}

	.gtmi__stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-bottom: 32px;
	}

	.gtmi__stat {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.gtmi__stat-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.gtmi__stat-value {
		font-size: 1rem;
		font-weight: 700;
	}

	.gtmi__graph-shell {
		background: var(--hover);
		border-radius: 20px;
		padding: 20px;
		border: 1px solid var(--border);
	}

	.gtmi__graph-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--fg-muted);
		margin-bottom: 20px;
	}

	.gtmi__update-time {
		font-weight: 500;
		color: var(--fg-subtle);
	}

	.gtmi__spark-wrap {
		height: 120px;
		width: 100%;
		overflow: hidden;
	}

	.gtmi__spark-svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.gtmi__spark-path {
		stroke: var(--accent);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: drop-shadow(0 2px 4px color-mix(in srgb, var(--accent) 30%, transparent));
	}

	.gtmi__gauge-box {
		padding: 24px;
		background: var(--hover);
		border-radius: 20px;
		border: 1px solid var(--border);
	}

	.gtmi__gauge-range {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
	}

	.gtmi__range-tag {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--fg-subtle);
	}

	.gtmi__progress-track {
		flex: 1;
		height: 10px;
		background: var(--bg-elevated);
		border-radius: 99px;
		overflow: hidden;
		border: 1px solid var(--border);
	}

	.gtmi__progress-fill {
		height: 100%;
		background: var(--accent);
		border-radius: inherit;
	}

	.gtmi__gauge-info {
		font-size: 0.85rem;
		color: var(--fg-muted);
		text-align: center;
	}

	.gtmi__section-title {
		font-size: 0.9rem;
		font-weight: 700;
		margin: 0 0 16px;
		color: var(--fg-muted);
	}

	.gtmi__meta-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.gtmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.gtmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.gtmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg);
	}
</style>
