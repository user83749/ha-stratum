<script lang="ts">
	// ── FanMoreInfo ───────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { fanService } from '$lib/ha/services';
	import Icon from '$lib/components/ui/Icon.svelte';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity    = $derived($optimisticEntities[entityId] ?? null);
	const isOn      = $derived(entity?.state === 'on');
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const optimisticPreviewEnabled = false;

	// ── Attributes ────────────────────────────────────────────────────────────

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

	// ── Local Speed ───────────────────────────────────────────────────────────

	let localPct = $state(50);
	$effect(() => { if (percentage !== undefined) localPct = percentage; });

	const spinDuration = $derived.by(() => {
		const pct = percentage ?? localPct ?? 50;
		const norm = Math.max(pct / 100, 0.1);
		return isOn ? `${(3 / norm).toFixed(2)}s` : '8s';
	});

	let speedDebounce: ReturnType<typeof setTimeout> | null = null;
	function commitSpeed(value: number, immediate = false) {
		if (speedDebounce) clearTimeout(speedDebounce);
		const run = () => {
			if (optimisticPreviewEnabled) applyPatch(entityId, { attributes: { percentage: value } });
			else fanService.setPercentage(entityId, value).catch(() => {});
		};
		if (immediate) {
			run();
			return;
		}
		speedDebounce = setTimeout(run, 120);
	}

	// ── Vertical Speed Dimmer ────────────────────────────────────────────────
	let speedTrackEl = $state<HTMLElement | null>(null);
	let draggingSpeed = $state(false);

	function getSpeedFromPointer(e: PointerEvent): number {
		if (!speedTrackEl) return localPct;
		const rect = speedTrackEl.getBoundingClientRect();
		const relY = e.clientY - rect.top;
		const pct = 1 - Math.max(0, Math.min(1, relY / rect.height));
		return Math.round(pct * 100);
	}

	function onSpeedTrackPointerDown(e: PointerEvent) {
		if (!isOn || isUnavail) return;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		draggingSpeed = true;
		const v = getSpeedFromPointer(e);
		localPct = v;
		commitSpeed(v, false);
	}

	function onSpeedTrackPointerMove(e: PointerEvent) {
		if (!draggingSpeed) return;
		const v = getSpeedFromPointer(e);
		localPct = v;
		commitSpeed(v, false);
	}

	function onSpeedTrackPointerUp(e: PointerEvent) {
		if (!draggingSpeed) return;
		draggingSpeed = false;
		const v = getSpeedFromPointer(e);
		localPct = v;
		commitSpeed(v, true);
	}

	// ── Toggle ────────────────────────────────────────────────────────────────

	let toggling = $state(false);
	async function toggle() {
		if (toggling || isUnavail) return;
		if (optimisticPreviewEnabled) { applyPatch(entityId, { state: isOn ? 'off' : 'on' }); return; }
		toggling = true;
		try { if (isOn) await fanService.turnOff(entityId); else await fanService.turnOn(entityId); }
		catch { /* silent */ }
		toggling = false;
	}

	function oscillate() {
		if (isUnavail) return;
		if (optimisticPreviewEnabled) { applyPatch(entityId, { attributes: { oscillating: !oscillating } }); return; }
		fanService.oscillate(entityId, !oscillating).catch(() => {});
	}

	function toggleDirection() {
		if (isUnavail) return;
		const next = direction === 'reverse' ? 'forward' : 'reverse';
		if (optimisticPreviewEnabled) { applyPatch(entityId, { attributes: { direction: next } }); return; }
		fanService.setDirection(entityId, next).catch(() => {});
	}

	function setPreset(mode: string) {
		if (isUnavail) return;
		if (optimisticPreviewEnabled) { applyPatch(entityId, { attributes: { preset_mode: mode } }); return; }
		fanService.setPresetMode(entityId, mode).catch(() => {});
	}
</script>

