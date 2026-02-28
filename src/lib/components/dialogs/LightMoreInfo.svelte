<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { lightService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity    = $derived($optimisticEntities[entityId] ?? null);
	const isOn      = $derived(entity?.state === 'on');
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const isDemo    = $derived(browser ? isDemoMode() : false);

	// ─── Brightness ───────────────────────────────────────────────────────────

	const brightnessPct = $derived(Math.round(((entity?.attributes.brightness as number | undefined) ?? 0) / 255 * 100));
	let localBrightness = $state(50);
	$effect(() => { localBrightness = brightnessPct; });

	let bDebounce: ReturnType<typeof setTimeout> | null = null;
	function onBrightnessInput(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value);
		localBrightness = v;
		if (bDebounce) clearTimeout(bDebounce);
		bDebounce = setTimeout(() => {
			if (isDemo) applyPatch(entityId, { state: 'on', attributes: { brightness: Math.round(v / 100 * 255) } });
			else lightService.setBrightness(entityId, v).catch(() => {});
		}, 120);
	}

	// ─── Color (RGB) ──────────────────────────────────────────────────────────

	const supportsColor = $derived(
		Array.isArray(entity?.attributes.supported_color_modes)
			? (entity.attributes.supported_color_modes as string[]).some((m) =>
				['rgb', 'hs', 'rgbw', 'rgbww', 'xy'].includes(m))
			: false
	);

	const rgb = $derived(entity?.attributes.rgb_color as [number, number, number] | undefined);

	function rgbToHex(r: number, g: number, b: number): string {
		return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
	}
	function hueToRgb(hue: number): [number, number, number] {
		const h = ((hue % 360) + 360) % 360;
		const c = 1;
		const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const [r1, g1, b1] =
			h < 60 ? [c, x, 0] :
			h < 120 ? [x, c, 0] :
			h < 180 ? [0, c, x] :
			h < 240 ? [0, x, c] :
			h < 300 ? [x, 0, c] :
			[c, 0, x];
		return [Math.round(r1 * 255), Math.round(g1 * 255), Math.round(b1 * 255)];
	}
	function rgbToHue(r: number, g: number, b: number): number {
		const rn = r / 255;
		const gn = g / 255;
		const bn = b / 255;
		const max = Math.max(rn, gn, bn);
		const min = Math.min(rn, gn, bn);
		const delta = max - min;
		if (delta === 0) return 0;
		if (max === rn) return 60 * (((gn - bn) / delta + 6) % 6);
		if (max === gn) return 60 * (((bn - rn) / delta) + 2);
		return 60 * (((rn - gn) / delta) + 4);
	}
	const currentHex = $derived(rgb ? rgbToHex(rgb[0], rgb[1], rgb[2]) : '#ffffff');
	const currentHue = $derived(rgb ? rgbToHue(rgb[0], rgb[1], rgb[2]) : 48);
	let localHex = $state('#ffffff');
	let localHue = $state(48);
	$effect(() => { localHex = currentHex; });
	$effect(() => { localHue = currentHue; });

	let colorDebounce: ReturnType<typeof setTimeout> | null = null;
	let colorPreviewFrame: number | null = null;
	let pendingPreviewRgb: [number, number, number] | null = null;
	$effect(() => {
		return () => {
			if (colorPreviewFrame !== null && browser) {
				window.cancelAnimationFrame(colorPreviewFrame);
			}
			colorPreviewFrame = null;
			pendingPreviewRgb = null;
		};
	});
	function commitColor(r: number, g: number, b: number) {
		if (colorDebounce) clearTimeout(colorDebounce);
		colorDebounce = setTimeout(() => {
			if (isDemo) applyPatch(entityId, { state: 'on', attributes: { rgb_color: [r, g, b] } });
			else lightService.setRgb(entityId, r, g, b).catch(() => {});
		}, 80);
	}
	function previewColor(r: number, g: number, b: number) {
		localHex = rgbToHex(r, g, b);
		pendingPreviewRgb = [r, g, b];
		if (colorPreviewFrame !== null || !browser) return;
		colorPreviewFrame = window.requestAnimationFrame(() => {
			colorPreviewFrame = null;
			if (!pendingPreviewRgb) return;
			const [pr, pg, pb] = pendingPreviewRgb;
			pendingPreviewRgb = null;
			applyPatch(entityId, { state: 'on', attributes: { rgb_color: [pr, pg, pb] } });
		});
	}

	// ─── Color Temperature ────────────────────────────────────────────────────

	const supportsColorTemp = $derived(
		Array.isArray(entity?.attributes.supported_color_modes)
			? (entity.attributes.supported_color_modes as string[]).includes('color_temp')
			: false
	);
	const ctKelvin = $derived(entity?.attributes.color_temp_kelvin as number | undefined);
	const ctMired = $derived(entity?.attributes.color_temp as number | undefined);
	const useKelvinScale = $derived(
		ctKelvin !== undefined ||
		entity?.attributes.min_color_temp_kelvin !== undefined ||
		entity?.attributes.max_color_temp_kelvin !== undefined
	);
	const ctMin = $derived(
		useKelvinScale
			? ((entity?.attributes.min_color_temp_kelvin as number | undefined) ?? 2000)
			: ((entity?.attributes.min_mireds as number | undefined) ?? 153)
	);
	const ctMax = $derived(
		useKelvinScale
			? ((entity?.attributes.max_color_temp_kelvin as number | undefined) ?? 6500)
			: ((entity?.attributes.max_mireds as number | undefined) ?? 500)
	);
	let localCt = $state(4000);
	$effect(() => {
		if (useKelvinScale && ctKelvin !== undefined) localCt = ctKelvin;
		if (!useKelvinScale && ctMired !== undefined) localCt = ctMired;
	});
	const ctDisplayValue = $derived(useKelvinScale ? localCt : Math.round(1_000_000 / Math.max(localCt, 1)));

	let ctDebounce: ReturnType<typeof setTimeout> | null = null;
	function onCtInput(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value);
		localCt = v;
		if (ctDebounce) clearTimeout(ctDebounce);
		ctDebounce = setTimeout(() => {
			if (useKelvinScale) {
				if (isDemo) applyPatch(entityId, { attributes: { color_temp_kelvin: v } });
				else lightService.setColorTemp(entityId, v).catch(() => {});
				return;
			}
			if (isDemo) applyPatch(entityId, { attributes: { color_temp: v } });
			else lightService.turnOn(entityId, { color_temp: v }).catch(() => {});
		}, 120);
	}

	// ─── Effects ──────────────────────────────────────────────────────────────

	const effectList    = $derived((entity?.attributes.effect_list as string[] | undefined) ?? []);
	const currentEffect = $derived(entity?.attributes.effect as string | undefined);

	function setEffect(effect: string) {
		if (!isOn || isUnavail) return;
		if (isDemo) applyPatch(entityId, { attributes: { effect } });
		else lightService.setEffect(entityId, effect).catch(() => {});
	}

	// ─── Toggle ───────────────────────────────────────────────────────────────

	let toggling = $state(false);
	async function toggle() {
		if (toggling || isUnavail) return;
		if (isDemo) { applyPatch(entityId, { state: isOn ? 'off' : 'on' }); return; }
		toggling = true;
		try { if (isOn) await lightService.turnOff(entityId); else await lightService.turnOn(entityId); }
		catch { /* silent */ }
		toggling = false;
	}

	const rgbCss    = $derived(rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : null);
	const glowColor = $derived(rgbCss ?? (isOn ? '#ffd580' : 'transparent'));

	// ─── Drag-based vertical slider ───────────────────────────────────────────
	// We implement our own vertical slider so it looks like a HomeKit dimmer:
	// a tall pill track; dragging up = brighter, dragging down = dimmer.

	let trackEl = $state<HTMLElement | null>(null);
	let dragging = $state(false);
	let colorTrackEl = $state<HTMLElement | null>(null);
	let draggingColor = $state(false);

	function getValueFromPointer(e: PointerEvent): number {
		if (!trackEl) return localBrightness;
		const rect = trackEl.getBoundingClientRect();
		const relY = e.clientY - rect.top;
		// top = 100%, bottom = 0% (invert)
		const pct = 1 - Math.max(0, Math.min(1, relY / rect.height));
		return Math.round(pct * 99) + 1; // clamp to 1-100
	}

	function onTrackPointerDown(e: PointerEvent) {
		if (!isOn || isUnavail) return;
		e.currentTarget instanceof Element && (e.currentTarget as Element).setPointerCapture(e.pointerId);
		dragging = true;
		const v = getValueFromPointer(e);
		localBrightness = v;
	}
	function onTrackPointerMove(e: PointerEvent) {
		if (!dragging) return;
		const v = getValueFromPointer(e);
		localBrightness = v;
	}
	function onTrackPointerUp(e: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const v = getValueFromPointer(e);
		localBrightness = v;
		if (bDebounce) clearTimeout(bDebounce);
		if (isDemo) applyPatch(entityId, { state: 'on', attributes: { brightness: Math.round(v / 100 * 255) } });
		else lightService.setBrightness(entityId, v).catch(() => {});
	}

	function getHueFromPointer(e: PointerEvent): number {
		if (!colorTrackEl) return localHue;
		const rect = colorTrackEl.getBoundingClientRect();
		const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
		const ratio = 1 - relY / rect.height;
		return Math.round(ratio * 360);
	}

	function applyHuePreview(hue: number) {
		localHue = hue;
		const [r, g, b] = hueToRgb(hue);
		previewColor(r, g, b);
	}

	function onColorTrackPointerDown(e: PointerEvent) {
		if (!supportsColor || !isOn || isUnavail) return;
		e.currentTarget instanceof Element && (e.currentTarget as Element).setPointerCapture(e.pointerId);
		draggingColor = true;
		applyHuePreview(getHueFromPointer(e));
	}

	function onColorTrackPointerMove(e: PointerEvent) {
		if (!draggingColor) return;
		applyHuePreview(getHueFromPointer(e));
	}

	function onColorTrackPointerUp(e: PointerEvent) {
		if (!draggingColor) return;
		draggingColor = false;
		const hue = getHueFromPointer(e);
		applyHuePreview(hue);
		const [r, g, b] = hueToRgb(hue);
		commitColor(r, g, b);
	}
