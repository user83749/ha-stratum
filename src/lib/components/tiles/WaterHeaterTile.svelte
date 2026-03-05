<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
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
  const targetTemp = $derived((attrs.temperature as number | undefined) ?? 50);
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

<BaseTile {name} state={`${displayTemp}${unit}`} {isOn} style="--hc: {heaterColor}; --fp: {fillPct}%;">
  {#snippet icon()}
    <!-- Flame icon button — pulsing when heating -->
    <div class="flame-icon" class:on={isOn} class:heating={isHeating}>
      <span class="icon-span" class:pulse={isHeating}><Icon name="flame" size="100%" /></span>
    </div>
  {/snippet}

  {#snippet circle()}
    {#if showCurrentBadge}
      <span class="current-badge">{currentTemp}{unit}</span>
    {/if}
  {/snippet}

  {#snippet below()}
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
  {/snippet}
</BaseTile>

<style>
  /* ── Flame icon (visual only) ─────────────────────────────────────────── */
  .flame-icon {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .icon-span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
  .pulse { animation: flame-pulse 0.8s ease-in-out infinite alternate; }

  /* On but not heating → info color */
  .flame-icon.on {
    color: var(--color-info);
    background: color-mix(in srgb, var(--color-info) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-info) 35%, transparent);
  }

  /* Heating → warning color (overrides .on) */
  .flame-icon.heating {
    color: var(--color-warning);
    background: color-mix(in srgb, var(--color-warning) 18%, transparent);
    border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
  }

  @keyframes flame-pulse { from { transform: scale(0.88); } to { transform: scale(1.12); } }

  /* ── Current temp badge ──────────────────────────────────────────────── */
  .current-badge {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--hc);
    background: color-mix(in srgb, var(--hc) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--hc) 30%, var(--border));
    border-radius: 99px;
    padding: 2px 8px;
    font-variant-numeric: tabular-nums;
    transition: all var(--transition);
  }

  /* ── Slim slider ─────────────────────────────────────────────────────── */
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
    left: 0; top: 0; bottom: 0;
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

  /* ── Mode chips ──────────────────────────────────────────────────────── */
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
    font-size: var(--secondary-label-size);
    font-weight: 500;
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

  @container tile (max-width: 160px) { .modes { display: none; } }
  @container tile (max-height: 140px) { .slider-area { display: none; } }
  @container tile (max-height: 100px) { .current-badge { display: none; } }
</style>
