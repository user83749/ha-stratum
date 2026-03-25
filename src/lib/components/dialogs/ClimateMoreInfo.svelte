<script lang="ts">
	// ── ClimateMoreInfo ───────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { climateService } from '$lib/ha/services';
	import Icon from '$lib/components/ui/Icon.svelte';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	// ── Derived State ─────────────────────────────────────────────────────────
	function finiteNumber(value: unknown): number | undefined {
		return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
	}

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const optimisticPreviewEnabled = false;
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const hvacMode = $derived((entity?.state as string | undefined) ?? 'off');
	const hvacModes = $derived((entity?.attributes.hvac_modes as string[] | undefined) ?? []);
	const fanModes = $derived((entity?.attributes.fan_modes as string[] | undefined) ?? []);
	const presetModes = $derived((entity?.attributes.preset_modes as string[] | undefined) ?? []);
	const fanMode = $derived((entity?.attributes.fan_mode as string | undefined) ?? '');
	const presetMode = $derived((entity?.attributes.preset_mode as string | undefined) ?? '');
	const currentTemp = $derived(finiteNumber(entity?.attributes.current_temperature));
	const currentHumidity = $derived(finiteNumber(entity?.attributes.current_humidity));
	const targetTemp = $derived(finiteNumber(entity?.attributes.temperature));
	const targetTempLow = $derived(finiteNumber(entity?.attributes.target_temp_low));
	const targetTempHigh = $derived(finiteNumber(entity?.attributes.target_temp_high));
	const minTemp = $derived((entity?.attributes.min_temp as number | undefined) ?? 55);
	const maxTemp = $derived((entity?.attributes.max_temp as number | undefined) ?? 85);
	const tempRangeSpan = $derived(Math.max(1, maxTemp - minTemp));
	const supportedFeatures = $derived((entity?.attributes.supported_features as number | undefined) ?? 0);
	const SUPPORT_TARGET_TEMPERATURE = 1;
	const SUPPORT_TARGET_TEMPERATURE_RANGE = 2;
	// Product requirement: climate nudges/sliders use fixed 1-step increments.
	const tempStep = 1;
	const tempUnit = $derived((entity?.attributes.temperature_unit as string | undefined) ?? '°');
	const hvacAction = $derived((entity?.attributes.hvac_action as string | undefined) ?? '');
	const supportsHeatCool = $derived(
		hvacMode === 'heat_cool' || hvacModes.includes('heat_cool')
	);
	const supportsRange = $derived(
		hvacMode === 'heat_cool' && supportsHeatCool && targetTempLow !== undefined && targetTempHigh !== undefined
	);
	const supportsSingleTarget = $derived(
		((supportedFeatures & SUPPORT_TARGET_TEMPERATURE) !== 0) ||
		((supportedFeatures & SUPPORT_TARGET_TEMPERATURE_RANGE) !== 0) ||
		targetTemp !== undefined
	);
	const hasValidSingleTarget = $derived(targetTemp !== undefined);
	const canAdjustTemperature = $derived(
		!isUnavail && hvacMode !== 'off' && (supportsRange || supportsSingleTarget)
	);

	// ── Local State ───────────────────────────────────────────────────────────
	let localTemp = $state(72);
	let localTempLow = $state(68);
	let localTempHigh = $state(76);
	let settingFan = $state(false);
	let settingPreset = $state(false);

	$effect(() => {
		if (targetTemp !== undefined) localTemp = targetTemp;
		else localTemp = Math.round((minTemp + maxTemp) / 2);
	});
	$effect(() => {
		if (targetTempLow !== undefined) localTempLow = targetTempLow;
		else localTempLow = minTemp;
	});
	$effect(() => {
		if (targetTempHigh !== undefined) localTempHigh = targetTempHigh;
		else localTempHigh = maxTemp;
	});
	$effect(() => {
		return () => {
			if (tempDebounce) clearTimeout(tempDebounce);
			if (rangeDebounce) clearTimeout(rangeDebounce);
		};
	});

	// ── Temperature Controls ──────────────────────────────────────────────────
	let tempDebounce: ReturnType<typeof setTimeout> | null = null;
	function onTempInput(next: number) {
		if (!canAdjustTemperature) return;
		localTemp = next;
		applyPatch(entityId, { attributes: { temperature: next } });
		if (tempDebounce) clearTimeout(tempDebounce);
		tempDebounce = setTimeout(() => {
			climateService.setTemperature(entityId, next).catch(() => {});
		}, 150);
	}

	let rangeDebounce: ReturnType<typeof setTimeout> | null = null;
	function onRangeInput(kind: 'low' | 'high', next: number) {
		if (!canAdjustTemperature) return;
		if (kind === 'low') localTempLow = next;
		else localTempHigh = next;
		const low = kind === 'low' ? next : localTempLow;
		const high = kind === 'high' ? next : localTempHigh;
		applyPatch(entityId, { attributes: { target_temp_low: low, target_temp_high: high } });
		if (rangeDebounce) clearTimeout(rangeDebounce);
		rangeDebounce = setTimeout(() => {
			climateService.setTargetTempRange(entityId, low, high).catch(() => {});
		}, 150);
	}

	let settingMode = $state(false);
	async function setMode(mode: string) {
		if (isUnavail) return;
		if (settingMode) return;
		if (optimisticPreviewEnabled) {
			applyPatch(entityId, { state: mode });
			return;
		}
		settingMode = true;
		try {
			if (mode === 'off') {
				try {
					await climateService.turnOff(entityId);
				} catch {
					// Some integrations only support set_hvac_mode=off
					await climateService.setHvacMode(entityId, 'off');
				}
				return;
			}

			// Some integrations need turn_on before accepting hvac mode changes from off.
			if (hvacMode === 'off') {
				try { await climateService.turnOn(entityId); } catch { /* no-op */ }
			}
			await climateService.setHvacMode(entityId, mode as any);
		} catch {
			// no-op
		} finally {
			settingMode = false;
		}
	}

	function nudgeSingle(dir: 1 | -1) {
		if (!canAdjustTemperature) return;
		const next = Math.min(maxTemp, Math.max(minTemp, localTemp + dir * tempStep));
		onTempInput(next);
	}

	function nudgeRange(kind: 'low' | 'high', dir: 1 | -1) {
		if (!canAdjustTemperature) return;
		const next = kind === 'low'
			? Math.min(localTempHigh - 1, Math.max(minTemp, localTempLow + dir * tempStep))
			: Math.max(localTempLow + 1, Math.min(maxTemp, localTempHigh + dir * tempStep));
		onRangeInput(kind, next);
	}

	async function setFan(nextMode: string) {
		if (isUnavail || settingFan || !nextMode || fanMode === nextMode) return;
		settingFan = true;
		try {
			await climateService.setFanMode(entityId, nextMode);
		} catch {
			// no-op
		} finally {
			settingFan = false;
		}
	}

	async function setPreset(nextPreset: string) {
		if (isUnavail || settingPreset || !nextPreset || presetMode === nextPreset) return;
		settingPreset = true;
		try {
			await climateService.setPresetMode(entityId, nextPreset);
		} catch {
			// no-op
		} finally {
			settingPreset = false;
		}
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
								<span class="cmi__single-num" style="color: {actionColor}">
									{#if hasValidSingleTarget}{localTemp}{tempUnit}{:else}—{/if}
								</span>
							</div>
						{/if}
					</div>
			</div>

			<div class="cmi__controls">
				{#if supportsRange}
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent)" onclick={() => nudgeRange('low', -1)} disabled={!canAdjustTemperature}>
								<Icon name="minus" size={16} />
							</button>
								<div class="cmi__slider-track">
									<div class="cmi__slider-fill" style="width: {((localTempLow - minTemp) / tempRangeSpan) * 100}%; background: var(--color-warning)"></div>
									<input 
										type="range" class="cmi__slider" 
										min={minTemp} max={maxTemp} step={tempStep} 
										value={localTempLow} oninput={(e) => onRangeInput('low', Number(e.currentTarget.value))}
										disabled={!canAdjustTemperature}
									/>
								</div>
							<button class="cmi__nudge" style="color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 30%, transparent)" onclick={() => nudgeRange('low', 1)} disabled={!canAdjustTemperature}>
								<Icon name="plus" size={16} />
							</button>
						</div>
					</div>
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: var(--color-info); border-color: color-mix(in srgb, var(--color-info) 30%, transparent)" onclick={() => nudgeRange('high', -1)} disabled={!canAdjustTemperature}>
								<Icon name="minus" size={16} />
							</button>
								<div class="cmi__slider-track">
									<div class="cmi__slider-fill" style="width: {((localTempHigh - minTemp) / tempRangeSpan) * 100}%; background: var(--color-info)"></div>
									<input 
										type="range" class="cmi__slider" 
										min={minTemp} max={maxTemp} step={tempStep} 
										value={localTempHigh} oninput={(e) => onRangeInput('high', Number(e.currentTarget.value))}
										disabled={!canAdjustTemperature}
									/>
								</div>
							<button class="cmi__nudge" style="color: var(--color-info); border-color: color-mix(in srgb, var(--color-info) 30%, transparent)" onclick={() => nudgeRange('high', 1)} disabled={!canAdjustTemperature}>
								<Icon name="plus" size={16} />
							</button>
						</div>
					</div>
				{:else}
					<div class="cmi__group">
						<div class="cmi__nudge-row">
							<button class="cmi__nudge" style="color: {actionColor}; border-color: color-mix(in srgb, {actionColor} 30%, transparent)" onclick={() => nudgeSingle(-1)} disabled={!canAdjustTemperature}>
								<Icon name="minus" size={18} />
							</button>
							<div class="cmi__slider-track">
								<div class="cmi__slider-fill" style="width: {((localTemp - minTemp) / tempRangeSpan) * 100}%; background: {actionColor}"></div>
								<input 
									type="range" class="cmi__slider" 
									min={minTemp} max={maxTemp} step={tempStep} 
									value={localTemp} oninput={(e) => onTempInput(Number(e.currentTarget.value))}
									disabled={!canAdjustTemperature}
								/>
							</div>
							<button class="cmi__nudge" style="color: {actionColor}; border-color: color-mix(in srgb, {actionColor} 30%, transparent)" onclick={() => nudgeSingle(1)} disabled={!canAdjustTemperature}>
								<Icon name="plus" size={18} />
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>

		{#if hvacModes.length > 0}
			<div class="cmi__modes">
				{#each [...new Set(hvacModes)] as mode (mode)}
					<button 
						class="cmi__mode-btn" 
						class:cmi__mode-btn--active={hvacMode === mode} 
						style={hvacMode === mode ? `--active-color: ${actionColor}` : ''}
						disabled={isUnavail || settingMode}
						onclick={() => setMode(mode)}
					>
						<span class="cmi__mode-label">{mode.replace(/_/g, ' ')}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if fanModes.length > 0}
			<div class="cmi__subhead">Fan Mode</div>
			<div class="cmi__options">
				{#each [...new Set(fanModes)] as mode (mode)}
					<button
						class="cmi__chip"
						class:cmi__chip--active={fanMode === mode}
						disabled={isUnavail || settingFan}
						onclick={() => setFan(mode)}
					>
						{mode.replace(/_/g, ' ')}
					</button>
				{/each}
			</div>
		{/if}

		{#if presetModes.length > 0}
			<div class="cmi__subhead">Preset</div>
			<div class="cmi__options">
				{#each [...new Set(presetModes)] as mode (mode)}
					<button
						class="cmi__chip"
						class:cmi__chip--active={presetMode === mode}
						disabled={isUnavail || settingPreset}
						onclick={() => setPreset(mode)}
					>
						{mode.replace(/_/g, ' ')}
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
		border-radius: var(--dialog-radius);
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
		border-radius: var(--dialog-radius);
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
		border-radius: var(--dialog-radius);
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

	.cmi__nudge:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		transform: none;
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
			appearance: none;
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

	.cmi__slider:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.cmi__modes {
		/* Use flex so incomplete rows (e.g., 2 modes) can be centered */
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		padding-top: 10px;
	}

	.cmi__mode-btn {
		/* Keep the “3 across” feel, but allow centering when fewer than 3 */
		flex: 0 1 calc((100% - 16px) / 3);
		height: 40px;
		border-radius: var(--dialog-radius);
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

	.cmi__subhead {
		margin-top: 4px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	.cmi__options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.cmi__chip {
		height: 34px;
		padding: 0 12px;
		border-radius: var(--dialog-radius);
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.03);
		color: var(--fg-muted);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: capitalize;
	}

	.cmi__chip--active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 65%, transparent);
		background: color-mix(in srgb, var(--accent) 16%, transparent);
	}

	.cmi__chip:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
