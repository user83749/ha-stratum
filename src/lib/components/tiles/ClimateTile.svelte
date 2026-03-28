<script lang="ts">
  // ── ClimateTile ───────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { clamp } from '$lib/utils/format';
  import { climateService, type HvacMode } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';
  import { haptic } from '$lib/utils/haptics';
  import { optimisticClimateTemp } from '$lib/ha/optimistic';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW >= 2 && layoutH === 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);
  const sizePreset = $derived(getTileSizePreset(tile));

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
  // ── Effective State ───────────────────────────────────────────────────────
  const effectiveState = $derived(
    hvacAction === 'heating' || hvacAction === 'cooling' || hvacAction === 'drying' || hvacAction === 'fan'
      ? hvacAction
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
  const stateTextColor = $derived(
    isOff
      ? 'var(--tile-label-off, #97989c)'
      : (isHeatingOrCooling ? modeColor : 'var(--tile-label-on, var(--control-active-name))')
  );
  const setpointTextColor = $derived(
    isOff ? 'var(--tile-label-off, #97989c)' : 'var(--fg)'
  );

  const modeIcon = $derived(
    effectiveState === 'off' ? 'thermometer' :
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
    off: 'Off', heat: 'Heat', cool: 'Cool',
    heating: 'Heating', cooling: 'Cooling',
    heat_cool: 'Auto', auto: 'Auto', fan_only: 'Fan', fan: 'Fan', dry: 'Dry', drying: 'Drying'
  };

  const modeLabel = $derived(MODE_LABELS[effectiveState] ?? effectiveState.replace(/_/g, ' '));
  const showMdControls = $derived(!isOff && targetTemp !== undefined);
  const showMdSetpoint = $derived(targetTemp !== undefined && !isOff);
  const tempUnit = '°';

  // ── Actions ───────────────────────────────────────────────────────────────
  function adjustTemp(delta: number): void {
    if (targetTemp === undefined || !entityId) return;
    const newVal = clamp(targetTemp + delta, minTemp, maxTemp);
    optimisticClimateTemp(entityId, newVal);
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

    climateService.turnOn(entityId);
  }
</script>

<div class="climate-tile size-{sizePreset}" class:is-off={isOff} class:unavailable style="--mc: {modeColor};">
  {#if sizePreset === 'sm'}
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
    <div class="cm-md" class:cm-md--tall={isTallMd} class:off={isOff}>
      <!-- Left (or Top): state + name -->
      <div class="cm-md__info">
        <span class="cm-md__mode" class:off={isOff} style="color: {stateTextColor}">{modeLabel}</span>
        <span class="cm-md__name" style="color: {nameTextColor}">{name}</span>
      </div>

      <!-- Right (or Bottom): − setpoint + -->
      <div class="cm-md__ctrl">
        <button
          class="cm-md__adj"
          onclick={(e) => { e.stopPropagation(); haptic('light'); adjustTemp(-1); }}
          disabled={isOff || targetTemp === undefined}
          aria-label="Lower target temperature"
        >
          <Icon name="minus" />
        </button>
        <div class="cm-md__temp-wrap">
          <span class="cm-md__temp">{targetTemp !== undefined && !isOff ? Math.round(targetTemp) : '--'}</span>
          <span class="cm-md__unit">&deg;</span>
        </div>
        <button
          class="cm-md__adj"
          onclick={(e) => { e.stopPropagation(); haptic('light'); adjustTemp(1); }}
          disabled={isOff || targetTemp === undefined}
          aria-label="Raise target temperature"
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>

  {:else}
    <div class="layout-lg" class:is-xl={sizePreset === 'xl'}>
      <div class="lg-top">
        <div class="lg-hero">
          <div class="lg-hero-text">
            <div class="lg-mode" style="color: {stateTextColor}">{modeLabel}</div>
            <div class="lg-name" style="color: {nameTextColor}">{name}</div>
          </div>
        </div>

        <div class="lg-stats">
          {#if humidity !== undefined}
            <div class="stat">
              <Icon name="droplets" />
              <span>{humidity}%</span>
            </div>
          {/if}
          <button class="power-toggle" class:active={!isOff} onclick={() => { haptic('light'); togglePower(); }}>
            <Icon name="power" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div class="lg-main">
        <div class="temp-display">
          {#if currentTemp !== undefined}
            <div class="current-hero">{Math.round(currentTemp)}<span class="unit">{tempUnit}</span></div>
          {/if}
          <div class="target-control">
            <button class="temp-btn" disabled={isOff} onclick={() => { haptic('light'); adjustTemp(-1); }}>
              <Icon name="minus" />
            </button>
            <div class="target-val">
              <span class="lbl">SET</span>
              <span class="num">{targetTemp !== undefined ? Math.round(targetTemp) : '--'}°</span>
            </div>
            <button class="temp-btn" disabled={isOff} onclick={() => { haptic('light'); adjustTemp(1); }}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
      </div>

    </div>
  {/if}
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
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

  /* ── MD redesign: clean layout respecting boundaries ───────────────────── */
  .cm-md {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    gap: calc(var(--tile-padding-effective) * 0.6);
    padding-left: calc(var(--tile-padding-effective) * 2.0);
    padding-right: calc(var(--tile-padding-effective) * 1.25);
  }

  .cm-md--tall {
    flex-direction: column;
    align-items: stretch;
  }

  .cm-md__info {
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-padding-effective) * 0.18);
    min-width: 0;
    flex: 1;
    justify-content: center;
  }

  .cm-md__mode {
    font-size: calc(var(--button-card-font-size) * 1.05);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    text-transform: capitalize;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cm-md__mode.off { color: var(--tile-label-off, #97989c) !important; }

  .cm-md__name {
    font-size: calc(var(--button-card-font-size) * 0.9);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-on, var(--control-active-name));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.22;
  }

  .cm-md.off .cm-md__name { color: var(--tile-label-off, #97989c) !important; }

  /* Setpoint control row: [−] temp [+] */
  .cm-md__ctrl {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: calc(var(--tile-padding-effective) * 0.35);
    flex-shrink: 0;
  }

  .cm-md--tall .cm-md__ctrl {
    justify-content: space-between;
    width: 100%;
  }

  .cm-md__adj {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--button-card-font-size) * 2.3);
    height: calc(var(--button-card-font-size) * 2.3);
    border-radius: 50%;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 7%, transparent);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--transition), color var(--transition), transform 80ms ease;
  }

  .cm-md__adj:not(:disabled):hover {
    background: color-mix(in srgb, var(--fg) 14%, transparent);
    color: var(--fg);
  }

  .cm-md__adj:not(:disabled):active {
    transform: scale(0.88);
    background: color-mix(in srgb, var(--mc) 22%, transparent);
    color: var(--fg);
  }

  .cm-md__adj:disabled {
    opacity: 0.22;
    cursor: not-allowed;
  }

  .cm-md__adj :global(svg) {
    width: calc(var(--button-card-font-size) * 1.1);
    height: calc(var(--button-card-font-size) * 1.1);
  }

  .cm-md__temp-wrap {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-width: calc(var(--hero-text-size) * 1.2);
  }

  .cm-md__temp {
    font-size: calc(var(--hero-text-size) * 0.84);
    font-weight: 600;
    letter-spacing: -0.05em;
    color: var(--fg);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    transition: color var(--transition);
  }

  .cm-md.off .cm-md__temp {
    color: var(--tile-label-off, #97989c);
  }

  .cm-md__unit {
    font-size: calc(var(--hero-text-size) * 0.42);
    font-weight: 500;
    color: var(--fg-muted);
    margin-top: 0.08em;
    margin-left: 1px;
    line-height: 1;
  }

  .cm-md.off .cm-md__unit {
    color: var(--tile-label-off, #97989c);
  }

  /* ── LG / XL (3x3+) ─────────────────────────────────────────────────── */
  .layout-lg {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto 1fr;
    padding-top: calc(var(--tile-padding-effective) * 1.25);
    padding-bottom: calc(var(--tile-padding-effective) * 1.25);
    padding-inline: calc(var(--tile-padding-effective) * 1.25);
    gap: calc(var(--tile-padding-effective) * 1.5);
  }

  .lg-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.8);
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .lg-hero {
    min-width: 0;
    flex: 1 1 auto;
  }

  .lg-hero-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: calc(var(--tile-padding-effective) * 0.14);
  }

  .lg-mode {
    font-size: calc(var(--button-card-font-size) * 1.06);
    font-weight: 500;
    text-transform: capitalize;
    line-height: 1.12;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-name {
    font-size: calc(var(--button-card-font-size) * 1.08);
    font-weight: 500;
    color: inherit;
    line-height: 1.12;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-stats {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.62);
    flex: 0 0 auto;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.42);
    font-size: calc(var(--button-card-font-size) * 0.84);
    font-weight: 500;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    padding: calc(var(--tile-padding-effective) * 0.32) calc(var(--tile-padding-effective) * 0.7);
    border-radius: 999px;
  }

  .stat :global(svg),
  .stat :global(.icon) {
    width: calc(var(--action-icon-size-sm) * 0.92);
    height: calc(var(--action-icon-size-sm) * 0.92);
  }

  .power-toggle {
    width: calc(var(--control-chip-size-compact) * 0.92);
    height: calc(var(--control-chip-size-compact) * 0.92);
    border-radius: 50%;
    font-size: calc(var(--action-icon-size) * 0.88);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-subtle);
    transition: all 0.2s;
  }

  .power-toggle :global(svg),
  .power-toggle :global(.icon) {
    width: 1em;
    height: 1em;
  }

  .power-toggle.active {
    background: color-mix(in srgb, var(--mc) 15%, transparent);
    color: var(--mc);
  }

  .power-toggle:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--fg);
  }

  .lg-main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .temp-display {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 2.45);
  }

  .current-hero {
    font-size: calc(var(--button-card-font-size) * 2.6);
    font-weight: 500;
    line-height: 0.86;
    color: var(--fg);
    letter-spacing: -0.05em;
    white-space: nowrap;
  }

  .current-hero .unit {
    font-size: 0.56em;
    vertical-align: super;
    font-weight: 500;
    margin-left: 0.08em;
    opacity: 0.45;
  }

  .target-control {
    --climate-temp-btn-size: calc(var(--control-chip-size-compact) * 1.5);
    --climate-target-col-gap: calc(var(--tile-padding-effective) * 0.65);
    display: flex;
    align-items: center;
    gap: var(--climate-target-col-gap);
    background: color-mix(in srgb, var(--fg) 3%, transparent);
    padding: calc(var(--tile-padding-effective) * 0.82) calc(var(--tile-padding-effective) * 0.68);
    border-radius: calc(var(--control-chip-radius) * 1.16);
    width: 100%;
    max-width: 100%;
    align-self: stretch;
    margin-inline: 0;
    box-sizing: border-box;
  }

  .target-control {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    column-gap: var(--climate-target-col-gap);
    align-items: center;
  }

  .target-control > .temp-btn:first-of-type {
    justify-self: start;
    margin-inline-start: calc(var(--tile-padding-effective) * 0.05);
  }

  .target-control > .temp-btn:last-of-type {
    justify-self: end;
    margin-inline-end: calc(var(--tile-padding-effective) * 0.05);
  }

  .target-val {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    width: auto;
    justify-self: center;
    padding-inline: calc(var(--tile-padding-effective) * 0.88);
    box-sizing: border-box;
  }

  .target-val .lbl {
    font-size: calc(var(--secondary-label-size) * 0.88);
    font-weight: 500;
    color: var(--fg-subtle);
    letter-spacing: 0.1em;
    margin-bottom: calc(var(--tile-padding-effective) * 0.09);
    line-height: 1.05;
  }

  .target-val .num {
    font-size: calc(var(--button-card-font-size) * 1.02);
    font-weight: 500;
    color: var(--fg);
    line-height: 1.05;
    white-space: nowrap;
  }

  .temp-btn {
    width: var(--climate-temp-btn-size);
    height: var(--climate-temp-btn-size);
    border-radius: calc(var(--control-chip-radius) * 1.02);
    font-size: calc(var(--action-icon-size) * 1.34);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .temp-btn :global(svg),
  .temp-btn :global(.icon) {
    width: 1em;
    height: 1em;
  }

  .temp-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--fg);
    transform: none;
  }

  /* ── XL Overrides ────────────────────────────────────────────── */
  .is-xl .layout-lg {
    padding-top: calc(var(--tile-padding-effective) * 1.42);
    padding-bottom: calc(var(--tile-padding-effective) * 1.42);
    padding-inline: calc(var(--tile-padding-effective) * 1.42);
    gap: calc(var(--tile-padding-effective) * 1.72);
  }

  .is-xl .current-hero {
    font-size: calc(var(--button-card-font-size) * 2.9);
  }

  .is-xl .target-control {
    gap: calc(var(--tile-padding-effective) * 0.8);
    padding: calc(var(--tile-padding-effective) * 0.96) calc(var(--tile-padding-effective) * 0.8);
  }

  .is-xl .target-control {
    --climate-temp-btn-size: calc(var(--control-chip-size-compact) * 1.62);
    --climate-target-col-gap: calc(var(--tile-padding-effective) * 0.75);
  }

  /* ── States ────────────────────────────────────────────────────────── */
  .climate-tile.unavailable { opacity: 0.5; pointer-events: none; }
</style>