</script>

<div class="lmi">

	<!-- ── Brightness % ──────────────────────────────────────────────────── -->
	<div class="lmi__header" style="--glow: {glowColor};">
		<div class="lmi__pct" class:lmi__pct--on={isOn}>
			{isOn ? localBrightness : (isUnavail ? '—' : '0')}%
		</div>
	</div>

	<!-- ── Body ───────────────────────────────────────────────────────────── -->
	<div class="lmi__body">
		<div
			class="lmi__dimmer"
			class:lmi__dimmer--on={isOn}
			class:lmi__dimmer--disabled={isUnavail}
			style="--fill: {isOn ? localBrightness : 0}%; --glow: {glowColor};"
			bind:this={trackEl}
			onpointerdown={onTrackPointerDown}
			onpointermove={onTrackPointerMove}
			onpointerup={onTrackPointerUp}
			onpointercancel={onTrackPointerUp}
			role="slider"
			aria-label="Brightness"
			aria-valuenow={localBrightness}
			aria-valuemin={1}
			aria-valuemax={100}
			aria-disabled={!isOn || isUnavail}
			tabindex={isOn && !isUnavail ? 0 : -1}
		>
			<div class="lmi__dimmer-fill" style="height: {isOn ? localBrightness : 0}%;"></div>
			<div class="lmi__dimmer-icon">
				<Icon name="sun" size={28} />
			</div>
		</div>

		<!-- Right column: toggle -->
		<div class="lmi__right">

			<!-- Toggle -->
			<button
				class="lmi__toggle" class:lmi__toggle--on={isOn}
				onclick={toggle} disabled={toggling || isUnavail}
				aria-label={isOn ? 'Turn off' : 'Turn on'} aria-pressed={isOn}
			>
				{#if toggling}
					<span class="lmi__spin"></span>
				{:else}
					<Icon name="power" size={22} />
				{/if}
			</button>

		</div>

		{#if supportsColor}
			<div
				class="lmi__color-rail"
				class:lmi__color-rail--disabled={!isOn || isUnavail}
				bind:this={colorTrackEl}
				onpointerdown={onColorTrackPointerDown}
				onpointermove={onColorTrackPointerMove}
				onpointerup={onColorTrackPointerUp}
				onpointercancel={onColorTrackPointerUp}
				role="slider"
				aria-label="Light color"
				aria-valuenow={Math.round(localHue)}
				aria-valuemin={0}
				aria-valuemax={360}
				aria-disabled={!isOn || isUnavail}
				tabindex={isOn && !isUnavail ? 0 : -1}
			>
				<div class="lmi__color-thumb" style={`top: ${(1 - localHue / 360) * 100}%; background: ${localHex};`}></div>
				<div class="lmi__color-icon">
					<Icon name="palette" size={22} />
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Color Temperature slider ────────────────────────────────────────── -->
	{#if supportsColorTemp}
		<div class="lmi__row" class:lmi__row--disabled={!isOn || isUnavail}>
			<Icon name="thermometer-sun" size={16} />
			<input
				type="range"
				min={ctMin}
				max={ctMax}
				step="100"
				value={localCt}
				oninput={onCtInput}
				disabled={!isOn || isUnavail}
				class="lmi__slider lmi__slider--ct"
				style="--fill: {Math.round((localCt - ctMin) / (ctMax - ctMin) * 100)}%;"
				aria-label="Color temperature"
			/>
			<span class="lmi__val">{ctDisplayValue}K</span>
		</div>
	{/if}

	<!-- ── Effects ─────────────────────────────────────────────────────────── -->
	{#if effectList.length > 0}
		<div class="lmi__row" class:lmi__row--disabled={!isOn || isUnavail}>
			<Icon name="sparkles" size={16} />
			<select
				class="lmi__select"
				value={currentEffect ?? 'None'}
				onchange={(e) => setEffect((e.target as HTMLSelectElement).value)}
				disabled={!isOn || isUnavail}
				aria-label="Light effect"
			>
				<option value="None">No effect</option>
				{#each effectList.filter(e => e !== 'None') as effect (effect)}
					<option value={effect}>{effect}</option>
				{/each}
			</select>
		</div>
	{/if}

</div>

<style>
	.lmi {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.lmi__header {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px 24px 16px;
		border-bottom: 1px solid var(--border);
	}

	.lmi__pct {
		font-size: 2.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--fg-subtle);
		transition: color var(--transition);
		text-align: center;
	}
	.lmi__pct--on {
		color: var(--glow);
	}

	/* ── Body ───────────────────────────────────────────────────────────────── */
	.lmi__body {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		flex: 1;
		min-height: 220px;
		padding: 24px;
	}

	/* ── HomeKit dimmer ─────────────────────────────────────────────────────── */
	.lmi__dimmer {
		position: relative;
		width: 90px;
		flex: 0 0 90px;
		align-self: stretch;
		border-radius: 24px;
		background: var(--active);
		border: 1.5px solid var(--border);
		overflow: hidden;
		cursor: ns-resize;
		touch-action: none;
		user-select: none;
		transition: border-color var(--transition);
	}
	.lmi__dimmer--disabled {
		opacity: 0.35;
		cursor: not-allowed;
		pointer-events: none;
	}
	.lmi__dimmer--on {
		border-color: color-mix(in srgb, var(--glow) 35%, var(--border));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--glow) 15%, transparent);
	}

	/* Fill rises from bottom — uses the glow (light bulb) color */
	.lmi__dimmer-fill {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--glow, #ffd580);
		opacity: 0.85;
		border-radius: 0 0 22px 22px;
		transition: height 0.08s ease, background-color var(--transition);
		min-height: 0;
	}

	/* Sun icon watermark centered in track */
	.lmi__dimmer-icon {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: color-mix(in srgb, var(--fg-subtle) 35%, transparent);
		pointer-events: none;
		z-index: 1;
	}

	.lmi__color-rail {
		position: relative;
		width: 90px;
		flex: 0 0 90px;
		align-self: stretch;
		border-radius: 24px;
		background:
			linear-gradient(
				to top,
				#ff0040 0%,
				#ff7a00 16%,
				#ffe600 32%,
				#39ff14 48%,
				#00d9ff 64%,
				#214dff 80%,
				#a400ff 100%
			);
		border: 1.5px solid var(--border);
		overflow: hidden;
		cursor: ns-resize;
		touch-action: none;
		user-select: none;
	}
	.lmi__color-rail--disabled {
		opacity: 0.35;
		cursor: not-allowed;
		pointer-events: none;
	}
	.lmi__color-thumb {
		position: absolute;
		left: 10px;
		right: 10px;
		height: 4px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.95);
		box-shadow:
			0 0 0 1px rgba(0, 0, 0, 0.28),
			0 0 12px rgba(255, 255, 255, 0.2);
		transform: translateY(-50%);
		pointer-events: none;
	}
	.lmi__color-icon {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.35);
		pointer-events: none;
	}

	/* ── Right column ───────────────────────────────────────────────────────── */
	.lmi__right {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 18px;
		padding: 20px;
		min-width: 90px;
	}

	/* ── Toggle ─────────────────────────────────────────────────────────────── */
	.lmi__toggle {
		width: 52px;
		height: 52px;
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
	.lmi__toggle:hover:not(:disabled) { background: var(--active); color: var(--fg); }
	.lmi__toggle--on {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border-color: color-mix(in srgb, var(--color-on) 30%, transparent);
		box-shadow: 0 0 16px color-mix(in srgb, var(--color-on) 20%, transparent);
	}
	.lmi__toggle--on:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-on) 22%, transparent);
	}
	.lmi__toggle:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── CT / extra rows ───────────────────────────────────────────────────── */
	.lmi__row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 20px;
		border-top: 1px solid var(--border);
		color: var(--fg-subtle);
		transition: opacity var(--transition);
		flex-shrink: 0;
	}
	.lmi__row--disabled { opacity: 0.35; pointer-events: none; }

	.lmi__slider {
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
	.lmi__slider--ct {
		background: linear-gradient(
			to right,
			#ffd580 0%,
			#fff4e0 var(--fill, 50%),
			#cce8ff var(--fill, 50%),
			#a8d4ff 100%
		);
	}
	.lmi__slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 18px; height: 18px;
		border-radius: 50%;
		background: var(--thumb-bg);
		border: 2px solid var(--border-strong);
		box-shadow: var(--shadow);
		cursor: pointer;
		transition: border-color var(--transition), box-shadow var(--transition);
	}
	.lmi__slider::-webkit-slider-thumb:hover {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
	}
	.lmi__slider::-moz-range-thumb {
		width: 18px; height: 18px;
		border-radius: 50%;
		background: var(--thumb-bg);
		border: 2px solid var(--border-strong);
		box-shadow: var(--shadow);
		cursor: pointer;
	}

	.lmi__val {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
		min-width: 4ch;
		text-align: right;
	}

	/* ── Effects select ─────────────────────────────────────────────────────── */
	.lmi__select {
		flex: 1;
		background: var(--hover);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--fg);
		font-size: 0.8125rem;
		padding: 6px 10px;
		cursor: pointer;
		outline: none;
		transition: border-color var(--transition);
	}
	.lmi__select:hover:not(:disabled) { border-color: var(--border-strong); }
	.lmi__select:disabled { opacity: 0.4; cursor: not-allowed; }

	/* ── Spinner ────────────────────────────────────────────────────────────── */
	.lmi__spin {
		display: inline-block;
		width: 20px;
		height: 20px;
		border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
