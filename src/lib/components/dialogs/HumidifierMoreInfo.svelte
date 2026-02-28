<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { humidifierService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { clamp } from '$lib/utils/format';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const isOn = $derived(entity?.state === 'on');
	
	const targetHum = $derived((entity?.attributes.humidity as number | undefined) ?? 50);
	const currentHum = $derived((entity?.attributes.current_humidity as number | undefined) ?? 45);
	const modes = $derived((entity?.attributes.available_modes as string[] | undefined) ?? []);
	const currentMode = $derived(entity?.attributes.mode as string | undefined);

	const minHum = $derived((entity?.attributes.min_humidity as number | undefined) ?? 30);
	const maxHum = $derived((entity?.attributes.max_humidity as number | undefined) ?? 80);

	let localHum = $state(50);
	let dragging = $state(false);
	let dialElement: HTMLElement | null = $state(null);

	$effect(() => { 
		if (!dragging) localHum = targetHum; 
	});

	const displayHum = $derived(dragging ? localHum : targetHum);
	const ringPct = $derived(clamp(((displayHum - minHum) / (maxHum - minHum)) * 100, 0, 100));

	/**
	 * Calculates the humidity value based on the angle of the mouse/touch relative to dial center.
	 */
	function handleGesture(clientX: number, clientY: number) {
		if (!dialElement || !isOn || isUnavail) return;

		const rect = dialElement.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;

		// Calculate angle in radians, offset by -PI/2 to start 0 at 12 o'clock
		let angle = Math.atan2(clientY - cy, clientX - cx) + Math.PI / 2;
		
		// Normalize to 0 -> 2PI
		if (angle < 0) angle += 2 * Math.PI;

		// Convert to 0.0 -> 1.0 percentage
		const pct = angle / (2 * Math.PI);
		
		// Map back to humidity range
		const val = Math.round(minHum + pct * (maxHum - minHum));
		localHum = clamp(val, minHum, maxHum);
		
		dragging = true;
	}

	function onPointerDown(e: PointerEvent) {
		if (!isOn || isUnavail) return;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		handleGesture(e.clientX, e.clientY);
	}

	function onPointerMove(e: PointerEvent) {
		if (dragging) {
			handleGesture(e.clientX, e.clientY);
		}
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;

		const next = localHum;
		if (isDemo) {
			applyPatch(entityId, { attributes: { humidity: next } });
		} else {
			humidifierService.setHumidity(entityId, next).catch(() => {});
		}
	}

	function toggle() {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { state: isOn ? 'off' : 'on' });
		else (isOn ? humidifierService.turnOff(entityId) : humidifierService.turnOn(entityId)).catch(() => {});
	}

	function setMode(next: string) {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { attributes: { mode: next } });
		else humidifierService.setMode(entityId, next).catch(() => {});
	}
</script>

<div class="hmi" class:hmi--unavailable={isUnavail}>
	<div class="hmi__header">
		<div class="hmi__header-left">
			<div class="hmi__icon-wrap" class:hmi__icon-wrap--active={isOn}>
				<Icon name="droplets" size={24} />
			</div>
			<div class="hmi__titles">
				<h2 class="hmi__title">{entity?.attributes.friendly_name ?? 'Humidifier'}</h2>
				<span class="hmi__subtitle" style="color: {isOn ? 'var(--accent)' : 'var(--fg-muted)'}">
					{isOn ? 'Active' : 'Off'}
				</span>
			</div>
		</div>
		<button class="hmi__power-btn" class:hmi__power-btn--active={isOn} onclick={toggle} disabled={isUnavail}>
			<Icon name="power" size={18} />
		</button>
	</div>

	<div class="hmi__body">
		<div class="hmi__main-control">
			<div 
				class="hmi__dial" 
				bind:this={dialElement}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={onPointerUp}
				onpointercancel={onPointerUp}
				style="cursor: {isOn ? 'pointer' : 'default'};"
			>
				<svg viewBox="0 0 100 100" class="hmi__dial-svg">
					<circle cx="50" cy="50" r="44" class="hmi__dial-track" />
					<circle 
						cx="50" cy="50" r="44" 
						class="hmi__dial-fill"
						style="stroke-dasharray: 276.5; stroke-dashoffset: {276.5 - (ringPct / 100) * 276.5}"
					/>
				</svg>
				<div class="hmi__dial-content">
					<span class="hmi__target-val" style="color: {isOn ? 'var(--fg)' : 'var(--fg-muted)'}">
						{Math.round(displayHum)}%
					</span>
					<span class="hmi__dial-label">{isOn ? (dragging ? 'Adjusting' : 'Target') : 'Power Off'}</span>
				</div>
			</div>

			<div class="hmi__stats">
				<div class="hmi__stat">
					<span class="hmi__stat-label">Current Humidity</span>
					<span class="hmi__stat-val">{currentHum}%</span>
				</div>
			</div>
		</div>

		{#if modes.length > 0}
			<div class="hmi__section">
				<h3 class="hmi__section-title">Mode</h3>
				<div class="hmi__pills">
					{#each modes as m}
						<button 
							class="hmi__pill" 
							class:hmi__pill--active={currentMode === m}
							onclick={() => setMode(m)}
							disabled={!isOn || isUnavail}
						>
							{m.replace(/_/g, ' ')}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.hmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 520px;
		color: var(--fg);
		overflow: hidden;
	}

	.hmi--unavailable {
		opacity: 0.5;
		pointer-events: none;
	}

	.hmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 28px;
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}

	.hmi__header-left {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.hmi__icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255,255,255,0.05);
		color: var(--fg-subtle);
		border: 1px solid rgba(255,255,255,0.1);
	}

	.hmi__icon-wrap--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.hmi__titles {
		display: flex;
		flex-direction: column;
		gap: 0px;
	}

	.hmi__title {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
	}

	.hmi__subtitle {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.hmi__power-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255,255,255,0.05);
		color: var(--fg-muted);
		border: 1px solid rgba(255,255,255,0.1);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.hmi__power-btn--active {
		background: rgba(255,255,255,0.1);
		color: white;
		border-color: rgba(255,255,255,0.2);
	}

	.hmi__body {
		padding: 24px 28px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.hmi__main-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.hmi__dial {
		position: relative;
		width: 200px;
		height: 200px;
		user-select: none;
		touch-action: none;
	}

	.hmi__dial-svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.hmi__dial-track {
		fill: none;
		stroke: rgba(255,255,255,0.03);
		stroke-width: 8;
	}

	.hmi__dial-fill {
		fill: none;
		stroke: var(--accent);
		stroke-width: 8;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.1s linear;
	}

	.hmi__dial-content {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.hmi__target-val {
		font-size: 3.5rem;
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.hmi__dial-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--fg-subtle);
		margin-top: 8px;
	}

	.hmi__stats {
		width: 100%;
	}

	.hmi__stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 16px;
		background: rgba(255,255,255,0.03);
		border-radius: 16px;
		border: 1px solid rgba(255,255,255,0.05);
	}

	.hmi__stat-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.hmi__stat-val {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.hmi__section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.hmi__pills {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.hmi__pill {
		height: 40px;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: capitalize;
		background: rgba(255,255,255,0.03);
		border: 1px solid rgba(255,255,255,0.05);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hmi__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: var(--accent);
	}

	.hmi__pill:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
