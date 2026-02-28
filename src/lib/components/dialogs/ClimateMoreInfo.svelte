<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { climateService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const hvacMode = $derived((entity?.state as string | undefined) ?? 'off');
	const hvacModes = $derived((entity?.attributes.hvac_modes as string[] | undefined) ?? []);
	const currentTemp = $derived(entity?.attributes.current_temperature as number | undefined);
	const currentHumidity = $derived(entity?.attributes.current_humidity as number | undefined);
	const targetTemp = $derived(entity?.attributes.temperature as number | undefined);
	const targetTempLow = $derived(entity?.attributes.target_temp_low as number | undefined);
	const targetTempHigh = $derived(entity?.attributes.target_temp_high as number | undefined);
	const minTemp = $derived((entity?.attributes.min_temp as number | undefined) ?? 55);
	const maxTemp = $derived((entity?.attributes.max_temp as number | undefined) ?? 85);
	const tempStep = $derived((entity?.attributes.target_temp_step as number | undefined) ?? 1);
	const tempUnit = $derived((entity?.attributes.temperature_unit as string | undefined) ?? '°');
	const hvacAction = $derived((entity?.attributes.hvac_action as string | undefined) ?? '');
	const supportsRange = $derived(targetTempLow !== undefined && targetTempHigh !== undefined);

	let localTemp = $state(72);
	let localTempLow = $state(68);
	let localTempHigh = $state(76);

	$effect(() => {
		if (targetTemp !== undefined) localTemp = targetTemp;
	});
	$effect(() => {
		if (targetTempLow !== undefined) localTempLow = targetTempLow;
	});
	$effect(() => {
		if (targetTempHigh !== undefined) localTempHigh = targetTempHigh;
	});

	let tempDebounce: ReturnType<typeof setTimeout> | null = null;
	function onTempInput(next: number) {
		localTemp = next;
		if (tempDebounce) clearTimeout(tempDebounce);
		tempDebounce = setTimeout(() => {
			if (isDemo) {
				applyPatch(entityId, { attributes: { temperature: next } });
			} else {
				climateService.setTemperature(entityId, next).catch(() => {});
			}
		}, 150);
	}

	let rangeDebounce: ReturnType<typeof setTimeout> | null = null;
	function onRangeInput(kind: 'low' | 'high', next: number) {
		if (kind === 'low') localTempLow = next;
		else localTempHigh = next;
		if (rangeDebounce) clearTimeout(rangeDebounce);
		rangeDebounce = setTimeout(() => {
			const low = kind === 'low' ? next : localTempLow;
			const high = kind === 'high' ? next : localTempHigh;
			if (isDemo) {
				applyPatch(entityId, { attributes: { target_temp_low: low, target_temp_high: high } });
			} else {
				climateService.setTargetTempRange(entityId, low, high).catch(() => {});
			}
		}, 150);
	}

	function setMode(mode: string) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: mode });
			return;
		}
		climateService.setHvacMode(entityId, mode as any).catch(() => {});
	}

	function nudgeSingle(dir: 1 | -1) {
		const next = Math.min(maxTemp, Math.max(minTemp, localTemp + dir * tempStep));
		onTempInput(next);
	}

	function nudgeRange(kind: 'low' | 'high', dir: 1 | -1) {
		const next = kind === 'low'
			? Math.min(localTempHigh - 1, Math.max(minTemp, localTempLow + dir * tempStep))
			: Math.max(localTempLow + 1, Math.min(maxTemp, localTempHigh + dir * tempStep));
		onRangeInput(kind, next);
	}

	const displayAction = $derived(hvacAction ? hvacAction.replace(/_/g, ' ') : hvacMode.replace(/_/g, ' '));
	const actionColor = $derived.by(() => {
		if (hvacAction === 'heating' || hvacMode === 'heat') return 'var(--color-warning)';
		if (hvacAction === 'cooling' || hvacMode === 'cool') return 'var(--color-info)';
		if (hvacAction === 'drying' || hvacMode === 'dry') return 'var(--color-warning)';
		if (hvacAction === 'fan' || hvacMode === 'fan_only') return 'var(--color-info)';
		if (hvacMode === 'off') return 'var(--fg-subtle)';
		return 'var(--accent)';
	});
