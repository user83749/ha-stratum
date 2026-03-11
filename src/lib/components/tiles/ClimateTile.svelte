<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { clamp } from '$lib/utils/format';
  import { climateService, type HvacMode } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW >= 2 && layoutH === 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );

  const entityId    = $derived(tile.entity_id ?? entity?.entity_id ?? '');
  const name        = $derived((tile.config.name as string | undefined) ?? entity?.attributes.friendly_name ?? 'Climate');
  const iconOverride = $derived(((tile.config.icon as string | undefined) ?? '').trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const currentTemp = $derived(entity?.attributes.current_temperature as number | undefined);
  const targetTemp  = $derived(entity?.attributes.temperature as number | undefined);
  const humidity    = $derived(entity?.attributes.current_humidity as number | undefined);
  const minTemp     = $derived((entity?.attributes.min_temp as number | undefined) ?? 10);
  const maxTemp     = $derived((entity?.attributes.max_temp as number | undefined) ?? 32);
  const hvacMode    = $derived(entity?.state ?? 'off');
  const hvacAction  = $derived((entity?.attributes.hvac_action as string | undefined) ?? '');
  const effectiveState = $derived(
    hvacMode === 'heat_cool' || hvacMode === 'auto'
      ? (hvacAction === 'heating' || hvacAction === 'cooling' ? hvacAction : hvacMode)
      : hvacMode
  );
  const hvacModes   = $derived((entity?.attributes.hvac_modes as string[] | undefined) ?? []);
  const isOff       = $derived(hvacMode === 'off');
  const unavailable = $derived(entity?.state === 'unavailable' || entity?.state === 'unknown');
  const isHeatingOrCooling = $derived(
    effectiveState === 'heat' ||
    effectiveState === 'cool' ||
    effectiveState === 'heating' ||
    effectiveState === 'cooling'
  );

  const modeColor = $derived(
    isOff                    ? 'var(--tile-label-off, #97989c)' :
    effectiveState === 'cool' || effectiveState === 'cooling' ? 'var(--color-info)' :
    effectiveState === 'heat' || effectiveState === 'heating' ? 'var(--color-warning)' :
    effectiveState === 'heat_cool' ? 'var(--color-on)' :
    effectiveState === 'auto' ? 'var(--color-on)' :
    'var(--fg-muted)'
  );
  const nameTextColor = $derived(
    isOff
      ? 'var(--tile-label-off, #97989c)'
      : 'var(--tile-label-on, var(--control-active-name))'
  );
  // Match BaseTile label semantics so climate "state" text reads like other tiles.
  const stateTextColor = $derived(
    isOff
      ? 'var(--tile-label-off, #97989c)'
      : (isHeatingOrCooling ? modeColor : 'var(--tile-label-on, var(--control-active-name))')
  );
  const setpointTextColor = $derived(
    isOff ? 'var(--tile-label-off, #97989c)' : 'var(--fg)'
  );

  const modeIcon = $derived(
    effectiveState === 'cool' || effectiveState === 'cooling' ? 'snowflake' :
    effectiveState === 'heat' || effectiveState === 'heating' ? 'flame' :
    effectiveState === 'heat_cool' ? 'thermometer' :
    effectiveState === 'auto' ? 'cpu' :
    effectiveState === 'fan_only' ? 'wind' :
    effectiveState === 'dry' ? 'droplets' :
    'power'
  );
  const mainIcon = $derived(iconOverride ?? modeIcon);

  const MODE_LABELS: Record<string, string> = {
    off: 'Off', heat: 'Heating', cool: 'Cooling',
    heating: 'Heating', cooling: 'Cooling',
    heat_cool: 'Auto', auto: 'Auto', fan_only: 'Fan', dry: 'Dry'
  };

  const modeLabel = $derived(MODE_LABELS[effectiveState] ?? effectiveState.replace(/_/g, ' '));
  const tempUnit = '°';

  function adjustTemp(delta: number): void {
    if (targetTemp === undefined) return;
    const newVal = clamp(targetTemp + delta, minTemp, maxTemp);
    climateService.setTemperature(entityId, newVal);
  }

  function setMode(mode: string): void {
    climateService.setHvacMode(entityId, mode as HvacMode);
  }

  function togglePower(): void {
    if (!entityId) return;
    if (!isOff) {
      climateService.setHvacMode(entityId, 'off');
      return;
    }

    const available = hvacModes.filter((m) => m !== 'off');
    const preferredOrder: HvacMode[] = ['heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only'];
    const preferred = preferredOrder.find((mode) => available.includes(mode));
    const fallback = available[0];

    if (preferred) {
      climateService.setHvacMode(entityId, preferred);
      return;
    }
    if (fallback) {
      climateService.setHvacMode(entityId, fallback as HvacMode);
      return;
    }

    // No explicit hvac mode available; defer to generic climate turn_on.
    climateService.turnOn(entityId);
  }
</script>

<div class="climate-tile size-{sizePreset}" class:is-off={isOff} class:unavailable style="--mc: {modeColor};">
  {#if sizePreset === 'sm'}
    <!-- 1x1 Bold Complication — tap handled by TileWrapper (more-info) -->
    <div class="layout-sm">
      {#if targetTemp !== undefined && !isOff}
        <div class="sm-setpoint" style="color: {setpointTextColor}">
          <span>{Math.round(targetTemp)}</span><span class="sm-setpoint-unit">°</span>
        </div>
      {/if}
      <div class="sm-icon" style="color: {modeColor}">
        {#if iconOverride && overrideIsCustom}
          <Icon name={mainIcon} entity={entity} />
        {:else}
          <Icon name={mainIcon} />
        {/if}
      </div>
      {#if currentTemp !== undefined}
        <div class="primary-temp">{Math.round(currentTemp)}{tempUnit}</div>
      {/if}
      <div class="sm-meta" style="color: {stateTextColor}">
        <span class="meta-label">{modeLabel}</span>
      </div>
    </div>

  {:else if sizePreset === 'md'}
    <!-- 2x1 Horizontal Row -->
    <div class="layout-md" class:is-wide-md={isWideMd} class:is-tall-md={isTallMd}>
      <!-- Primary tile action is handled by TileWrapper interaction settings -->
      <div class="md-left">
        <div class="md-icon" style="color: {modeColor}">
          {#if iconOverride && overrideIsCustom}
            <Icon name={mainIcon} entity={entity} />
          {:else}
            <Icon name={mainIcon} />
          {/if}
        </div>
        <div class="md-status">
          <div class="status-val" style="color: {stateTextColor}">{modeLabel}</div>
          <div class="device-name" style="color: {nameTextColor}">{name}</div>
        </div>
      </div>

      <div class="md-right">
        {#if currentTemp !== undefined}
          <div class="md-temp">
            <span class="val">{Math.round(currentTemp)}{tempUnit}</span>
            {#if targetTemp !== undefined && !isOff && !isTallMd}
              {#if isWideMd}
                <span class="target target--inline">Set {Math.round(targetTemp)}°</span>
              {:else}
                <span class="target">Set to {Math.round(targetTemp)}°</span>
              {/if}
            {/if}
          </div>
        {/if}
        {#if !isOff && targetTemp !== undefined}
          <div class="md-controls">
            <button class="adj-btn" onclick={() => adjustTemp(-0.5)} aria-label="Lower temp">
              <Icon name="minus" />
            </button>
            <button class="adj-btn" onclick={() => adjustTemp(0.5)} aria-label="Raise temp">
              <Icon name="plus" />
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
            <div class="lg-mode" style="color: {stateTextColor}">{modeLabel}</div>
            <div class="lg-name" style="color: {nameTextColor}">{name}</div>
          </div>
        </div>

	        <div class="lg-stats">
	          {#if humidity !== undefined}
	            <div class="stat">
	              <Icon name="droplets" size={14} />
	              <span>{humidity}%</span>
	            </div>
	          {/if}
	          <button class="power-toggle" class:active={!isOff} onclick={togglePower}>
	            <Icon name="power" size={16} strokeWidth={2.5} />
	          </button>
	        </div>
	      </div>

      <div class="lg-main">
        <div class="temp-display">
          {#if currentTemp !== undefined}
            <div class="current-hero">{Math.round(currentTemp)}<span class="unit">{tempUnit}</span></div>
          {/if}
          <div class="target-control">
            <button class="temp-btn" disabled={isOff} onclick={() => adjustTemp(-0.5)}>
              <Icon name="minus" size={24} />
            </button>
            <div class="target-val">
              <span class="lbl">TARGET</span>
              <span class="num">{targetTemp !== undefined ? Math.round(targetTemp) : '--'}°</span>
            </div>
            <button class="temp-btn" disabled={isOff} onclick={() => adjustTemp(0.5)}>
              <Icon name="plus" size={24} />
            </button>
          </div>
        </div>
      </div>

      {#if hvacModes.length > 1}
        <div class="mode-switcher">
          {#each hvacModes.filter(m => m !== 'off') as mode}
            <button 
              class="mode-btn" 
              class:active={hvacMode === mode} 
              onclick={() => setMode(mode)}
            >
              <Icon name={MODE_LABELS[mode]?.toLowerCase().includes('heat') ? 'flame' : MODE_LABELS[mode]?.toLowerCase().includes('cool') ? 'snowflake' : 'thermometer'} size={14} />
              <span>{MODE_LABELS[mode] ?? mode}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .climate-tile {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    overflow: hidden;
    transition: all 0.3s ease;
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
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0;
    gap: 2px;
    overflow: hidden;
    min-height: 0;
  }

  .primary-temp {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.85;
    color: var(--fg);
    letter-spacing: -0.05em;
    white-space: nowrap;
    overflow: hidden;
  }

  .sm-icon {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    opacity: 0.9;
    font-size: var(--hero-icon-size);
    flex-shrink: 0;
  }

  .sm-setpoint {
    position: absolute;
    top: 1px;
    right: 0;
    max-width: 44%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    line-height: 1.15;
    text-align: right;
    white-space: nowrap;
    pointer-events: none;
    font-variant-numeric: tabular-nums;
  }

  .sm-setpoint-unit {
    font-size: 0.78em;
    margin-left: 1px;
    transform: translateY(-0.18em);
    display: inline-block;
  }

  .sm-meta {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
    white-space: nowrap;
    overflow: hidden;
    flex-shrink: 0;
  }

  .meta-label {
    color: inherit;
    text-transform: capitalize;
    line-height: 1.15;
  }

  .target-val {
    color: inherit;
    line-height: 1.15;
  }

  /* ── MD (2x1, 2x2) ────────────────────────────────────────────────────────── */
  .layout-md {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    gap: calc(var(--tile-padding-effective) * 1.1);
    transition: all 0.3s ease;
  }

  .layout-md.is-wide-md {
    gap: var(--tile-gap);
  }

  .md-left {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.35);
    min-width: 0;
    cursor: default;
    flex: 1 1 auto;
  }

  .layout-md.is-wide-md .md-left {
    gap: calc(var(--tile-padding-effective) * 1.2);
  }

  .md-status {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
    flex: 1;
  }

  .md-icon {
    width: calc(var(--hero-icon-size) * 1.05);
    height: calc(var(--hero-icon-size) * 1.05);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .md-icon :global(svg),
  .md-icon :global(.icon) {
    width: 100%;
    height: 100%;
  }

  .status-val {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    text-transform: capitalize;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: inherit;
    opacity: 0.88;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.12;
  }

  .md-right {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.15);
    flex: 0 1 auto;
    min-width: 0;
  }

  .layout-md.is-wide-md .md-right {
    gap: calc(var(--tile-padding-effective) * 0.62);
  }

  .md-temp {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    min-width: 0;
  }

  .md-temp .val {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .md-temp .target {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: inherit;
    opacity: 0.8;
    margin-top: 1px;
    line-height: 1.1;
  }

  .layout-md.is-wide-md .md-temp .val {
    font-size: calc(var(--hero-text-size) * 0.86);
    letter-spacing: -0.05em;
  }

  .layout-md.is-wide-md .md-temp .target.target--inline {
    font-size: var(--secondary-label-size);
    margin-top: 0;
    line-height: 1;
    opacity: 0.82;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .md-controls {
    display: flex;
    flex-direction: row;
    gap: calc(var(--tile-padding-effective) * 0.45);
  }

  .layout-md.is-wide-md .md-controls {
    gap: calc(var(--tile-padding-effective) * 0.34);
  }

  .adj-btn {
    width: var(--control-chip-size-compact);
    height: var(--control-chip-size-compact);
    border-radius: var(--control-chip-radius-compact);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .layout-md.is-wide-md .adj-btn {
    width: calc(var(--control-chip-size-compact) * 0.88);
    height: calc(var(--control-chip-size-compact) * 0.88);
  }

  .adj-btn :global(svg),
  .adj-btn :global(.icon) {
    width: var(--action-icon-size);
    height: var(--action-icon-size);
  }

  .layout-md:not(.is-wide-md) {
    flex-direction: column;
    align-items: stretch;
  }

  .layout-md:not(.is-wide-md) .md-right {
    justify-content: space-between;
  }

  .layout-md.is-tall-md {
    gap: calc(var(--tile-padding-effective) * 0.9);
  }

  .layout-md.is-tall-md .md-left {
    gap: calc(var(--tile-padding-effective) * 1.05);
  }

  .layout-md.is-tall-md .md-right {
    gap: calc(var(--tile-padding-effective) * 0.85);
  }

  .layout-md.is-tall-md .md-temp {
    align-items: flex-start;
  }

  .layout-md.is-tall-md .md-temp .val {
    font-size: calc(var(--hero-text-size) * 0.92);
    letter-spacing: -0.05em;
  }

  .layout-md.is-tall-md .md-temp .target {
    font-size: calc(var(--secondary-label-size) * 1.02);
    line-height: 1.12;
  }

  .layout-md.is-tall-md .md-controls {
    gap: calc(var(--tile-padding-effective) * 0.4);
  }

  .layout-md.is-tall-md .adj-btn {
    width: calc(var(--control-chip-size-compact) * 0.94);
    height: calc(var(--control-chip-size-compact) * 0.94);
  }

  .adj-btn:hover {
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
  }

  /* ── LG / XL (3x3+) ─────────────────────────────────────────────────── */
  .layout-lg {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    gap: 20px;
  }

  .lg-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lg-hero {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .lg-icon-box {
    width: 56px;
    height: 56px;
    border-radius: 16px;
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
    text-transform: capitalize;
  }

  .lg-name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-subtle);
  }

  .lg-stats {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    padding: 6px 14px;
    border-radius: 99px;
  }

  .power-toggle {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-subtle);
    transition: all 0.3s;
  }

  .power-toggle.active {
    background: color-mix(in srgb, var(--mc) 15%, transparent);
    color: var(--mc);
  }

  .lg-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .temp-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .current-hero {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.85;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .current-hero .unit {
    font-size: var(--hero-text-size);
    vertical-align: super;
    font-weight: 500;
    margin-left: 2px;
    opacity: 0.4;
  }

  .target-control {
    display: flex;
    align-items: center;
    gap: 40px;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    padding: 12px 32px;
    border-radius: 24px;
    border: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  }

  .target-val {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .target-val .lbl {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
    letter-spacing: 0.12em;
    margin-bottom: 2px;
  }

  .target-val .num {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg);
  }

  .temp-btn {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .temp-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
    transform: translateY(-2px);
  }

  .mode-switcher {
    display: flex;
    gap: 8px;
    padding: 8px;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    border-radius: 20px;
  }

  .mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: var(--bg-elevated);
    color: var(--mc);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }

  /* ── XL Overrides ────────────────────────────────────────────── */
  .is-xl .current-hero { font-size: var(--hero-text-size); }
  .is-xl .lg-icon-box { width: 72px; height: 72px; }

  /* ── States ────────────────────────────────────────────────────────── */
  .climate-tile.unavailable { opacity: 0.5; pointer-events: none; }
  .climate-tile.is-off .layout-lg {
    background: color-mix(in srgb, var(--surface) 80%, transparent);
    justify-content: center;
  }</style>
