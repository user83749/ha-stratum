<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';

	interface Props {
		tile: Tile;
		entity: HassEntity | null;
		mode?: string;
		history?: { t: string; v: number }[];
		statisticValue?: number;
	}

	let { tile, entity, mode: modeProp, history, statisticValue }: Props = $props();
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );

	let mode = $derived(modeProp ?? (tile.config.graph_mode as string) ?? 'history');
	let name = $derived(
		(tile.config.name as string) ?? entity?.attributes.friendly_name ?? 'Graph'
	);
	let unit = $derived(
		(tile.config.unit_of_measurement as string) ??
			(entity?.attributes.unit_of_measurement as string) ??
			''
	);
	let currentValue = $derived(entity ? parseFloat(entity.state) || 0 : 0);
	let displayValue = $derived(
		mode === 'statistic' ? (statisticValue ?? currentValue) : currentValue
	);
	let minVal = $derived((tile.config.min as number) ?? 0);
	let maxVal = $derived((tile.config.max as number) ?? 100);
	let percentage = $derived(
		Math.min(100, Math.max(0, ((displayValue - minVal) / (maxVal - minVal)) * 100))
	);

	let gaugeColor = $derived.by(() => {
		const segments = tile.config.gauge_segments as
			| { from: number; color: string }[]
			| undefined;
		if (!segments || segments.length === 0) return 'var(--accent)';
		const sorted = [...segments].sort((a, b) => a.from - b.from);
		let color = sorted[0].color;
		for (const seg of sorted) {
			if (displayValue >= seg.from) color = seg.color;
		}
		return color;
	});

	let historyPoints = $derived((history ?? []).slice(-50));
	let unavailable = $derived(
		entity?.state === 'unavailable' || entity?.state === 'unknown'
	);

	let sparklinePoints = $derived.by(() => {
		const pts = historyPoints;
		if (pts.length < 2) return { polyline: '', polygon: '' };
		const vals = pts.map((p) => p.v);
		const lo = Math.min(...vals);
		const hi = Math.max(...vals);
		const range = hi - lo || 1;
		const w = 100;
		const h = 40;
		const pad = 2;
		const coords = pts.map((p, i) => {
			const x = pad + (i / (pts.length - 1)) * (w - pad * 2);
			const y = h - pad - ((p.v - lo) / range) * (h - pad * 2);
			return x.toFixed(2) + ',' + y.toFixed(2);
		});
		const polyline = coords.join(' ');
		const first = coords[0].split(',');
		const last = coords[coords.length - 1].split(',');
		const polygon =
			polyline + ' ' + last[0] + ',' + (h - pad) + ' ' + first[0] + ',' + (h - pad);
		return { polyline, polygon };
	});

	function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
		const s = polarToCartesian(cx, cy, r, startAngle);
		const e = polarToCartesian(cx, cy, r, endAngle);
		const large = endAngle - startAngle > 180 ? 1 : 0;
		return 'M ' + s.x.toFixed(2) + ' ' + s.y.toFixed(2) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + e.x.toFixed(2) + ' ' + e.y.toFixed(2);
	}

	let bgArcPath = $derived(arcPath(50, 50, 38, 180, 360));
	let fgArcPath = $derived.by(() => {
		if (percentage <= 0) return '';
		const endAngle = 180 + percentage * 1.8;
		return arcPath(50, 50, 38, 180, Math.min(360, endAngle));
	});

	let displayValueStr = $derived(
		Number.isFinite(displayValue)
			? displayValue.toFixed(displayValue % 1 === 0 ? 0 : 1)
			: '—'
	);
	let showLabel = $derived(sizePreset !== 'sm');
	let showMetaStats = $derived(sizePreset === 'lg' || sizePreset === 'xl');
	let historyMin = $derived(historyPoints.length ? Math.min(...historyPoints.map((p) => p.v)) : null);
	let historyMax = $derived(historyPoints.length ? Math.max(...historyPoints.map((p) => p.v)) : null);
</script>