</script>

<div class="cmi" class:cmi--unavailable={isUnavail}>
	<!-- Adaptive Background Glow -->
	<div class="cmi__bg" style="background: radial-gradient(circle at 50% 30%, color-mix(in srgb, {actionColor} 15%, transparent), transparent 70%);"></div>

	<div class="cmi__content">
		<div class="cmi__header">
			<div class="cmi__header-left">
				<div class="cmi__icon-badge" style="--ac: {actionColor}">
					<Icon name="thermometer" size={20} />
				</div>
				<div class="cmi__titles">
					<h2 class="cmi__title">{entity?.attributes.friendly_name ?? 'Climate'}</h2>
					<span class="cmi__subtitle" style="color: {actionColor}">{displayAction}</span>
				</div>
			</div>
			{#if currentHumidity !== undefined}
				<div class="cmi__humidity">
					<Icon name="droplets" size={12} />
					<span>{Math.round(currentHumidity)}%</span>
				</div>
			{/if}
		</div>

		<div class="cmi__main-control">
			<div class="cmi__dial">
				<div class="cmi__current">
					<span class="cmi__current-label">Current</span>
					<span class="cmi__current-value" style="color: {actionColor}">
						{#if currentTemp !== undefined}{Math.round(currentTemp)}{tempUnit}{:else}—{/if}
					</span>
				</div>
				
				<div class="cmi__target-display">
					{#if supportsRange}
						<div class="cmi__range-values">
							<div class="cmi__range-val">
								<span class="cmi__range-label">Low</span>
								<span class="cmi__range-num" style="color: var(--color-warning)">{localTempLow}{tempUnit}</span>
							</div>
							<div class="cmi__range-sep"></div>
							<div class="cmi__range-val">
								<span class="cmi__range-label">High</span>
								<span class="cmi__range-num" style="color: var(--color-info)">{localTempHigh}{tempUnit}</span>
							</div>
						</div>
					{:else}
						<div class="cmi__single-val">
							<span class="cmi__single-label">Target</span>
							<span class="cmi__single-num" style="color: {actionColor}">{localTemp}{tempUnit}</span>
						</div>
					{/if}
				</div>
			</div>

			<div class="cmi__controls">
				{#if supportsRange}
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent)" onclick={() => nudgeRange('low', -1)}>
								<Icon name="minus" size={16} />
							</button>
							<div class="cmi__slider-track">
								<div class="cmi__slider-fill" style="width: {((localTempLow - minTemp) / (maxTemp - minTemp)) * 100}%; background: var(--color-warning)"></div>
								<input 
									type="range" class="cmi__slider" 
									min={minTemp} max={maxTemp} step={tempStep} 
									value={localTempLow} oninput={(e) => onRangeInput('low', Number(e.currentTarget.value))} 
								/>
							</div>
							<button class="cmi__nudge" style="color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent)" onclick={() => nudgeRange('low', 1)}>
								<Icon name="plus" size={16} />
							</button>
						</div>
					</div>
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: var(--color-info); border-color: color-mix(in srgb, var(--color-info) 30%, transparent)" onclick={() => nudgeRange('high', -1)}>
								<Icon name="minus" size={16} />
							</button>
							<div class="cmi__slider-track">
								<div class="cmi__slider-fill" style="width: {((localTempHigh - minTemp) / (maxTemp - minTemp)) * 100}%; background: var(--color-info)"></div>
								<input 
									type="range" class="cmi__slider" 
									min={minTemp} max={maxTemp} step={tempStep} 
									value={localTempHigh} oninput={(e) => onRangeInput('high', Number(e.currentTarget.value))} 
								/>
							</div>
							<button class="cmi__nudge" style="color: var(--color-info); border-color: color-mix(in srgb, var(--color-info) 30%, transparent)" onclick={() => nudgeRange('high', 1)}>
								<Icon name="plus" size={16} />
							</button>
						</div>
					</div>
				{:else}
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: {actionColor}; border-color: color-mix(in srgb, {actionColor} 30%, transparent)" onclick={() => nudgeSingle(-1)}>
								<Icon name="minus" size={18} />
							</button>
							<div class="cmi__slider-track">
								<div class="cmi__slider-fill" style="width: {((localTemp - minTemp) / (maxTemp - minTemp)) * 100}%; background: {actionColor}"></div>
								<input 
									type="range" class="cmi__slider" 
									min={minTemp} max={maxTemp} step={tempStep} 
									value={localTemp} oninput={(e) => onTempInput(Number(e.currentTarget.value))} 
								/>
							</div>
							<button class="cmi__nudge" style="color: {actionColor}; border-color: color-mix(in srgb, {actionColor} 30%, transparent)" onclick={() => nudgeSingle(1)}>
								<Icon name="plus" size={18} />
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if hvacModes.length > 0}
			<div class="cmi__modes">
				{#each hvacModes as mode (mode)}
					<button 
						class="cmi__mode-btn" 
						class:cmi__mode-btn--active={hvacMode === mode} 
						style={hvacMode === mode ? `--active-color: ${actionColor}` : ''}
						onclick={() => setMode(mode)}
					>
						<span class="cmi__mode-label">{mode.replace(/_/g, ' ')}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.cmi {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		overflow: hidden;
	}

	.cmi__bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		transition: background 0.5s ease;
	}

	.cmi__content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		padding: 20px 24px;
		gap: 20px;
		height: 100%;
	}

	.cmi--unavailable {
		opacity: 0.5;
		pointer-events: none;
	}

	.cmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.cmi__header-left {
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.cmi__icon-badge {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--ac) 12%, transparent);
		color: var(--ac);
		border: 1px solid color-mix(in srgb, var(--ac) 20%, transparent);
	}

	.cmi__titles {
		display: flex;
		flex-direction: column;
		gap: 0px;
	}

	.cmi__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--fg);
	}

	.cmi__subtitle {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.cmi__humidity {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: rgba(255,255,255,0.05);
		backdrop-filter: blur(10px);
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--fg-muted);
	}

	.cmi__main-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
	}

	.cmi__dial {
		position: relative;
		width: 200px;
		height: 200px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%);
		border-radius: 50%;
	}

	.cmi__current {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 4px;
	}

	.cmi__current-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	.cmi__current-value {
		font-size: 4rem;
		font-weight: 800;
		color: var(--fg);
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.cmi__target-display {
		padding: 6px 14px;
		background: rgba(255,255,255,0.05);
		backdrop-filter: blur(10px);
		border-radius: 14px;
		border: 1px solid rgba(255,255,255,0.1);
	}

	.cmi__range-values {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cmi__range-val {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cmi__range-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.cmi__range-num {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.cmi__range-sep {
		width: 1px;
		height: 16px;
		background: rgba(255,255,255,0.1);
	}

	.cmi__single-val {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.cmi__single-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.cmi__single-num {
		font-size: 1.35rem;
		font-weight: 700;
	}

	.cmi__controls {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.cmi__group {
		display: flex;
		flex-direction: column;
		gap: 0px;
	}

	.cmi__nudge-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.cmi__nudge {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.05);
		color: var(--fg);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.cmi__nudge:hover {
		background: rgba(255,255,255,0.1);
		border-color: var(--accent);
	}

	.cmi__nudge:active {
		transform: scale(0.9);
	}

	.cmi__slider-track {
		flex: 1;
		position: relative;
		height: 6px;
		background: rgba(255,255,255,0.1);
		border-radius: 3px;
		overflow: hidden;
	}

	.cmi__slider-fill {
		position: absolute;
		left: 0;
		top: 0;
		height: 100%;
		border-radius: 3px;
		opacity: 0.8;
	}

	.cmi__slider {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		-webkit-appearance: none;
		background: transparent;
		outline: none;
		margin: 0;
		z-index: 2;
	}

	.cmi__slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		border: 2px solid var(--bg-elevated);
	}

	.cmi__modes {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		padding-top: 10px;
	}

	.cmi__mode-btn {
		height: 40px;
		border-radius: 12px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.03);
		color: var(--fg-muted);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: capitalize;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cmi__mode-btn--active {
		background: color-mix(in srgb, var(--active-color, var(--accent)) 15%, transparent);
		border-color: var(--active-color, var(--accent));
		color: var(--active-color, var(--accent));
	}
</style>
