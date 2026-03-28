<script lang="ts">
  // ── LightTile ────────────────────────────────────────────────────────────

  // ── Imports ─────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import CircleControl from '$lib/components/ui/CircleControl.svelte';
  import { lightService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  // ── Props ───────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ───────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const iconOverride = $derived((config.icon as string | undefined) ?? undefined);
  const useHueLightGlyph = $derived(!iconOverride || iconOverride === 'hue-light');
  const iconIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Light');
  const isOn = $derived(entity?.state === 'on');

  const brightness = $derived.by(() => {
    if (attrs.brightness === undefined) return null;
    let pct = Math.round((attrs.brightness as number) / 2.54);
    pct = Math.max(0, Math.min(100, pct));
    return pct;
  });

  const colorTempMired = $derived(attrs.color_temp as number | undefined);
  const colorTempKelvin = $derived(attrs.color_temp_kelvin as number | undefined);
  const minMireds = $derived(attrs.min_mireds as number ?? 153);
  const maxMireds = $derived(attrs.max_mireds as number ?? 500);
  const minKelvin = $derived(attrs.min_color_temp_kelvin as number | undefined);
  const maxKelvin = $derived(attrs.max_color_temp_kelvin as number | undefined);
  const supportedModes = $derived(attrs.supported_color_modes as string[] ?? []);
  const currentColorMode = $derived((attrs.color_mode as string | undefined) ?? undefined);
  const supportsStandaloneBrightness = $derived(supportedModes.includes('brightness'));
  const supportsBrightness = $derived(supportedModes.some(m => ['brightness','color_temp','rgb','xy','hs'].includes(m)) || brightness !== null);
  const supportsColorTemp = $derived(supportedModes.includes('color_temp') || colorTempMired !== undefined || colorTempKelvin !== undefined);
  const showBrightnessRing = $derived(supportsBrightness && isOn && sizePreset === 'sm');
  const showInlineControls = $derived(
    (sizePreset === 'lg' || sizePreset === 'xl') &&
    isOn &&
    (supportsBrightness || supportsColorTemp)
  );

  const rgbColor = $derived(attrs.rgb_color as [number, number, number] | undefined);
  const hsColor = $derived(attrs.hs_color as [number, number] | undefined);
  const xyColor = $derived(attrs.xy_color as [number, number] | undefined);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function mixChannel(a: number, b: number, t: number): number {
    return Math.round(a + (b - a) * t);
  }
  function colorTempTint(temp: number, min: number, max: number): string {
    const span = Math.max(1, max - min);
    const ratio = Math.max(0, Math.min(1, (temp - min) / span));
    const warm = [165, 77, 35];
    const cool = [238, 244, 255];
    return `rgb(${mixChannel(cool[0], warm[0], ratio)}, ${mixChannel(cool[1], warm[1], ratio)}, ${mixChannel(cool[2], warm[2], ratio)})`;
  }
  function kelvinToMired(kelvin: number): number {
    return Math.round(1_000_000 / Math.max(kelvin, 1));
  }
  function hsToRgb(h: number, s: number): [number, number, number] {
    const hue = ((h % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(1, s / 100));
    const c = sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const [r1, g1, b1] =
      hue < 60 ? [c, x, 0] :
      hue < 120 ? [x, c, 0] :
      hue < 180 ? [0, c, x] :
      hue < 240 ? [0, x, c] :
      hue < 300 ? [x, 0, c] :
      [c, 0, x];
    const m = 1 - c;
    return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
  }
  const lightColor = $derived(
    rgbColor ? `rgb(${rgbColor[0]},${rgbColor[1]},${rgbColor[2]})` :
    (isOn && (colorTempMired !== undefined || colorTempKelvin !== undefined))
      ? colorTempTint(
          colorTempMired ?? kelvinToMired(colorTempKelvin ?? 4000),
          minKelvin ? kelvinToMired(minKelvin) : minMireds,
          maxKelvin ? kelvinToMired(maxKelvin) : maxMireds
        ) :
    isOn ? 'var(--fg)' : 'var(--fg-muted)'
  );

  // ── Local Interaction State ─────────────────────────────────────────────
  let localColorTemp = $state<number | null>(null);
  let draggingTemp = $state(false);
  const brightPct = $derived(brightness ?? (isOn ? 100 : 0));
  const displayColorTemp = $derived(draggingTemp ? localColorTemp : (colorTempMired ?? colorTempKelvin ?? null));

  // ── Actions ─────────────────────────────────────────────────────────────
  function brightnessTurnOnPayload(nextPct: number): Record<string, unknown> {
    const payload: Record<string, unknown> = { brightness_pct: nextPct };
    if (supportsStandaloneBrightness) return payload;

    const mode = currentColorMode;
    const rgbish = mode ? ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(mode) : false;
    const ctemp = mode === 'color_temp';

    if (rgbish && rgbColor) {
      payload.rgb_color = rgbColor;
      return payload;
    }
    if (ctemp && colorTempKelvin !== undefined) {
      payload.color_temp_kelvin = colorTempKelvin;
      return payload;
    }
    if (ctemp && colorTempMired !== undefined) {
      payload.color_temp = colorTempMired;
      return payload;
    }

    // Mode may be absent/stale on some integrations: prefer currently reported color payload.
    if (rgbColor) {
      payload.rgb_color = rgbColor;
      return payload;
    }
    if (colorTempKelvin !== undefined) {
      payload.color_temp_kelvin = colorTempKelvin;
      return payload;
    }
    if (colorTempMired !== undefined) {
      payload.color_temp = colorTempMired;
      return payload;
    }

    // Guaranteed fallback by supported modes for integrations that reject
    // brightness-only payloads (e.g. some Meross lights).
    if (supportedModes.includes('color_temp')) {
      if (colorTempKelvin !== undefined) payload.color_temp_kelvin = colorTempKelvin;
      else if (colorTempMired !== undefined) payload.color_temp = colorTempMired;
      else if (minKelvin !== undefined || maxKelvin !== undefined) {
        const low = minKelvin ?? 2000;
        const high = maxKelvin ?? 6500;
        payload.color_temp_kelvin = Math.round((low + high) / 2);
      } else {
        payload.color_temp = Math.round((minMireds + maxMireds) / 2);
      }
      return payload;
    }
    if (supportedModes.some((m) => ['rgb', 'rgbw', 'rgbww'].includes(m))) {
      if (rgbColor) payload.rgb_color = rgbColor;
      else if (hsColor) payload.rgb_color = hsToRgb(hsColor[0], hsColor[1]);
      else payload.rgb_color = [255, 255, 255];
      return payload;
    }
    if (supportedModes.includes('hs')) {
      payload.hs_color = hsColor ?? [0, 100];
      return payload;
    }
    if (supportedModes.includes('xy')) {
      payload.xy_color = xyColor ?? [0.3127, 0.329];
      return payload;
    }
    return payload;
  }

  function handleBrightnessChange(value: number) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    if (entityId) lightService.turnOn(entityId, brightnessTurnOnPayload(next)).catch(() => {});
  }
  function handleTempInput(ev: Event) { draggingTemp = true; localColorTemp = Number((ev.target as HTMLInputElement).value); }
  function handleTempChange(ev: Event) {
    draggingTemp = false;
    const val = Number((ev.target as HTMLInputElement).value);
    localColorTemp = null;
    if (!entityId) return;
    if (colorTempKelvin !== undefined || minKelvin !== undefined || maxKelvin !== undefined) {
      lightService.turnOn(entityId, { color_temp_kelvin: val });
      return;
    }
    lightService.turnOn(entityId, { color_temp: val });
  }
</script>

<BaseTile {name} state={isOn ? 'On' : 'Off'} {isOn} style="--lc: {lightColor};">

  {#snippet icon()}
    {#if iconOverride && iconIsCustom}
      <!-- ── Custom Icon ─────────────────────────────────────────────────── -->
      <Icon name={iconOverride} entity={entity} />
    {:else}
      <div class="hue-icon-wrap" class:on={isOn}>
        {#if useHueLightGlyph}
        <svg viewBox="0 0 50 50" class="hue-svg">
          <path class="bulb-base" class:lit={isOn} d="M27.4 47.3h-4.9s-.7.1-.7.8.4.9.7.9h4.9c.3 0 .7-.1.7-.9s-.7-.8-.7-.8zm3.3-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-3H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9s-.9-.8-.9-.8zm5.2-23.2c-3.3-5.3-7-5.6-10.9-5.6-3.8 0-8.4.4-10.9 5.6-.1.1-.1.3.1.7.4.8 3.3 7.2 3.2 18.8 0 1.1-.1 1.6 0 1.7 0 .1 0 .7 1.1.7h13c1 0 1-.5 1.1-.7v-1.7c-.1-11.6 2.8-18 3.2-18.8.1-.4.1-.5.1-.7"/>
          <path class="light-color" class:hue-on={isOn} d="M14.1 15.3c3.4-.3 7-.4 10.9-.4 3.8 0 7.5.2 10.9.4.4-.4.7-.8.9-1.1C39 8.5 38.9 6.5 38.9 6c-.2-4.4-8.4-5-12.1-5h0-3.4c-3.7 0-12 .5-12.1 5 0 .5-.1 2.5 2.1 8.2 0 .3.3.8.7 1.1z"/>
        </svg>
      {:else}
        <Icon name={iconOverride ?? 'lightbulb'} entity={entity} />
      {/if}
      </div>
    {/if}
  {/snippet}

  {#snippet circle()}
    {#if showBrightnessRing}
      <CircleControl
        value={brightness}
        {isOn}
        unit="%"
        min={1}
        max={100}
        label="Brightness"
        onchange={handleBrightnessChange}
      />
    {/if}
  {/snippet}

  {#snippet below()}
    {#if showInlineControls}
      <div class="sliders-panel">
        {#if supportsBrightness}
          <div class="slider-row">
            <Icon name="sun-dim" size={12} />
            <div class="slim-track">
              <div class="slim-fill" style="width:{brightPct}%"></div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={brightPct}
                oninput={(e) => { handleBrightnessChange(Number((e.target as HTMLInputElement).value)); }}
                onchange={(e) => handleBrightnessChange(Number((e.target as HTMLInputElement).value))}
                aria-label="Brightness"
              />
            </div>
            <Icon name="sun" size={12} />
          </div>
        {/if}

        {#if supportsColorTemp && displayColorTemp !== null}
          <div class="slider-row">
            <Icon name="flame" size={12} />
            <div class="slim-track ct-track">
              <input
                type="range"
                min={colorTempKelvin !== undefined || minKelvin !== undefined || maxKelvin !== undefined ? (minKelvin ?? 2000) : minMireds}
                max={colorTempKelvin !== undefined || minKelvin !== undefined || maxKelvin !== undefined ? (maxKelvin ?? 6500) : maxMireds}
                step="1"
                value={displayColorTemp}
                oninput={handleTempInput}
                onchange={handleTempChange}
                aria-label="Color temperature"
              />
            </div>
            <Icon name="snowflake" size={12} />
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Icon ───────────────────────────────────────────────────────────────── */
  .hue-icon-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hue-svg { width: 100%; height: 100%; }

  .light-color {
    fill: var(--fg-muted);
    transition: all 0.25s ease-out;
  }

  .bulb-base {
    fill: #91989e;
    transition: fill 0.25s ease-out;
  }

  /* Changes the bulb glass color on. */
  .hue-icon-wrap.on .light-color { fill: var(--lc); }

  /* Changes the bulb base fill on. */
  .bulb-base.lit { fill: #8a9096; }

  @keyframes hue-on {
    0%   { transform: scale(0.85); }
    20%  { transform: scale(1.1); }
    40%  { transform: scale(0.95); }
    60%  { transform: scale(1.03); }
    80%  { transform: scale(0.97); }
    100% { transform: scale(1); }
  }

  .hue-on { animation: hue-on 0.8s; transform-origin: center; }

  /* ── Sliders panel ─────────────────────────────────────────────────────── */
  .sliders-panel {
    --inline-track-height: calc(var(--action-icon-size) * 0.28);
    --inline-track-radius: calc(var(--inline-track-height) / 2);
    --inline-hit-pad: calc(var(--action-icon-size) * 0.38);
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.45);
    flex-shrink: 0;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: calc(var(--button-card-font-size) * 0.6);
    color: var(--fg-subtle);
  }

  .slim-track {
    flex: 1;
    position: relative;
    height: var(--inline-track-height);
    border-radius: var(--inline-track-radius);
    background: color-mix(in srgb, var(--fg) 12%, transparent);
    overflow: visible;
  }

  .slim-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: var(--inline-track-radius);
    background: var(--lc);
    pointer-events: none;
    transition: width 0.08s;
  }

  .ct-track {
    background: linear-gradient(to right, #f97316, #fbbf24, #bfdbfe);
  }

  .slim-track input[type=range] {
    position: absolute;
    inset: calc(var(--inline-hit-pad) * -1) 0;
    width: 100%;
    height: calc(100% + var(--inline-hit-pad) * 2);
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }
</style>
