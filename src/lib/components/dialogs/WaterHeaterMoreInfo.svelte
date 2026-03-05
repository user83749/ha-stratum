<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { waterHeaterService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { clamp } from '$lib/utils/format';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	
	const __state = $derived((entity?.state as string | undefined) ?? 'off');
	const isOn = $derived(__state !== 'off');
	
	const temp = $derived((entity?.attributes.temperature as number | undefined) ?? 120);
	const currentTemp = $derived((entity?.attributes.current_temperature as number | undefined) ?? 115);
	const minTemp = $derived((entity?.attributes.min_temp as number | undefined) ?? 90);
	const maxTemp = $derived((entity?.attributes.max_temp as number | undefined) ?? 140);
	const unit = $derived((entity?.attributes.temperature_unit as string | undefined) ?? '°');
	
	const modes = $derived((entity?.attributes.operation_list as string[] | undefined) ?? []);
	const currentMode = $derived(
		(entity?.attributes.operation_mode as string | undefined) ??
		(entity?.attributes.current_operation as string | undefined)
	);

	let localTemp = $state(120);
	let dragging = $state(false);
	$effect(() => { if (!dragging) localTemp = temp; });

	const displayTemp = $derived(dragging ? localTemp : temp);
	const ringPct = $derived(
		maxTemp > minTemp 
			? clamp(Math.round(((displayTemp - minTemp) / (maxTemp - minTemp)) * 100), 0, 100)
			: 0
	);

	function onInput(e: Event) {
		dragging = true;
		localTemp = Number((e.target as HTMLInputElement).value);
	}

	function onChange(e: Event) {
		dragging = false;
		const next = Number((e.target as HTMLInputElement).value);
		if (isDemo) {
			applyPatch(entityId, { attributes: { temperature: next } });
		} else {
			waterHeaterService.setTemperature(entityId, next).catch(() => {});
		}
	}

	function toggle() {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { state: isOn ? 'off' : 'on' });
		else (isOn ? waterHeaterService.turnOff(entityId) : waterHeaterService.turnOn(entityId)).catch(() => {});
	}

	function setMode(next: string) {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { attributes: { operation_mode: next } });
		else waterHeaterService.setOperationMode(entityId, next).catch(() => {});
	}
</script>

<div class="whmi">
	<div class="whmi__header">
		<div class="whmi__icon-wrap" class:whmi__icon-wrap--active={isOn}>
			<Icon name="flame" size={24} />
		</div>
		<div class="whmi__titles">
			<h2 class="whmi__title">{entity?.attributes.friendly_name ?? 'Water Heater'}</h2>
			<span class="whmi__subtitle">{currentMode ?? (isOn ? 'Heating' : 'Off')}</span>
		</div>
		<button class="whmi__power-btn" class:whmi__power-btn--active={isOn} onclick={toggle} disabled={isUnavail}>
			<Icon name="power" size={18} />
		</button>
	</div>

	<div class="whmi__body">
		<div class="whmi__main-control">
			<div class="whmi__dial">
				<svg viewBox="0 0 100 100" class="whmi__dial-svg">
					<circle cx="50" cy="50" r="45" class="whmi__dial-track" />
					<circle 
						cx="50" cy="50" r="45" 
						class="whmi__dial-fill"
						style="stroke-dasharray: 282.7; stroke-dashoffset: {282.7 - (ringPct / 100) * 282.7}"
					/>
				</svg>
				<div class="whmi__dial-content">
					<div class="whmi__temp-display">
						<span class="whmi__target-val">{Math.round(displayTemp)}</span>
						<span class="whmi__target-unit">{unit}</span>
					</div>
					<span class="whmi__dial-label">Target Temp</span>
				</div>
				<input 
					type="range" min={minTemp} max={maxTemp} step="1" 
					value={displayTemp}
					oninput={onInput}
					onchange={onChange}
					disabled={!isOn || isUnavail}
					class="whmi__dial-input"
				/>
			</div>

			<div class="whmi__stats">
				<div class="whmi__stat">
					<span class="whmi__stat-label">Actual</span>
					<span class="whmi__stat-val">{currentTemp}{unit}</span>
				</div>
				<div class="whmi__stat">
					<span class="whmi__stat-label">Unit</span>
					<span class="whmi__stat-val">{unit === '°F' ? 'Fahrenheit' : 'Celsius'}</span>
				</div>
			</div>
		</div>

		{#if modes.length > 0}
			<div class="whmi__section">
				<h3 class="whmi__section-title">Operation Mode</h3>
				<div class="whmi__pills">
					{#each modes as m}
						<button 
							class="whmi__pill" 
							class:whmi__pill--active={currentMode === m}
							onclick={() => setMode(m)}
							disabled={!isOn || isUnavail}
						>
							{m.replace(/_/g, ' ')}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="whmi__meta">
			<div class="whmi__meta-row">
				<span class="whmi__meta-key">Entity ID</span>
				<span class="whmi__meta-val">{entityId}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.whmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 560px;
		color: var(--fg);
	}

	.whmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		border-bottom: 1px solid var(--border);
	}

	.whmi__icon-wrap {
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

	.whmi__icon-wrap--active {
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		color: var(--color-warning);
		border-color: color-mix(in srgb, var(--color-warning) 25%, transparent);
	}

	.whmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-left: 16px;
	}

	.whmi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.whmi__subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
		text-transform: capitalize;
	}

	.whmi__power-btn {
		all: unset;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--hover);
		color: var(--fg-muted);
		border: 1px solid var(--border);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.whmi__power-btn--active {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border-color: color-mix(in srgb, var(--color-on) 30%, transparent);
	}

	.whmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.whmi__main-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.whmi__dial {
		position: relative;
		width: 220px;
		height: 220px;
	}

	.whmi__dial-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.whmi__dial-track {
		fill: none;
		stroke: var(--hover);
		stroke-width: 6;
	}

	.whmi__dial-fill {
		fill: none;
		stroke: var(--color-warning);
		stroke-width: 6;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.1s linear;
	}

	.whmi__dial-content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.whmi__temp-display {
		display: flex;
		align-items: flex-start;
	}

	.whmi__target-val {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.whmi__target-unit {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--fg-subtle);
		margin-top: 6px;
	}

	.whmi__dial-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin-top: 4px;
	}

	.whmi__dial-input {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		margin: 0;
	}

	.whmi__stats {
		display: flex;
		gap: 12px;
		width: 100%;
	}

	.whmi__stat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.whmi__stat-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.whmi__stat-val {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.whmi__section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.whmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.whmi__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.whmi__pill {
		all: unset;
		padding: 8px 16px;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: capitalize;
		background: var(--hover);
		border: 1px solid var(--border);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.whmi__pill--active {
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		color: var(--fg);
		border-color: var(--color-warning);
	}

	.whmi__meta {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: auto;
	}

	.whmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.whmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.whmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
