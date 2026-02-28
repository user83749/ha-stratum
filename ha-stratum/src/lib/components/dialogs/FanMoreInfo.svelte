<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { fanService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity    = $derived($optimisticEntities[entityId] ?? null);
	const isOn      = $derived(entity?.state === 'on');
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const isDemo    = $derived(browser ? isDemoMode() : false);

	// ─── Attributes ───────────────────────────────────────────────────────────

	const percentage   = $derived(entity?.attributes.percentage as number | undefined);
	const presetMode   = $derived(entity?.attributes.preset_mode as string | undefined);
	const presetModes  = $derived((entity?.attributes.preset_modes as string[] | undefined) ?? []);
	const oscillating  = $derived((entity?.attributes.oscillating as boolean | undefined) ?? false);
	const direction    = $derived(entity?.attributes.direction as 'forward' | 'reverse' | undefined);
	const supportedFeat    = $derived((entity?.attributes.supported_features as number) ?? 0);
	const supportsSpeed    = $derived((supportedFeat & 1) !== 0);
	const supportsOscillate= $derived((supportedFeat & 2) !== 0);
	const supportsDirection= $derived((supportedFeat & 4) !== 0);
	const supportsPreset   = $derived((supportedFeat & 8) !== 0);

	// ─── Local speed ──────────────────────────────────────────────────────────

	let localPct = $state(50);
	$effect(() => { if (percentage !== undefined) localPct = percentage; });

	const spinDuration = $derived(isOn ? `${(3 / Math.max((localPct || 50) / 100, 0.1)).toFixed(1)}s` : '8s');

	let speedDebounce: ReturnType<typeof setTimeout> | null = null;
	function onSpeedInput(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value);
		localPct = v;
	}
	function onSpeedCommit(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value);
		localPct = v;
		if (speedDebounce) clearTimeout(speedDebounce);
		if (isDemo) applyPatch(entityId, { attributes: { percentage: v } });
		else fanService.setPercentage(entityId, v).catch(() => {});
	}

	// ─── Toggle ───────────────────────────────────────────────────────────────

	let toggling = $state(false);
	async function toggle() {
		if (toggling || isUnavail) return;
		if (isDemo) { applyPatch(entityId, { state: isOn ? 'off' : 'on' }); return; }
		toggling = true;
		try { if (isOn) await fanService.turnOff(entityId); else await fanService.turnOn(entityId); }
		catch { /* silent */ }
		toggling = false;
	}

	function oscillate() {
		if (isUnavail) return;
		if (isDemo) { applyPatch(entityId, { attributes: { oscillating: !oscillating } }); return; }
		fanService.oscillate(entityId, !oscillating).catch(() => {});
	}

	function toggleDirection() {
		if (isUnavail) return;
		const next = direction === 'reverse' ? 'forward' : 'reverse';
		if (isDemo) { applyPatch(entityId, { attributes: { direction: next } }); return; }
		fanService.setDirection(entityId, next).catch(() => {});
	}

	function setPreset(mode: string) {
		if (isUnavail) return;
		if (isDemo) { applyPatch(entityId, { attributes: { preset_mode: mode } }); return; }
		fanService.setPresetMode(entityId, mode).catch(() => {});
	}
</script>

