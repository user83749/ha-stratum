<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { lightService } from '$lib/ha/services';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );
  const iconOverride = $derived((config.icon as string | undefined) ?? undefined);
  const useHueLightGlyph = $derived(!iconOverride || iconOverride === 'hue-light');
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Light');
  const isOn = $derived(entity?.state === 'on');

  const brightness = $derived(attrs.brightness !== undefined ? Math.round((attrs.brightness as number) / 255 * 100) : null);
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
  const showInlineControls = $derived((sizePreset === 'lg' || sizePreset === 'xl') && isOn && (supportsBrightness || supportsColorTemp));

  const rgbColor = $derived(attrs.rgb_color as [number, number, number] | undefined);
  // LightTile keeps a few light-specific visual rules that should not be copied
  // to other tiles: bulb cap color, brightness ring, and color-temp tinting.
  function mixChannel(a: number, b: number, t: number): number {
    return Math.round(a + (b - a) * t);
  }
  function colorTempTint(temp: number, min: number, max: number): string {
    const span = Math.max(1, max - min);
    const ratio = Math.max(0, Math.min(1, (temp - min) / span));
    const warm = [165, 77, 35];
    const cool = [238, 244, 255];
    const r = mixChannel(cool[0], warm[0], ratio);
    const g = mixChannel(cool[1], warm[1], ratio);
    const b = mixChannel(cool[2], warm[2], ratio);
    return `rgb(${r}, ${g}, ${b})`;
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

  let localBrightness = $state<number | null>(null);
  let localColorTemp = $state<number | null>(null);
  let draggingBright = $state(false);
  let draggingTemp = $state(false);

  const displayBrightness = $derived(draggingBright ? localBrightness : brightness);
  const displayColorTemp = $derived(draggingTemp ? localColorTemp : (colorTempMired ?? colorTempKelvin ?? null));
  const brightPct = $derived(displayBrightness ?? (isOn ? 100 : 0));

  function toggle() { if (entityId) lightService.toggle(entityId); }
  function handleBrightInput(ev: Event) { draggingBright = true; localBrightness = Number((ev.target as HTMLInputElement).value); }
  function handleBrightChange(ev: Event) {
    draggingBright = false;
    const val = Number((ev.target as HTMLInputElement).value);
    localBrightness = null;
    if (entityId) lightService.turnOn(entityId, { brightness_pct: val });
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

<div class="light-tile" class:on={isOn} data-size={sizePreset} style="--lc: {lightColor}; --bright: {brightPct}%;">

  <!-- Content -->
  <div class="tile-content">
    <!-- Top: icon -->
    <div class="top">
      <div class="hue-icon-wrap" class:on={isOn}>
        {#if useHueLightGlyph}
          <svg viewBox="0 0 50 50" class="hue-svg">
            <path class="bulb-base" d="M27.4 47.3h-4.9s-.7.1-.7.8.4.9.7.9h4.9c.3 0 .7-.1.7-.9s-.7-.8-.7-.8zm3.3-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-3H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9s-.9-.8-.9-.8zm5.2-23.2c-3.3-5.3-7-5.6-10.9-5.6-3.8 0-8.4.4-10.9 5.6-.1.1-.1.3.1.7.4.8 3.3 7.2 3.2 18.8 0 1.1-.1 1.6 0 1.7 0 .1 0 .7 1.1.7h13c1 0 1-.5 1.1-.7v-1.7c-.1-11.6 2.8-18 3.2-18.8.1-.4.1-.5.1-.7"/>
            <path class="light-color" class:hue-on={isOn} d="M14.1 15.3c3.4-.3 7-.4 10.9-.4 3.8 0 7.5.2 10.9.4.4-.4.7-.8.9-1.1C39 8.5 38.9 6.5 38.9 6c-.2-4.4-8.4-5-12.1-5h0-3.4c-3.7 0-12 .5-12.1 5 0 .5-.1 2.5 2.1 8.2 0 .3.3.8.7 1.1z"/>
          </svg>
        {:else}
          <!-- Any non-hue icon override uses the shared Icon renderer. `hue-light`
               still routes through the native LightTile bulb above so it keeps the
               exact built-in light behavior here. -->
          <Icon name={iconOverride ?? 'lightbulb'} entity={entity} />
        {/if}
      </div>
    </div>
    <!-- Bottom: name + state -->
    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{isOn ? 'On' : 'Off'}</span>
    </div>
  </div>

  <!-- Absolute Brightness Ring (Top Right) -->
  {#if showBrightnessRing}
    <div class="circle-wrap" class:on={isOn}>
      <svg viewBox="0 0 50 50" class="circle-svg">
        <circle id="circle_stroke" cx="25" cy="25" r="22.1" class="circle-stroke" class:on={isOn}
          stroke-dasharray="138.85"
          stroke-dashoffset="{isOn ? 138.85 - (displayBrightness ?? 100) / 100 * 138.85 : 138.85}" />
        <text id="circle_value" x="50%" y="52%" class="circle-value">
          {isOn ? (displayBrightness ?? 100) : 0}<tspan dx=".2" dy="-.4">%</tspan>
        </text>
      </svg>
    </div>
  {/if}

  <!-- Sliders overlay (only visible when tall enough) -->
  {#if showInlineControls}
    <div class="sliders-panel">
      {#if supportsBrightness}
        <div class="slider-row">
          <Icon name="sun-dim" size={12} />
          <div class="slim-track">
            <div class="slim-fill" style="width:{brightPct}%"></div>
            <input type="range" min="1" max="100" step="1" value={brightPct}
              oninput={handleBrightInput} onchange={handleBrightChange} aria-label="Brightness" />
          </div>
          <Icon name="sun" size={12} />
        </div>
      {/if}
      {#if supportsColorTemp && displayColorTemp !== null}
        <div class="slider-row">
          <Icon name="flame" size={12} />
          <div class="slim-track ct-track">
            <input type="range" min={colorTempKelvin !== undefined || minKelvin !== undefined || maxKelvin !== undefined ? (minKelvin ?? 2000) : minMireds} max={colorTempKelvin !== undefined || minKelvin !== undefined || maxKelvin !== undefined ? (maxKelvin ?? 6500) : maxMireds} step="1" value={displayColorTemp}
              oninput={handleTempInput} onchange={handleTempChange} aria-label="Color temperature" />
          </div>
          <Icon name="snowflake" size={12} />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .light-tile {
    --lc: var(--fg-muted);
    --bright: 0%;
    /* Shared ring geometry for this tile. Container queries override these
       variables instead of fighting with separate hard-coded rules. */
    --ring-size: 44px;
    --ring-top: 16px;
    --ring-right: 8px;
    --ring-value-size: 14px;
    --ring-suffix-size: 10.5px;
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding: var(--tile-padding);
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    transition: background var(--transition);
  }

  /* ── Content sits above layers ─────────────────────────────────────────── */
  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    min-height: 0;
    padding-bottom: 4px;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .hue-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    font-size: 36px;
    /* Optical alignment: nudges the bulb left so its visible edge lines up with the label text. */
    margin-left: -4px;
  }

  .hue-svg {
    width: 100%;
    height: 100%;
  }

  .light-color {
    fill: var(--fg-muted);
    transition: all 0.25s ease-out;
  }

  .bulb-base {
    fill: #91989e;
    transition: fill 0.25s ease-out;
  }

  .light-tile.on .bulb-base {
    /* Changes the bulb base fill only. */
    fill: #8a9096;
  }

  .hue-icon-wrap.on .light-color {
    /* Changes the bulb glass color only. */
    fill: var(--lc);
  }

  @keyframes hue-on {
    0% { transform: scale(0.85); }
    20% { transform: scale(1.1); }
    40% { transform: scale(0.95); }
    60% { transform: scale(1.03); }
    80% { transform: scale(0.97); }
    100% { transform: scale(1); }
  }

  .hue-on {
    animation: hue-on 0.8s;
    transform-origin: center;
  }

  .circle-wrap {
    display: flex;
    position: absolute;
    /* Vertical alignment: move the ring down to sit level with the icon row. */
    top: var(--ring-top);
    right: var(--ring-right);
    width: var(--ring-size);
    height: var(--ring-size);
    opacity: 1;
    z-index: 2;
  }

  .circle-svg {
    width: 100%;
    height: 100%;
  }

  .circle-stroke {
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    stroke-width: 2.3;
    stroke: none;
    fill: rgba(255,255,255,0.04);
    transition: stroke-dashoffset 0.3s ease;
  }

  .circle-stroke.on {
    /* Changes the brightness ring stroke only. */
    stroke: rgba(136, 141, 146, 0.9);
    fill: none;
  }

  .circle-value {
    font-size: var(--ring-value-size);
    font-weight: 700;
    letter-spacing: -0.02rem;
    /* Changes the brightness percentage text only. */
    fill: rgba(132, 137, 142, 0.96);
    text-anchor: middle;
    dominant-baseline: central;
    font-variant-numeric: tabular-nums;
  }

  .circle-value tspan {
    font-size: var(--ring-suffix-size);
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    margin-top: auto;
    }

  .light-tile.on .name-text {
    /* Changes the primary label text only. */
    color: var(--control-active-name);
  }

  .light-tile.on .state-text {
    /* Changes the secondary label text only. */
    color: var(--control-active-name);
    opacity: 0.7;
  }

  

  

  /* ── Sliders panel — only appears when tall enough ─────────────────────── */
  .sliders-panel {
    display: none;
    position: relative;
    z-index: 1;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--fg-subtle);
  }

  .slim-track {
    flex: 1;
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--fg) 12%, transparent);
    overflow: visible;
  }

  .slim-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: var(--lc);
    pointer-events: none;
    transition: width 0.08s;
  }

  .ct-track {
    background: linear-gradient(to right, #f97316, #fbbf24, #bfdbfe);
  }

  .slim-track input[type=range] {
    position: absolute;
    inset: -8px 0;
    width: 100%;
    height: calc(100% + 16px);
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }

  /* ── Show sliders when tile is tall ─────────────────────────────────────── */
  @container tile (min-height: 140px) {
    .sliders-panel { display: flex; }
    .tile-content { padding-bottom: 6px; }
  }

  .light-tile[data-size='lg'] .sliders-panel,
  .light-tile[data-size='xl'] .sliders-panel {
    display: flex;
  }

  /* ── Very small: just icon + minimal info ───────────────────────────────── */
  

  /* ── Horizontal short tile ──────────────────────────────────────────────── */
  @container tile (max-height: 80px) {
    .light-tile {
      --ring-size: 40px;
      --ring-top: 10px;
      --ring-right: 4px;
      --ring-value-size: 13px;
      --ring-suffix-size: 10px;
    }
    .tile-content { flex-direction: row; align-items: center; gap: 10px; }
    .bottom { flex: 1; }
    .sliders-panel { display: none !important; }
  }

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    .light-tile {
      --ring-size: 40px;
      --ring-top: 10px;
      --ring-right: 4px;
      --ring-value-size: 13px;
      --ring-suffix-size: 10px;
    }
    .hue-icon-wrap {
      width: 38px !important;
      height: 38px !important;
      /* 1x1 compact tile: keep the icon nudge in the mobile-sized rule too. */
      margin-left: -4px !important;
    }
    .bottom { gap: 0px !important; }
    .tile-content { padding-bottom: 2px !important; }
  }


  .name-text {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .state-text {
    line-height: 1.15;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    transition: color var(--transition);
  }

</style>
