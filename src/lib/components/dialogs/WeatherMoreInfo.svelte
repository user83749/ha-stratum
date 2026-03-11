<script lang="ts">
	import { optimisticEntities } from '$lib/ha/optimistic';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const state = $derived((entity?.state as string | undefined) ?? 'unknown');
	const temp = $derived(entity?.attributes.temperature as number | undefined);
	const unit = $derived((entity?.attributes.temperature_unit as string | undefined) ?? '°');
	const humidity = $derived(entity?.attributes.humidity as number | undefined);
	const wind = $derived(entity?.attributes.wind_speed as number | undefined);
	const windUnit = $derived((entity?.attributes.wind_speed_unit as string | undefined) ?? 'km/h');
	const pressure = $derived(entity?.attributes.pressure as number | undefined);
	const pressureUnit = $derived(
		(entity?.attributes.pressure_unit as string | undefined) ??
		(entity?.attributes.native_pressure_unit as string | undefined) ??
		'hPa'
	);
	const visibility = $derived(entity?.attributes.visibility as number | undefined);
	const visibilityUnit = $derived(
		(entity?.attributes.visibility_unit as string | undefined) ??
		(entity?.attributes.precipitation_unit as string | undefined) ??
		'km'
	);

	interface ForecastDay {
		datetime?: string;
		temperature?: number;
		templow?: number;
		condition?: string;
	}
	const forecastRaw = $derived((entity?.attributes.forecast as ForecastDay[] | undefined) ?? []);
	const forecast = $derived.by(() => {
		if (!Array.isArray(forecastRaw)) return [];
		return forecastRaw
			.map((day) => {
				const dt = day.datetime ?? ((day as Record<string, unknown>).date as string | undefined) ?? '';
				const high =
					day.temperature ??
					((day as Record<string, unknown>).temperature_high as number | undefined) ??
					((day as Record<string, unknown>).native_temperature as number | undefined);
				const low =
					day.templow ??
					((day as Record<string, unknown>).temperature_low as number | undefined) ??
					((day as Record<string, unknown>).native_templow as number | undefined);
				const condition =
					day.condition ??
					((day as Record<string, unknown>).forecast_condition as string | undefined) ??
					((day as Record<string, unknown>).state as string | undefined) ??
					'unknown';
				return { datetime: dt, temperature: high, templow: low, condition };
			})
			.filter((day) => day.temperature !== undefined || day.templow !== undefined || !!day.condition);
	});

	function condIcon(c: string): string {
		const map: Record<string, string> = {
			'clear-night': 'moon',
			clear: 'sun',
			sunny: 'sun',
			partlycloudy: 'cloud-sun',
			'partly-cloudy': 'cloud-sun',
			cloudy: 'cloud',
			fog: 'cloud-fog',
			hail: 'cloud-rain',
			lightning: 'zap',
			'lightning-rainy': 'cloud-lightning',
			pouring: 'cloud-drizzle',
			rainy: 'cloud-rain',
			snowy: 'cloud-snow',
			'snowy-rainy': 'cloud-snow',
			windy: 'wind',
			'windy-variant': 'wind',
			exceptional: 'alert-triangle'
		};
		const key = String(c ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
		return map[key] ?? 'cloud';
	}

	function formatConditionLabel(c: string): string {
		const key = String(c ?? '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
		const labels: Record<string, string> = {
			'clear-night': 'Clear Night',
			clear: 'Clear',
			sunny: 'Sunny',
			partlycloudy: 'Partly Cloudy',
			cloudy: 'Cloudy',
			fog: 'Fog',
			hail: 'Hail',
			lightning: 'Lightning',
			'lightning-rainy': 'Lightning Rain',
			pouring: 'Pouring',
			rainy: 'Rainy',
			snowy: 'Snowy',
			'snowy-rainy': 'Snowy Rain',
			windy: 'Windy',
			'windy-variant': 'Windy',
			exceptional: 'Exceptional'
		};
		if (labels[key]) return labels[key];
		return key
			.replace(/-/g, ' ')
			.replace(/\b\w/g, (m) => m.toUpperCase());
	}

	function dayLabel(ds: string) {
		if (!ds) return '—';
		const d = new Date(ds);
		if (Number.isNaN(d.getTime())) return '—';
		if (d.toDateString() === new Date().toDateString()) return 'Today';
		return d.toLocaleDateString(undefined, { weekday: 'short' });
	}
</script>

<div class="wmi">
	<div class="wmi__header">
		<div class="wmi__icon-wrap">
			<Icon name={condIcon(state)} size={32} />
		</div>
		<div class="wmi__titles">
			<h2 class="wmi__title">{formatConditionLabel(state)}</h2>
			<span class="wmi__subtitle">{entity?.attributes.friendly_name ?? 'Weather'}</span>
		</div>
		<div class="wmi__main-temp">
			{temp !== undefined ? Math.round(temp) : '--'}
			<span class="wmi__unit">{unit}</span>
		</div>
	</div>

	<div class="wmi__body">
		<div class="wmi__metrics">
			<div class="wmi__metric">
				<Icon name="droplets" size={14} />
				<div class="wmi__metric-info">
					<span class="wmi__metric-label">Humidity</span>
					<span class="wmi__metric-val">{humidity ?? '--'}%</span>
				</div>
			</div>
			<div class="wmi__metric">
				<Icon name="wind" size={14} />
				<div class="wmi__metric-info">
					<span class="wmi__metric-label">Wind</span>
					<span class="wmi__metric-val">{wind ?? '--'} {windUnit}</span>
				</div>
			</div>
			<div class="wmi__metric">
				<Icon name="gauge" size={14} />
				<div class="wmi__metric-info">
					<span class="wmi__metric-label">Pressure</span>
					<span class="wmi__metric-val">{pressure ?? '--'} {pressureUnit}</span>
				</div>
			</div>
			<div class="wmi__metric">
				<Icon name="eye" size={14} />
				<div class="wmi__metric-info">
					<span class="wmi__metric-label">Visibility</span>
					<span class="wmi__metric-val">{visibility ?? '--'} {visibilityUnit}</span>
				</div>
			</div>
		</div>

		{#if forecast.length > 0}
			<div class="wmi__section">
				<h3 class="wmi__section-title">Forecast</h3>
				<div class="wmi__forecast-list">
					{#each forecast.slice(0, 6) as day}
						<div class="wmi__forecast-row">
							<span class="wmi__day-name">{dayLabel(day.datetime)}</span>
							<div class="wmi__day-icon">
								<Icon name={condIcon(day.condition)} size={20} />
							</div>
							<div class="wmi__day-temps">
								<span class="wmi__day-high">{day.temperature !== undefined ? Math.round(day.temperature) : '--'}{unit}</span>
								{#if day.templow !== undefined}
									<span class="wmi__day-low">{Math.round(day.templow)}{unit}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.wmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 520px;
		color: var(--fg);
	}

	.wmi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.wmi__icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: var(--dialog-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.wmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.wmi__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.wmi__subtitle {
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.wmi__main-temp {
		font-size: 2.5rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.02em;
		display: flex;
		align-items: flex-start;
	}

	.wmi__unit {
		font-size: 1rem;
		color: var(--fg-subtle);
		margin-top: 4px;
		margin-left: 2px;
	}

	.wmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.wmi__metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.wmi__metric {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--hover);
		border-radius: var(--dialog-radius);
		border: 1px solid var(--border);
	}

	.wmi__metric-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.wmi__metric-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.wmi__metric-val {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.wmi__section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.wmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.wmi__forecast-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.wmi__forecast-row {
		display: flex;
		align-items: center;
		padding: 12px 16px;
		background: var(--hover);
		border-radius: var(--dialog-radius);
		gap: 20px;
	}

	.wmi__day-name {
		width: 60px;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.wmi__day-icon {
		flex: 1;
		display: flex;
		color: var(--accent);
	}

	.wmi__day-temps {
		display: flex;
		gap: 12px;
		min-width: 80px;
		justify-content: flex-end;
		font-variant-numeric: tabular-nums;
	}

	.wmi__day-high {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.wmi__day-low {
		font-size: 0.9rem;
		color: var(--fg-muted);
	}
</style>
