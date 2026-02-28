<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { clamp } from '$lib/utils/format';
  import { climateService, type HvacMode } from '$lib/ha/services';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );

  const entityId    = $derived(tile.entity_id ?? entity?.entity_id ?? '');
  const name        = $derived((tile.config.name as string | undefined) ?? entity?.attributes.friendly_name ?? 'Climate');
  const currentTemp = $derived(entity?.attributes.current_temperature as number | undefined);
  const targetTemp  = $derived(entity?.attributes.temperature as number | undefined);
  const humidity    = $derived(entity?.attributes.current_humidity as number | undefined);
  const minTemp     = $derived((entity?.attributes.min_temp as number | undefined) ?? 10);
  const maxTemp     = $derived((entity?.attributes.max_temp as number | undefined) ?? 32);
  const hvacMode    = $derived(entity?.state ?? 'off');
  const hvacModes   = $derived((entity?.attributes.hvac_modes as string[] | undefined) ?? []);
  const isOff       = $derived(hvacMode === 'off');
  const unavailable = $derived(entity?.state === 'unavailable' || entity?.state === 'unknown');

  const modeColor = $derived(
    isOff                    ? 'var(--fg-subtle)' :
    hvacMode === 'cool'      ? 'var(--color-info)' :
    hvacMode === 'heat'      ? 'var(--color-warning)' :
    hvacMode === 'heat_cool' ? 'var(--color-on)' :
    hvacMode === 'auto'      ? 'var(--color-on)' :
    'var(--fg-muted)'
  );

  const modeIcon = $derived(
    hvacMode === 'cool'      ? 'snowflake' :
    hvacMode === 'heat'      ? 'flame' :
    hvacMode === 'heat_cool' ? 'thermometer' :
    hvacMode === 'auto'      ? 'cpu' :
    hvacMode === 'fan_only'  ? 'wind' :
    hvacMode === 'dry'       ? 'droplets' :
    'power'
  );

  const MODE_LABELS: Record<string, string> = {
    off: 'Off', heat: 'Heating', cool: 'Cooling',
    heat_cool: 'Auto', auto: 'Auto', fan_only: 'Fan', dry: 'Dry'
  };

  const modeLabel = $derived(MODE_LABELS[hvacMode] ?? hvacMode.replace(/_/g, ' '));
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
    climateService.setHvacMode(entityId, isOff ? (hvacModes.find(m => m !== 'off') ?? 'heat') as HvacMode : 'off');
  }
</script>

