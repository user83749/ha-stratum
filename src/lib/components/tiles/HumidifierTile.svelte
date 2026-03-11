<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { humidifierService } from '$lib/ha/services';
  import { clamp } from '$lib/utils/format';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config    = $derived(tile.config);
  const layoutW   = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH   = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW >= 2 && layoutH === 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);
  const sizePreset = $derived(getTileSizePreset(tile));

  const entityId    = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs       = $derived(entity?.attributes ?? {});
  const name        = $derived(config.name ?? attrs.friendly_name ?? 'Humidifier');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const isOn        = $derived(entity?.state === 'on');
  const targetHum   = $derived(attrs.humidity as number ?? 50);
  const currentHum  = $derived(attrs.current_humidity as number | undefined);
  const minHum      = $derived(attrs.min_humidity as number ?? 0);
  const maxHum      = $derived(attrs.max_humidity as number ?? 100);
  const modes       = $derived((attrs.available_modes as string[]) ?? []);
  const currentMode = $derived(attrs.mode as string ?? '');
  const isOff       = $derived(!isOn);
  const unavailable = $derived(entity?.state === 'unavailable' || entity?.state === 'unknown');

  let localHum = $state<number | null>(null);
  let dragging = $state(false);
  const displayHum = $derived(dragging ? (localHum ?? targetHum) : targetHum);
  const humPct = $derived(((displayHum) - minHum) / (maxHum - minHum) * 100);

  function toggle() { if (entityId) humidifierService.toggle(entityId); }

  function adjustHum(delta: number) {
    if (!isOn || !entityId) return;
    const newVal = clamp(targetHum + delta, minHum, maxHum);
    humidifierService.setHumidity(entityId, newVal);
  }

  function handleInput(ev: Event) { 
    dragging = true; 
    localHum = Number((ev.target as HTMLInputElement).value); 
  }

  function handleChange(ev: Event) {
    dragging = false;
    if (entityId) humidifierService.setHumidity(entityId, Number((ev.target as HTMLInputElement).value));
    localHum = null;
  }

  function selectMode(m: string) {
    if (entityId) humidifierService.setMode(entityId, m);
  }

  const modeColor = $derived(isOn ? 'var(--color-info)' : 'var(--tile-label-off, #97989c)');
  const activeColor = 'var(--tile-label-on, var(--control-active-name))';
  const offColor = 'var(--tile-label-off, #97989c)';
  const mainIcon = $derived(iconOverride ?? 'droplets');
</script>

