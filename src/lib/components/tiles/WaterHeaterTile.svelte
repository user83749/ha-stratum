<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { waterHeaterService } from '$lib/ha/services';

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
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const entityState = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Water Heater');
  const isOn = $derived(entityState !== 'off');
  const targetTemp = $derived(attrs.temperature as number ?? 50);
  const currentTemp = $derived(attrs.current_temperature as number | undefined);
  const minTemp = $derived(attrs.min_temp as number ?? 30);
  const maxTemp = $derived(attrs.max_temp as number ?? 80);
  const modes = $derived((attrs.operation_list as string[]) ?? []);
  const currentMode = $derived(attrs.operation_mode as string ?? entityState);
  const unit = $derived(attrs.temperature_unit as string ?? '°C');
  const isHeating = $derived(attrs.current_operation === 'heating');

  let localTemp = $state(50);
  let dragging = $state(false);
  $effect(() => { if (!dragging) localTemp = targetTemp; });
  const displayTemp = $derived(dragging ? localTemp : targetTemp);
  const fillPct = $derived(Math.max(0, Math.min(100, (displayTemp - minTemp) / (maxTemp - minTemp) * 100)));

  // Color: orange-red when heating, blue when on+idle, muted when off
  const heaterColor = $derived(isHeating ? 'var(--color-warning)' : isOn ? 'var(--color-info)' : 'var(--fg-muted)');
  const showCurrentBadge = $derived(currentTemp !== undefined && sizePreset !== 'sm');
  const showSliderArea = $derived(isOn && sizePreset !== 'sm');
  const showModeChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && modes.length > 0 && isOn);

  function handleInput(ev: Event) { dragging = true; localTemp = Number((ev.target as HTMLInputElement).value); }
  function handleChange(ev: Event) {
    dragging = false;
    const val = Number((ev.target as HTMLInputElement).value);
    if (entityId) waterHeaterService.setTemperature(entityId, val);
  }
</script>

<div class="wh-tile" class:on={isOn} class:heating={isHeating} data-size={sizePreset} style="--hc: {heaterColor}; --fp: {fillPct}%;">

  <div class="tile-content">
    <div class="top">
      <!-- Flame icon button — pulsing when heating -->
      <div class="flame-icon" class:heating={isHeating}>
        <span class:pulse={isHeating}><Icon name="flame" size={32} /></span>
      </div>
      {#if showCurrentBadge}
        <span class="current-badge">{currentTemp}{unit}</span>
      {/if}
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{displayTemp}{unit}</span>
    </div>
  </div>

  {#if showSliderArea}
    <div class="slider-area">
      <div class="slim-track">
        <div class="slim-fill" style="width:{fillPct}%"></div>
        <input type="range" min={minTemp} max={maxTemp} step="0.5" value={displayTemp}
          oninput={handleInput} onchange={handleChange} aria-label="Target temperature" />
      </div>
    </div>
  {/if}

  {#if showModeChips}
    <div class="modes">
      {#each modes as m}
        <button class="mode-chip" class:active={currentMode === m}
          onclick={() => entityId && waterHeaterService.setOperationMode(entityId, m)}>{m}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wh-tile {
    --hc: var(--fg-muted);
    --fp: 0%;
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: 8px;
  }

  /* ── Content ───────────────────────────────────────────────────────────── */
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

  .flame-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .flame-icon.heating {
    color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 18%, transparent);
    border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
  }

  .wh-tile.on:not(.heating) .flame-icon {
    color: var(--color-info);
    background: color-mix(in srgb, var(--color-info) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-info) 35%, transparent);
  }

  .pulse { animation: flame-pulse 0.8s ease-in-out infinite alternate; display: flex; }
  @keyframes flame-pulse { from { transform: scale(0.88); } to { transform: scale(1.12); } }

  .current-badge {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--hc);
    background: color-mix(in srgb, var(--hc) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--hc) 30%, var(--border));
    border-radius: 99px;
    padding: 2px 8px;
    font-variant-numeric: tabular-nums;
    transition: all var(--transition);
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  .wh-tile.on .state-text,
  .wh-tile.on .name-text {
    color: #4b5254; }

  /* ── Slim slider ────────────────────────────────────────────────────────── */
  .slider-area {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .slim-track {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    overflow: visible;
  }

  .slim-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: var(--hc);
    pointer-events: none;
    transition: width 0.08s, background var(--transition);
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

  /* ── Mode chips ─────────────────────────────────────────────────────────── */
  .modes {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .mode-chip {
    all: unset;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  .mode-chip.active {
    background: color-mix(in srgb, var(--hc) 18%, transparent);
    color: var(--hc);
    border-color: color-mix(in srgb, var(--hc) 40%, var(--border));
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @container tile (max-width: 180px) { .modes { display: none; } }
  @container tile (max-width: 140px) { .slider-area { display: none; } .current-badge { display: none; } }
  @container tile (max-height: 120px) { .modes { display: none; } }
  @container tile (max-height: 80px) {
    .wh-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .slider-area, .modes { display: none; }
  }
  @container tile (max-width: 100px) { .current-badge { display: none; }   }

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    :global(.hue-icon-wrap) { width: 38px !important; height: 38px !important; }
    :global(.vac-btn), :global(.fan-btn), :global(.icon-badge), :global(.power-btn), :global(.avatar-wrap) { width: 44px !important; height: 44px !important; }
    :global(.bottom) { gap: 0px !important; }
    :global(.tile-content) { padding-bottom: 2px !important; }
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
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
