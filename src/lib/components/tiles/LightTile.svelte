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
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW === 2 && layoutH === 1);
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
  const supportsBrightness = $derived(supportedModes.some(m => ['brightness','color_temp','rgb','xy','hs'].includes(m)) || brightness !== null);
  const supportsColorTemp = $derived(supportedModes.includes('color_temp') || colorTempMired !== undefined || colorTempKelvin !== undefined);
  const showBrightnessRing = $derived(supportsBrightness && isOn);
  const showInlineControls = $derived(
    (sizePreset === 'lg' || sizePreset === 'xl') &&
    isOn &&
    (supportsBrightness || supportsColorTemp)
  );

  const rgbColor = $derived(attrs.rgb_color as [number, number, number] | undefined);

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
  function handleBrightnessChange(value: number) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    if (entityId) lightService.turnOn(entityId, { brightness_pct: next }).catch(() => {});
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

{#if isWideMd}
  <div class="light-wide" class:on={isOn} style="--lc: {lightColor};">
    <div class="light-wide__layout">
      <div class="light-wide__icon-wrap">
        {#if iconOverride && iconIsCustom}
          <div class="light-wide__custom-icon">
            <Icon name={iconOverride} entity={entity} />
          </div>
        {:else}
          <div class="hue-icon-wrap light-wide__icon-shell" class:on={isOn}>
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
      </div>

      <div class="light-wide__content">
        <div class="light-wide__header">
          <div class="light-wide__copy">
            <span class="light-wide__name">{name}</span>
            <span class="light-wide__state">{isOn ? 'On' : 'Off'}</span>
          </div>
        </div>

        <div class="light-wide__controls" class:on={isOn}>
          <div class="light-wide__slider-wrap" class:disabled={!isOn}>
            <div class="light-wide__slider-bg">
              <div class="light-wide__slider-fill" style="width: {isOn ? brightPct : 0}%"></div>
            </div>
            
            <div class="light-wide__slider-info">
              <span class="light-wide__speed-text">{isOn ? brightPct + '%' : '--%'}</span>
            </div>
            
            {#if supportsBrightness}
              <input
                class="light-wide__slider"
                type="range"
                min="0"
                max="100"
                step="1"
                disabled={!isOn}
                value={brightPct}
                oninput={(e) => { handleBrightnessChange(Number((e.target as HTMLInputElement).value)); }}
                onchange={(e) => handleBrightnessChange(Number((e.target as HTMLInputElement).value))}
                aria-label="Brightness"
              />
            {/if}
          </div>

          {#if supportsBrightness}
            <button
              class="light-wide__action-btn"
              class:active={brightPct <= 10 && isOn}
              type="button"
              title="Night Light"
              onclick={(e) => { e.stopPropagation(); handleBrightnessChange(10); }}
            >
              <Icon name="moon" size={14} />
            </button>
            <button
              class="light-wide__action-btn"
              class:active={brightPct === 100 && isOn}
              type="button"
              title="Max Brightness"
              onclick={(e) => { e.stopPropagation(); handleBrightnessChange(100); }}
            >
              <Icon name="sun" size={16} />
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
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
{/if}

<style>
  .light-wide {
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding:
      calc(10.9% * var(--tile-padding-scale, 1))
      calc(10.9% * var(--tile-padding-scale, 1))
      calc(8.9% * var(--tile-padding-scale, 1))
      calc(10.9% * var(--tile-padding-scale, 1));
    display: flex;
    align-items: center;
    height: 100%;
    color: var(--tile-label-off, #97989c);
  }

  .light-wide.on {
    color: var(--tile-label-on, var(--control-active-name));
  }

  .light-wide__layout {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: calc(var(--button-card-font-size) * 0.48);
  }

  .light-wide__icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--control-chip-size) * 1.08);
  }

  .light-wide__custom-icon,
  .light-wide__icon-shell {
    width: 100%;
    margin: 0;
  }

  .light-wide__icon-shell {
    border-radius: 50%;
  }

  .light-wide__content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(var(--button-card-font-size) * 0.18);
  }

  .light-wide__header {
    display: flex;
    align-items: baseline;
    gap: calc(var(--button-card-font-size) * 0.4);
    min-width: 0;
  }

  .light-wide__copy {
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.08);
    min-width: 0;
  }

  .light-wide__name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    line-height: 1.21;
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .light-wide__state {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    line-height: 1.15;
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .light-wide.on .light-wide__name,
  .light-wide.on .light-wide__state,
  .light-wide.on .light-wide__action-btn:not(.active) {
    color: var(--tile-label-on, var(--control-active-name));
  }

  .light-wide__controls {
    display: flex;
    align-items: center;
    gap: calc(var(--button-card-font-size) * 0.4);
    min-width: 0;
  }

  .light-wide__slider-wrap {
    flex: 1;
    position: relative;
    height: calc(var(--button-card-font-size) * 1.8);
    border-radius: 99px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .light-wide__controls.on .light-wide__slider-wrap {
    background: color-mix(in srgb, var(--lc) 12%, transparent);
  }

  .light-wide__slider-wrap.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .light-wide__slider-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .light-wide__slider-fill {
    height: 100%;
    border-radius: inherit;
    background: color-mix(in srgb, var(--lc) 90%, #fff);
    transition: width 140ms ease;
  }

  .light-wide__slider-info {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    padding: 0 calc(var(--button-card-font-size) * 0.6);
    pointer-events: none;
    z-index: 1;
  }

  .light-wide__speed-text {
    font-size: calc(var(--button-card-font-size) * 0.88);
    font-weight: 600;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
  }

  .light-wide__controls:not(.on) .light-wide__speed-text {
    color: var(--tile-label-off, #97989c);
  }

  .light-wide__action-btn {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--button-card-font-size) * 1.8);
    height: calc(var(--button-card-font-size) * 1.8);
    border-radius: 50%;
    color: var(--tile-label-off, #97989c);
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
    transition: color var(--transition), background var(--transition), transform var(--transition);
    flex-shrink: 0;
  }

  .light-wide__action-btn:active {
    transform: scale(0.92);
  }

  .light-wide__action-btn.active {
    color: var(--fg);
    background: var(--lc);
  }

  .light-wide__slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
  }

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