<div class="hum-tile size-{sizePreset}" class:is-off={isOff} class:unavailable style="--mc: {modeColor}; --hp: {humPct}%;">
  {#if sizePreset === 'sm'}
    <!-- 1x1 Bold Complication -->
    <!-- Primary tile action is handled by TileWrapper interaction settings -->
    <div class="layout-sm">
      <div class="sm-icon" style="color: {isOn ? activeColor : offColor}">
        {#if iconOverride && overrideIsCustom}
          <Icon name={mainIcon} entity={entity} size={38} />
        {:else}
          <Icon name={mainIcon} size={38} />
        {/if}
      </div>
      {#if currentHum !== undefined}
        <div class="primary-hum" style="color: {isOn ? activeColor : 'var(--fg)'}">{Math.round(currentHum)}%</div>
      {:else}
        <div class="primary-hum" style="color: {isOn ? activeColor : 'var(--fg)'}">{Math.round(targetHum)}%</div>
      {/if}
      <div class="sm-meta">
        <span class="meta-label" style="color: {isOn ? activeColor : offColor}">{isOn ? 'On' : 'Off'}</span>
        {#if isOn}
          <span class="sep" style="color: {activeColor}; opacity: 0.2;">•</span>
          <span class="target-val" style="color: {activeColor}">{targetHum}%</span>
        {/if}
      </div>
    </div>

  {:else if sizePreset === 'md'}
    <!-- 2x1 Horizontal Row -->
    <div class="layout-md" class:is-wide-md={isWideMd} class:is-tall-md={isTallMd}>
      <!-- Primary tile action is handled by TileWrapper interaction settings -->
      <div class="md-left">
        <div class="md-icon" style="background: {iconOverride ? 'transparent' : isOn ? 'color-mix(in srgb, var(--mc) 20%, transparent)' : 'color-mix(in srgb, var(--fg) 8%, transparent)'}; color: {isOn ? 'var(--mc)' : offColor}">
          {#if iconOverride && overrideIsCustom}
            <Icon name={mainIcon} entity={entity} size={32} />
          {:else}
            <Icon name={mainIcon} size={32} />
          {/if}
        </div>
        <div class="md-status">
          <div class="status-val" style="color: {isOn ? activeColor : offColor}">{isOn ? 'Humidifying' : 'Off'}</div>
          <div class="device-name" style="color: {isOn ? activeColor : offColor}; opacity: {isOn ? 0.7 : 1}">{name}</div>
        </div>
      </div>

      <div class="md-right">
        <div class="md-hum">
          <span class="val" style="color: {isOn ? activeColor : 'var(--fg)'}">{currentHum !== undefined ? Math.round(currentHum) : Math.round(targetHum)}%</span>
          {#if isOn && !isTallMd}
            <span class="target" style="color: {activeColor}; opacity: 0.7;">Target {targetHum}%</span>
          {/if}
        </div>
        {#if isOn}
          <div class="md-controls">
            <button class="adj-btn" style="background: color-mix(in srgb, {activeColor} 10%, transparent); color: {activeColor}" onclick={() => adjustHum(-1)} aria-label="Lower humidity">
              <Icon name="minus" size={16} />
            </button>
            <button class="adj-btn" style="background: color-mix(in srgb, {activeColor} 10%, transparent); color: {activeColor}" onclick={() => adjustHum(1)} aria-label="Raise humidity">
              <Icon name="plus" size={16} />
            </button>
          </div>
        {/if}
      </div>
    </div>

  {:else}
    <!-- lg / xl Dashboard View -->
    <div class="layout-lg" class:is-xl={sizePreset === 'xl'}>
      <div class="lg-top">
        <div class="lg-hero">
          <div class="lg-icon-box" style="background: {iconOverride ? 'transparent' : `color-mix(in srgb, ${modeColor} 15%, transparent)`}; color: {modeColor}">
            {#if iconOverride && overrideIsCustom}
              <Icon name={mainIcon} entity={entity} size={sizePreset === 'xl' ? 44 : 32} />
            {:else}
              <Icon name={mainIcon} size={sizePreset === 'xl' ? 44 : 32} />
            {/if}
          </div>
          <div class="lg-hero-text">
            <div class="lg-mode" style="color: {isOn ? activeColor : offColor}">{isOn ? 'Humidifying' : 'Off'}</div>
            <div class="lg-name" style="color: {isOn ? activeColor : offColor}; opacity: {isOn ? 0.7 : 1}">{name}</div>
          </div>
        </div>

        <div class="lg-stats">
          {#if currentHum !== undefined}
            <div class="stat" style="background: {isOn ? 'color-mix(in srgb, var(--fg) 10%, transparent)' : 'color-mix(in srgb, var(--fg) 5%, transparent)'}; color: {isOn ? activeColor : 'var(--fg-muted)'}">
              <Icon name="droplets" size={14} />
              <span>{currentHum}% Current</span>
            </div>
          {/if}
          <button class="power-toggle" class:active={isOn} style="color: {isOn ? 'var(--mc)' : 'var(--fg-subtle)'}" onclick={toggle}>
            <Icon name="power" size={16} />
          </button>
        </div>
      </div>

      <div class="lg-main">
        <div class="hum-display">
          <div class="current-hero">
            <div class="slider-container">
              <svg viewBox="0 0 200 200" class="circular-slider">
                <circle class="bg" cx="100" cy="100" r="85" style="stroke: {isOn ? 'color-mix(in srgb, var(--fg) 15%, transparent)' : 'color-mix(in srgb, var(--fg) 5%, transparent)'}" />
                <circle class="fg" cx="100" cy="100" r="85" style="stroke-dasharray: {humPct * 5.34} 534; stroke: {isOn ? 'var(--mc)' : 'var(--fg-subtle)'};" />
              </svg>
              <div class="center-text">
                <span class="num" style="color: {isOn ? activeColor : 'var(--fg)'}">{displayHum}%</span>
                <span class="lbl" style="color: {isOn ? activeColor : 'var(--fg-subtle)'}; opacity: 0.7;">TARGET</span>
              </div>
              {#if isOn}
                <input type="range" min={minHum} max={maxHum} step="1" 
                  value={displayHum} oninput={handleInput} onchange={handleChange} />
              {/if}
            </div>
          </div>

          <div class="target-control" style="background: {isOn ? 'color-mix(in srgb, var(--fg) 10%, transparent)' : 'color-mix(in srgb, var(--fg) 4%, transparent)'}">
            <button class="adj-btn-large" disabled={!isOn} style="color: {isOn ? activeColor : 'var(--fg-muted)'}" onclick={() => adjustHum(-1)}>
              <Icon name="minus" size={24} />
            </button>
            <div class="val-display">
               <span class="sub" style="color: {isOn ? activeColor : 'var(--fg-muted)'}; opacity: 0.6;">Humidity</span>
               <span class="main" style="color: {isOn ? activeColor : 'var(--fg)'}">{currentHum ?? '--'}%</span>
            </div>
            <button class="adj-btn-large" disabled={!isOn} style="color: {isOn ? activeColor : 'var(--fg-muted)'}" onclick={() => adjustHum(1)}>
              <Icon name="plus" size={24} />
            </button>
          </div>
        </div>
      </div>

      {#if modes.length > 0}
        <div class="mode-switcher" style="background: {isOn ? 'color-mix(in srgb, var(--fg) 10%, transparent)' : 'color-mix(in srgb, var(--fg) 3%, transparent)'}">
          {#each modes as m}
            <button class="mode-btn" class:active={currentMode === m} style="color: {isOn && currentMode !== m ? activeColor : ''}; opacity: {isOn && currentMode !== m ? 0.7 : 1}" onclick={() => selectMode(m)}>
              <span>{m}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .hum-tile {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    overflow: hidden;
    transition: all 0.3s ease;
    background: transparent;
    position: relative;
  }

  button {
    all: unset;
    cursor: pointer;
    box-sizing: border-box;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  /* ── SM (1x1) ────────────────────────────────────────────────────────── */
  .layout-sm {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0;
  }

  .primary-hum {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.85;
    color: var(--fg);
    letter-spacing: -0.05em;
  }

  .sm-icon {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    opacity: 0.9;
  }

  .sm-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
  }

  .meta-label {
    color: var(--fg);
    text-transform: capitalize;
    line-height: 1.15;
  }

  .sm-meta .sep { display: none; }
  .sm-meta .target-val { color: var(--fg); opacity: 0.7; }

  /* ── MD (2x1, 2x2) ────────────────────────────────────────────────────────── */
  .layout-md {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    gap: calc(var(--tile-padding-effective) * 1.05);
    transition: all 0.3s ease;
  }

  .layout-md.is-tall-md {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
  }

  .md-left {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.2);
    min-width: 0;
    cursor: default;
    flex: 1 1 auto;
  }

  .layout-md.is-tall-md .md-left {
    align-items: flex-start;
    gap: calc(var(--tile-padding-effective) * 0.95);
  }

  .md-icon {
    width: calc(var(--hero-icon-size) * 1.02);
    height: calc(var(--hero-icon-size) * 1.02);
    border-radius: 25%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .md-status {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .status-val {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-name {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .md-right {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.9);
    flex-shrink: 0;
    min-width: 0;
  }

  .layout-md.is-tall-md .md-right {
    justify-content: space-between;
  }

  .md-hum {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 0;
  }

  .md-hum .val {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.9;
    color: var(--fg);
    letter-spacing: -0.05em;
  }

  .md-hum .target {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    margin-top: 2px;
  }

  .md-controls {
    display: flex;
    flex-direction: row;
    gap: calc(var(--tile-padding-effective) * 0.4);
  }

  .layout-md.is-tall-md .md-controls {
    gap: calc(var(--tile-padding-effective) * 0.34);
  }

  .adj-btn {
    width: var(--control-chip-size-compact);
    height: var(--control-chip-size-compact);
    border-radius: var(--control-chip-radius-compact);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  /* ── LG / XL (3x3+) ─────────────────────────────────────────────────── */
  .layout-lg {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: calc(var(--tile-padding-effective) * 2.2);
    gap: calc(var(--tile-padding-effective) * 1.85);
  }

  .lg-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lg-hero {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.45);
  }

  .lg-icon-box {
    width: calc(var(--hero-icon-size) * 1.85);
    height: calc(var(--hero-icon-size) * 1.85);
    border-radius: calc(var(--control-chip-radius) * 1.2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .lg-hero-text {
    display: flex;
    flex-direction: column;
  }

  .lg-mode {
    font-size: var(--button-card-font-size);
    font-weight: 500;
  }

  .lg-name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-subtle);
  }

  .lg-stats {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.1);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.75);
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    padding: calc(var(--tile-padding-effective) * 0.55) calc(var(--tile-padding-effective) * 1.28);
    border-radius: 99px;
  }

  .power-toggle {
    width: calc(var(--control-chip-size-compact) * 1.16);
    height: calc(var(--control-chip-size-compact) * 1.16);
    border-radius: 50%;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-subtle);
    transition: all 0.3s;
  }

  .power-toggle.active {
    background: color-mix(in srgb, var(--mc) 20%, transparent);
    color: var(--mc);
  }

  .lg-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .hum-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 3);
  }

  .slider-container {
    position: relative;
    width: var(--hero-text-size);
    height: var(--hero-text-size);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .circular-slider {
    position: absolute;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .circular-slider circle {
    fill: none;
    stroke-width: 12;
    stroke-linecap: round;
  }

  .circular-slider .bg {
    stroke: color-mix(in srgb, var(--fg) 5%, transparent);
  }

  .circular-slider .fg {
    stroke: var(--mc);
    transition: stroke-dasharray 0.3s ease;
  }

  .center-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
  }

  .center-text .num {
    font-size: var(--hero-text-size);
    font-weight: 500;
    color: var(--fg);
    letter-spacing: -0.05em;
    line-height: 1;
  }

  .center-text .lbl {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
    letter-spacing: 0.1em;
  }

  .slider-container input[type=range] {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
    border-radius: 50%;
  }

  .target-control {
    display: flex;
    align-items: center;
    gap: calc(var(--control-chip-size) * 0.95);
    background: color-mix(in srgb, var(--fg) 4%, transparent);
    padding: calc(var(--tile-padding-effective) * 1.1) calc(var(--tile-padding-effective) * 3);
    border-radius: calc(var(--control-chip-radius) * 1.5);
  }

  .val-display {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .val-display .sub {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    text-transform: uppercase;
  }

  .val-display .main {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg);
  }

  .adj-btn-large {
    width: calc(var(--control-chip-size) * 1.15);
    height: calc(var(--control-chip-size) * 1.15);
    border-radius: calc(var(--control-chip-radius) * 1.06);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .adj-btn-large:hover:not(:disabled) {
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
    transform: scale(1.05);
  }

  .mode-switcher {
    display: flex;
    gap: calc(var(--tile-padding-effective) * 0.75);
    padding: calc(var(--tile-padding-effective) * 0.75);
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    border-radius: calc(var(--control-chip-radius) * 1.2);
    overflow-x: auto;
  }

  .mode-btn {
    flex: 1;
    padding: calc(var(--tile-padding-effective) * 1.1);
    border-radius: calc(var(--control-chip-radius) * 0.9);
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    text-align: center;
    transition: all 0.2s;
    text-transform: capitalize;
    min-width: calc(var(--control-chip-size) * 1.9);
  }

  .mode-btn.active {
    background: var(--hover);
    color: var(--mc);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  /* ── States ────────────────────────────────────────────────────────── */
  .hum-tile.unavailable { opacity: 0.5; pointer-events: none; }
  .hum-tile.is-off {
    background: color-mix(in srgb, var(--surface) 80%, transparent);
  }

  /* ── Responsive Container Adjustments ──────────────────────────────── */
</style>
