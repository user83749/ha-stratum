<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { waterHeaterService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const entityState = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Water Heater');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
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
    <div
      class="flame-icon"
      class:on={isOn}
      class:heating={isHeating}
      class:override={!!iconOverride}
      class:is-custom={overrideIsCustom}
      style={iconOverride ? 'color: var(--hc);' : ''}
    >
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <span class="icon-span" class:pulse={isHeating}><Icon name={iconOverride} entity={entity} size="100%" /></span>
        {/if}
      {:else}
        <span class="icon-span" class:pulse={isHeating}><Icon name="flame" size="100%" /></span>
      {/if}
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

  .flame-icon.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
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

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .flame-icon.override {
    background: transparent;
    border-color: transparent;
  }
  .flame-icon.override.on {
    background: transparent;
    border-color: transparent;
  }
  .flame-icon.override.heating {
    background: transparent;
    border-color: transparent;
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
    padding: calc(var(--button-card-font-size) * 0.16) calc(var(--button-card-font-size) * 0.6);
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
    --heater-track-height: calc(var(--action-icon-size) * 0.28);
    --heater-track-radius: calc(var(--heater-track-height) / 2);
    position: relative;
    height: var(--heater-track-height);
    border-radius: var(--heater-track-radius);
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    overflow: visible;
  }

  .slim-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    border-radius: var(--heater-track-radius);
    background: var(--hc);
    pointer-events: none;
    transition: width 0.08s, background var(--transition);
  }

  .slim-track input[type=range] {
    position: absolute;
    inset: calc(var(--action-icon-size) * -0.38) 0;
    width: 100%;
    height: calc(100% + var(--action-icon-size) * 0.76);
    opacity: 0;
    cursor: pointer;
    margin: 0;
  }

  /* ── Mode chips ──────────────────────────────────────────────────────── */
  .modes {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.3);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .mode-chip {
    all: unset;
    font-size: var(--secondary-label-size);
    font-weight: 500;
    padding: calc(var(--button-card-font-size) * 0.22) calc(var(--button-card-font-size) * 0.6);
    border-radius: 99px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .mode-chip.active {
    background: color-mix(in srgb, var(--hc) 18%, transparent);
    color: var(--hc);
    border-color: color-mix(in srgb, var(--hc) 40%, var(--border));
  }

  @container tile (max-width: 180px) { .modes { display: none; } }
  @container tile (max-height: 96px) { .slider-area { display: none; } }
  @container tile (max-height: 84px) { .current-badge { display: none; } }
</style>
