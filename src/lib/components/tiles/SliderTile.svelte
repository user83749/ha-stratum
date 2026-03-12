<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { inputNumberService, numberService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const domain = $derived(entityId.split('.')[0] ?? 'input_number');
  const entityState = $derived(entity?.state ?? '0');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Slider');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const minVal = $derived(attrs.min as number ?? 0);
  const maxVal = $derived(attrs.max as number ?? 100);
  const stepVal = $derived(attrs.step as number ?? 1);
  const unit = $derived(attrs.unit_of_measurement as string ?? '');
  const mode = $derived(attrs.mode as string ?? 'slider');

  const currentVal = $derived(parseFloat(entityState) || 0);
  let localVal = $state<number | null>(null);
  let dragging = $state(false);
  const displayVal = $derived(dragging ? localVal : currentVal);
  const fillPct = $derived(Math.max(0, Math.min(100, ((displayVal ?? currentVal) - minVal) / (maxVal - minVal) * 100)));
  const showRangeLabels = $derived(sizePreset === 'lg' || sizePreset === 'xl');
  const showQuickSteps = $derived((sizePreset === 'lg' || sizePreset === 'xl') && mode !== 'box');

  function setValue(val: number) {
    if (!entityId) return;
    if (domain === 'number') numberService.setValue(entityId, val);
    else inputNumberService.setValue(entityId, val);
  }

  function handleInput(ev: Event) { dragging = true; localVal = Number((ev.target as HTMLInputElement).value); }
  function handleChange(ev: Event) { dragging = false; const val = Number((ev.target as HTMLInputElement).value); localVal = null; setValue(val); }
  function increment(dir: 1 | -1) { setValue(Math.min(maxVal, Math.max(minVal, currentVal + dir * stepVal))); }
</script>

<div class="slider-tile" data-size={sizePreset} style="--fp: {fillPct}%;">

    <div class="tile-content">
    <div class="top">
      <div class="icon-sq" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
        {#if iconOverride}
          {#if overrideIsCustom}
            <Icon name={iconOverride} entity={entity} />
          {:else}
            <Icon name={iconOverride} entity={entity} size="100%" />
          {/if}
        {:else}
          <Icon name="sliders-horizontal" />
        {/if}
      </div>
    </div>

    <div class="bottom">
      <span class="val-hero">{displayVal ?? currentVal}{unit}</span>
      <span class="name-small">{name}</span>
    </div>
  </div>

  {#if mode !== 'box'}
    <div class="slider-area">
      <div class="slim-track">
        <div class="slim-fill" style="width:{fillPct}%"></div>
        <input type="range" min={minVal} max={maxVal} step={stepVal} value={displayVal ?? currentVal}
          oninput={handleInput} onchange={handleChange} aria-label={name} />
      </div>
      {#if showRangeLabels}
      <div class="range-labels">
        <span>{minVal}{unit}</span>
        <span>{maxVal}{unit}</span>
      </div>
      {/if}
    </div>
  {:else}
    <div class="box-controls">
      <button class="step-btn" onclick={() => increment(-1)} aria-label="Decrease">
        <Icon name="minus" />
      </button>
      <button class="step-btn" onclick={() => increment(1)} aria-label="Increase">
        <Icon name="plus" />
      </button>
    </div>
  {/if}

  {#if showQuickSteps}
    <div class="box-controls">
      <button class="step-btn" onclick={() => increment(-1)} aria-label="Decrease">
        <Icon name="minus" />
      </button>
      <button class="step-btn" onclick={() => increment(1)} aria-label="Increase">
        <Icon name="plus" />
      </button>
    </div>
  {/if}
</div>

<style>
  .slider-tile {
    --slider-track-height: calc(var(--action-icon-size) * 0.28);
    --slider-track-radius: calc(var(--slider-track-height) / 2);
    --fp: 50%;
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: calc(var(--button-card-font-size) * 0.6);
  }

  /* ── Content ───────────────────────────────────────────────────────────── */
  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    padding-bottom: calc(var(--button-card-font-size) * 0.3);
    min-height: 0;
  }

  .top { display: flex; }

  .icon-sq {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--accent) var(--control-chip-border-strength), transparent);
  }

  .icon-sq.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .icon-sq.override {
    background: transparent;
    border-color: transparent;
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.08);
    padding-bottom: calc(var(--button-card-font-size) * 0.08);
  }

  .val-hero {
    font-size: var(--hero-text-size);
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .name-small {
    font-size: var(--control-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  /* ── Slim slider ────────────────────────────────────────────────────────── */
  .slider-area {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.3);
  }

  .slim-track {
    position: relative;
    height: var(--slider-track-height);
    border-radius: var(--slider-track-radius);
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    overflow: visible;
  }

  .slim-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: var(--slider-track-radius);
    background: var(--accent);
    pointer-events: none;
    transition: width 0.08s;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  /* ── Box mode: +/− buttons ─────────────────────────────────────────────── */
  .box-controls {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.45);
    flex-shrink: 0;
  }

  .step-btn {
    all: unset;
    flex: 1;
    height: var(--action-icon-size);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border: 1.5px solid color-mix(in srgb, var(--accent) 30%, transparent);
    transition: all var(--transition);
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
</style>