<div class="fmi">

	<!-- ── Hero: spinning fan + speed % + toggle ─────────────────────────── -->
	<div class="fmi__hero" class:fmi__hero--on={isOn}>
		<div class="fmi__fan-wrap">
			<span class="fmi__fan-icon">
				<span class="fmi__fan-blade" class:fmi__fan-blade--spinning={isOn} style="animation-duration: {spinDuration};">
					<Icon name="fan" size={48} />
				</span>
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
		<div class="fmi__speed-stage">
			<div
				class="fmi__dimmer"
				class:fmi__dimmer--on={isOn}
				class:fmi__dimmer--disabled={!isOn || isUnavail}
				style="--fill: {isOn ? localPct : 0}%"
				bind:this={speedTrackEl}
				onpointerdown={onSpeedTrackPointerDown}
				onpointermove={onSpeedTrackPointerMove}
				onpointerup={onSpeedTrackPointerUp}
				onpointercancel={onSpeedTrackPointerUp}
				role="slider"
				aria-label="Fan speed"
				aria-valuenow={localPct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-disabled={!isOn || isUnavail}
				tabindex={isOn && !isUnavail ? 0 : -1}
				data-no-sheet-drag
			>
				<div class="fmi__dimmer-fill" style="height: {isOn ? localPct : 0}%;"></div>
				<div class="fmi__dimmer-icon">
					<Icon name="wind" size={26} />
				</div>
			</div>
		</div>
	{/if}

	<!-- ── Combined Attributes ─────────────────────────────────────────────── -->
	{#if (supportsPreset && presetModes.length > 0) || supportsOscillate || supportsDirection}
		<div class="fmi__section" class:fmi__section--disabled={!isOn || isUnavail}>
			<div class="fmi__pills">
				{#if supportsPreset && presetModes.length > 0}
					{#each [...new Set(presetModes)] as mode (mode)}
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
				{/if}
				{#if supportsOscillate}
					<button
						class="fmi__pill fmi__pill--icon"
						class:fmi__pill--active={oscillating}
						onclick={oscillate}
						disabled={!isOn || isUnavail}
						aria-pressed={oscillating}
					>
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
		height: 100%;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* ── Hero ───────────────────────────────────────────────────────────────── */
	.fmi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 20px 16px;
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		line-height: 0;
		transform-origin: 50% 50%;
	}

	.fmi__fan-blade {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		transform-origin: 50% 50%;
	}
	.fmi__fan-blade--spinning {
		animation: fan-spin var(--spin-duration, 3s) linear infinite;
	}
	.fmi__fan-icon :global(svg),
	.fmi__fan-icon :global(.icon) {
		width: 100%;
		height: 100%;
		display: block;
		transform-origin: 50% 50%;
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

	/* ── Vertical Speed Dimmer ──────────────────────────────────────────────── */
	.fmi__speed-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 20px 20px 12px;
		flex: 1;
		min-height: 0;
	}
	.fmi__dimmer {
		position: relative;
		width: 92px;
		height: clamp(200px, 40vh, 340px);
		border-radius: var(--dialog-radius);
		background: var(--active);
		border: 1.5px solid var(--border);
		overflow: hidden;
		cursor: ns-resize;
		touch-action: none;
		user-select: none;
		transition: border-color var(--transition);
	}
	.fmi__dimmer--disabled {
		opacity: 0.35;
		cursor: not-allowed;
		pointer-events: none;
	}
	.fmi__dimmer--on {
		border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.fmi__dimmer-fill {
		position: absolute;
		bottom: 0;
		left: -1px;
		right: -1px;
		width: calc(100% + 2px);
		background: var(--accent);
		opacity: 0.85;
		border-radius: 0 0 calc(var(--dialog-radius) - 1px) calc(var(--dialog-radius) - 1px);
		transition: height 0.08s ease;
		min-height: 0;
	}
	.fmi__dimmer-icon {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: color-mix(in srgb, var(--fg-subtle) 35%, transparent);
		pointer-events: none;
		z-index: 1;
	}
	/* ── Sections (presets, controls) ───────────────────────────────────────── */
	.fmi__section {
		padding: 14px 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: opacity var(--transition);
	}
	.fmi__section--disabled { opacity: 0.35; pointer-events: none; }

	.fmi__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
	}

	.fmi__pill {
		padding: 7px 14px;
		border-radius: 999px;
		font-size: 0.875rem;
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