<div class="graph-tile" class:unavailable data-size={sizePreset}>
	{#if mode === 'gauge'}
		<div class="gauge-layout">
			<svg viewBox="0 0 100 55" class="gauge-svg">
				<path d={bgArcPath} class="gauge-bg" />
				{#if fgArcPath}
					<path d={fgArcPath} class="gauge-fg" style="stroke: {gaugeColor}" />
				{/if}
				<text x="50" y="41" class="gauge-val">{displayValueStr}</text>
				<text x="50" y="51" class="gauge-unit">{unit}</text>
			</svg>
			{#if showLabel}
				<span class="label">{name}</span>
			{/if}
		</div>

	{:else if mode === 'history'}
		<div class="history-layout">
			<div class="history-header">
				<span class="history-value">
					{displayValueStr}<span class="history-unit">{unit}</span>
				</span>
				{#if showLabel}
					<span class="history-name">{name}</span>
				{/if}
			</div>
			<div class="spark-wrap">
				{#if historyPoints.length >= 2}
					<svg viewBox="0 0 100 40" class="spark-svg" preserveAspectRatio="none">
						<polygon points={sparklinePoints.polygon} class="spark-area" />
						<polyline points={sparklinePoints.polyline} class="spark-line" />
					</svg>
				{:else}
					<span class="no-data">No history data</span>
				{/if}
			</div>
			{#if showMetaStats && historyMin !== null && historyMax !== null}
				<div class="history-meta">
					<span class="history-chip">Min {historyMin.toFixed(historyMin % 1 === 0 ? 0 : 1)}{unit}</span>
					<span class="history-chip">Max {historyMax.toFixed(historyMax % 1 === 0 ? 0 : 1)}{unit}</span>
				</div>
			{/if}
		</div>

	{:else}
		<div class="stat-layout">
			<span class="stat-value">
				{displayValueStr}<span class="stat-unit">{unit}</span>
			</span>
			{#if showLabel}
				<span class="label">{name}</span>
			{/if}
			{#if showMetaStats}
				<span class="stat-meta">{minVal}–{maxVal}{unit}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.graph-tile {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.graph-tile.unavailable { opacity: 0.5; }

	/* ── Gauge ──────────────────────────────────────────────── */
	.gauge-layout {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		gap: 4px;
	}

	.gauge-svg {
		width: min(160px, 80cqw);
		height: auto;
	}

	.gauge-bg {
		fill: none;
		stroke: var(--border);
		stroke-width: 10;
		stroke-linecap: round;
	}

	.gauge-fg {
		fill: none;
		stroke-width: 10;
		stroke-linecap: round;
	}

	.gauge-val {
		font-size: 16px;
		font-weight: 800;
		fill: var(--fg);
		text-anchor: middle;
	}

	.gauge-unit {
		font-size: 8px;
		fill: var(--fg-muted);
		text-anchor: middle;
	}

	/* ── History ────────────────────────────────────────────── */
	.history-layout {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		gap: 6px;
	}

	.history-header {
		display: flex;
		align-items: baseline;
		gap: 6px;
		flex-shrink: 0;
	}

	.history-value {
		font-size: clamp(1.2rem, 9cqw, 2.2rem);
		font-weight: 800;
		color: var(--fg);
		line-height: 1;
	}

	.history-unit {
		font-size: 0.65em;
		color: var(--fg-muted);
	}

	.history-name {
		font-size: 0.75rem;
		color: var(--fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
		min-width: 0;
	}

	.spark-wrap {
		flex: 1;
		min-height: 0;
		display: flex;
		align-items: stretch;
		overflow: hidden;
	}

	.spark-svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.spark-line {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.spark-area {
		fill: color-mix(in srgb, var(--accent) 15%, transparent);
		stroke: none;
	}

	.no-data {
		font-size: 0.75rem;
		color: var(--fg-subtle);
		align-self: center;
		margin: auto;
	}

	.history-meta {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.history-chip,
	.stat-meta {
		font-size: 0.62rem;
		font-weight: 700;
		color: var(--fg-subtle);
	}

	/* ── Statistic ──────────────────────────────────────────── */
	.stat-layout {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		gap: 6px;
	}

	.stat-value {
		font-size: clamp(1.8rem, 14cqw, 3.5rem);
		font-weight: 800;
		color: var(--fg);
		line-height: 1;
		text-align: center;
	}

	.stat-unit {
		font-size: 0.45em;
		color: var(--fg-muted);
		margin-left: 3px;
	}

	/* ── Shared label ───────────────────────────────────────── */
	.label {
		font-size: 0.75rem;
		color: var(--fg-muted);
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* ── Container queries ──────────────────────────────────── */
	@container tile (max-width: 120px) {
		.gauge-svg { width: 90px; }
		.label { display: none; }
		.history-header { flex-direction: column; gap: 2px; }
		.history-name { display: none; }
		.history-value { font-size: clamp(0.9rem, 10cqw, 1.4rem); }
	}

	@container tile (max-height: 80px) {
		.history-layout { flex-direction: row; align-items: center; gap: 10px; }
		.spark-wrap { flex: 1; height: 100%; }
		.history-header { flex-direction: column; gap: 1px; flex-shrink: 0; }
		.history-name { display: none; }
		.history-value { font-size: 1rem; }
		.gauge-svg { width: 70px; }
		.label { display: none; }
		.stat-value { font-size: clamp(1rem, 8cqw, 1.8rem); }
	}

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