<div class="fmi">

	<!-- ── Hero: spinning fan + speed % + toggle ─────────────────────────── -->
	<div class="fmi__hero" class:fmi__hero--on={isOn}>
		<div class="fmi__fan-wrap">
			<span
				class="fmi__fan-icon"
				class:fmi__fan-icon--spinning={isOn}
				style="animation-duration: {spinDuration};"
			>
				<Icon name="fan" size={48} />
			</span>
		</div>

		<div class="fmi__hero-info">
			<div class="fmi__speed-label" class:fmi__speed-label--on={isOn}>
				{#if isUnavail}
					Unavailable
				{:else if isOn}
					{#if percentage !== undefined}{localPct}%{:else if presetMode}{presetMode}{:else}On{/if}
				{:else}
					Off
				{/if}
			</div>
			<div class="fmi__status">{isOn ? 'Running' : 'Stopped'}</div>
		</div>

		<button
			class="fmi__toggle" class:fmi__toggle--on={isOn}
			onclick={toggle} disabled={toggling || isUnavail}
			aria-label={isOn ? 'Turn off' : 'Turn on'} aria-pressed={isOn}
		>
			{#if toggling}<span class="fmi__spin"></span>
			{:else}<Icon name="power" size={22} />{/if}
		</button>
	</div>

	<!-- ── Speed slider ───────────────────────────────────────────────────── -->
	{#if supportsSpeed}
		<div class="fmi__row" class:fmi__row--disabled={!isOn || isUnavail}>
			<Icon name="wind" size={16} />
			<input
				type="range" min="0" max="100" step="1"
				value={localPct}
				oninput={onSpeedInput}
				onchange={onSpeedCommit}
				disabled={!isOn || isUnavail}
				class="fmi__slider"
				style="--fill: {localPct}%;"
				aria-label="Fan speed"
			/>
			<span class="fmi__val">{localPct}%</span>
		</div>
	{/if}

	<!-- ── Preset modes ────────────────────────────────────────────────────── -->
	{#if supportsPreset && presetModes.length > 0}
		<div class="fmi__section" class:fmi__section--disabled={!isOn || isUnavail}>
			<div class="fmi__section-label">Mode</div>
			<div class="fmi__pills">
				{#each presetModes as mode (mode)}
					<button
						class="fmi__pill"
						class:fmi__pill--active={presetMode === mode}
						onclick={() => setPreset(mode)}
						disabled={!isOn || isUnavail}
						aria-pressed={presetMode === mode}
					>
						{mode.replace(/_/g, ' ')}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- ── Oscillate + Direction ──────────────────────────────────────────── -->
	{#if supportsOscillate || supportsDirection}
		<div class="fmi__section" class:fmi__section--disabled={!isOn || isUnavail}>
			<div class="fmi__section-label">Controls</div>
			<div class="fmi__pills">
				{#if supportsOscillate}
					<button
						class="fmi__pill fmi__pill--icon"
						class:fmi__pill--active={oscillating}
						onclick={oscillate}
						disabled={!isOn || isUnavail}
						aria-pressed={oscillating}
					>
						<Icon name="rotate-ccw" size={14} />
						Oscillate
					</button>
				{/if}
				{#if supportsDirection}
					<button
						class="fmi__pill fmi__pill--icon"
						class:fmi__pill--active={direction === 'reverse'}
						onclick={toggleDirection}
						disabled={!isOn || isUnavail}
					>
						<Icon name={direction === 'reverse' ? 'rotate-ccw' : 'rotate-cw'} size={14} />
						{direction === 'reverse' ? 'Reverse' : 'Forward'}
					</button>
				{/if}
			</div>
		</div>
	{/if}

</div>

<style>
	.fmi {
		display: flex;
		flex-direction: column;
	}

	/* ── Hero ───────────────────────────────────────────────────────────────── */
	.fmi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 24px 20px 20px;
		border-bottom: 1px solid var(--border);
	}

	.fmi__fan-wrap {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--hover);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--fg-subtle);
		transition: background var(--transition), color var(--transition),
			border-color var(--transition), box-shadow var(--transition);
	}
	.fmi__hero--on .fmi__fan-wrap {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
		box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 20%, transparent);
	}

	@keyframes fan-spin { to { transform: rotate(360deg); } }
	.fmi__fan-icon {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.fmi__fan-icon--spinning {
		animation: fan-spin var(--spin-duration, 3s) linear infinite;
	}

	.fmi__hero-info { flex: 1; min-width: 0; }

	.fmi__speed-label {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--fg-subtle);
		line-height: 1;
		font-variant-numeric: tabular-nums;
		transition: color var(--transition);
	}
	.fmi__speed-label--on { color: var(--accent); }

	.fmi__status {
		font-size: 0.8rem;
		color: var(--fg-subtle);
		margin-top: 4px;
	}

	/* ── Toggle ─────────────────────────────────────────────────────────────── */
	.fmi__toggle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1.5px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		cursor: pointer;
		transition: background var(--transition), color var(--transition),
			border-color var(--transition), box-shadow var(--transition);
	}
	.fmi__toggle:hover:not(:disabled) { background: var(--active); color: var(--fg); }
	.fmi__toggle--on {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border-color: color-mix(in srgb, var(--color-on) 30%, transparent);
		box-shadow: 0 0 16px color-mix(in srgb, var(--color-on) 20%, transparent);
	}
	.fmi__toggle--on:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-on) 22%, transparent);
	}
	.fmi__toggle:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── Speed row ──────────────────────────────────────────────────────────── */
	.fmi__row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px;
		border-bottom: 1px solid var(--border);
		color: var(--fg-subtle);
		transition: opacity var(--transition);
	}
	.fmi__row--disabled { opacity: 0.35; pointer-events: none; }

	.fmi__slider {
		-webkit-appearance: none;
		appearance: none;
		flex: 1;
		height: 5px;
		border-radius: 999px;
		outline: none;
		cursor: pointer;
		background: linear-gradient(
			to right,
			var(--accent) var(--fill, 50%),
			var(--border-strong) var(--fill, 50%)
		);
	}
	.fmi__slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px; height: 18px;
		border-radius: 50%;
		background: var(--thumb-bg);
		border: 2px solid var(--border-strong);
		box-shadow: var(--shadow);
		cursor: pointer;
		transition: border-color var(--transition), box-shadow var(--transition);
	}
	.fmi__slider::-webkit-slider-thumb:hover {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
	}
	.fmi__slider::-moz-range-thumb {
		width: 18px; height: 18px;
		border-radius: 50%;
		background: var(--thumb-bg);
		border: 2px solid var(--border-strong);
		box-shadow: var(--shadow);
		cursor: pointer;
	}

	.fmi__val {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
		min-width: 3ch;
		text-align: right;
	}

	/* ── Sections (presets, controls) ───────────────────────────────────────── */
	.fmi__section {
		padding: 14px 20px;
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: opacity var(--transition);
	}
	.fmi__section--disabled { opacity: 0.35; pointer-events: none; }

	.fmi__section-label {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.fmi__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.fmi__pill {
		padding: 7px 14px;
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: capitalize;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: background var(--transition), color var(--transition), border-color var(--transition);
	}
	.fmi__pill:hover:not(:disabled) { background: var(--active); color: var(--fg); }
	.fmi__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}
	.fmi__pill:disabled { opacity: 0.4; cursor: not-allowed; }
	.fmi__pill--icon {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	/* ── Spinner ────────────────────────────────────────────────────────────── */
	.fmi__spin {
		display: inline-block;
		width: 20px; height: 20px;
		border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