<div class="climate-tile size-{sizePreset}" class:is-off={isOff} class:unavailable style="--mc: {modeColor};">
  {#if sizePreset === 'sm'}
    <!-- 1x1 Bold Complication -->
    <button class="layout-sm" onclick={togglePower}>
      <div class="sm-icon" style="color: {modeColor}">
        <Icon name={modeIcon} size={38} />
      </div>
      {#if currentTemp !== undefined}
        <div class="primary-temp">{Math.round(currentTemp)}{tempUnit}</div>
      {/if}
      <div class="sm-meta">
        <span class="meta-label">{modeLabel}</span>
        {#if targetTemp !== undefined && !isOff}
          <span class="sep">•</span>
          <span class="target-val">{Math.round(targetTemp)}°</span>
        {/if}
      </div>
    </button>

  {:else if sizePreset === 'md'}
    <!-- 2x1 Horizontal Row -->
    <div class="layout-md">
      <button class="md-left" onclick={togglePower} aria-label="Toggle Power">
        <div class="md-icon" style="color: {modeColor}">
          <Icon name={modeIcon} size={48} />
        </div>
        <div class="md-status">
          <div class="status-val" style="color: {isOff ? 'var(--fg-muted)' : 'var(--mc)'}">{modeLabel}</div>
          <div class="device-name">{name}</div>
        </div>
      </button>
      
      <div class="md-right">
        {#if currentTemp !== undefined}
          <div class="md-temp">
            <span class="val">{Math.round(currentTemp)}{tempUnit}</span>
            {#if targetTemp !== undefined && !isOff}
              <span class="target">Set to {Math.round(targetTemp)}°</span>
            {/if}
          </div>
        {/if}
        {#if !isOff && targetTemp !== undefined}
          <div class="md-controls">
            <button class="adj-btn" onclick={() => adjustTemp(-0.5)} aria-label="Lower temp">
              <Icon name="minus" size={16} />
            </button>
            <button class="adj-btn" onclick={() => adjustTemp(0.5)} aria-label="Raise temp">
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
          <div class="lg-icon-box" style="background: color-mix(in srgb, {modeColor} 15%, transparent); color: {modeColor}">
            <Icon name={modeIcon} size={sizePreset === 'xl' ? 44 : 32} />
          </div>
          <div class="lg-hero-text">
            <div class="lg-mode" style="color: {modeColor}">{modeLabel}</div>
            <div class="lg-name">{name}</div>
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
            <Icon name="power" size={16} />
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
    container-type: size;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px;
  }

  .primary-temp {
    font-size: clamp(1.8rem, 28cqw, 2.4rem);
    font-weight: 800;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.05em;
    margin-top: 2px;
  }

  .sm-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.9;
  }

  .sm-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    margin-top: -1px;
  }

  .meta-label {
    color: var(--fg-muted);
    text-transform: capitalize;
  }

  .sm-meta .sep { opacity: 0.2; color: var(--fg-subtle); margin: 0 -1px; }
  .sm-meta .target-val { color: var(--mc); opacity: 0.9; }

  /* ── MD (2x1, 2x2) ────────────────────────────────────────────────────────── */
  .layout-md {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
    gap: 32px;
    transition: all 0.3s ease;
  }

  @container tile (min-height: 160px) and (max-width: 280px) {
    .layout-md {
      flex-direction: column;
      padding: 20px;
      gap: 12px;
    }
    .md-left {
      flex-direction: column !important;
      text-align: center;
      gap: 8px !important;
      flex: 0 !important;
    }
    .md-right {
      flex-direction: column !important;
      align-items: center !important;
      gap: 12px !important;
    }
    .md-temp { align-items: center !important; }
    .md-controls { flex-direction: row !important; gap: 12px !important; }
  }

  .md-left {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }

  .md-status {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .status-val {
    font-size: 1.25rem;
    font-weight: 800;
    text-transform: capitalize;
  }

  .device-name {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .md-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .md-temp {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .md-temp .val {
    font-size: clamp(2rem, 12cqw, 3.2rem);
    font-weight: 800;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .md-temp .target {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--fg-muted);
    margin-top: 2px;
  }

  .md-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .adj-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    transition: all 0.2s;
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
    font-size: 1.15rem;
    font-weight: 800;
    text-transform: capitalize;
  }

  .lg-name {
    font-size: 0.9rem;
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
    font-size: 0.9rem;
    font-weight: 700;
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
    font-size: clamp(4rem, 25cqw, 10rem);
    font-weight: 800;
    line-height: 0.85;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .current-hero .unit {
    font-size: 2.8rem;
    vertical-align: super;
    font-weight: 600;
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
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--fg-subtle);
    letter-spacing: 0.12em;
    margin-bottom: 2px;
  }

  .target-val .num {
    font-size: 2rem;
    font-weight: 800;
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
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--fg-muted);
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: var(--surface-1);
    color: var(--mc);
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  }

  /* ── XL Overrides ────────────────────────────────────────────── */
  .is-xl .current-hero { font-size: 9rem; }
  .is-xl .lg-icon-box { width: 72px; height: 72px; }

  /* ── States ────────────────────────────────────────────────────────── */
  .climate-tile.unavailable { opacity: 0.5; pointer-events: none; }
  .climate-tile.is-off {
    background: color-mix(in srgb, var(--surface-1) 80%, transparent);
  }

  @container (max-height: 280px) {
    .mode-switcher { display: none; }
    .layout-lg { justify-content: center; }
  }

  @container (max-width: 340px) {
    .lg-stats { display: none; }
  }
</style>
