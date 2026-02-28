<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { inputNumberService, numberService } from '$lib/ha/services';

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
  const domain = $derived(entityId.split('.')[0] ?? 'input_number');
  const entityState = $derived(entity?.state ?? '0');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Slider');
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
  const showRangeLabels = $derived(sizePreset !== 'sm');
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
      <div class="icon-sq">
        <Icon name="sliders-horizontal" />
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
    --fp: 50%;
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
    padding-bottom: 4px;
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

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-bottom: 1px;
  }

  .val-hero {
    font-size: clamp(1rem, 7cqw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .name-small {
    font-size: 0.7rem;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Slim slider ────────────────────────────────────────────────────────── */
  .slider-area {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
    background: var(--accent);
    pointer-events: none;
    transition: width 0.08s;
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

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.58rem;
    color: var(--fg-subtle);
    font-variant-numeric: tabular-nums;
  }

  /* ── Box mode: +/− buttons ─────────────────────────────────────────────── */
  .box-controls {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .step-btn {
    all: unset;
    flex: 1;
    height: 36px;
    border-radius: 10px;
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
  @container tile (max-width: 140px) { .range-labels { display: none; } }
  @container tile (max-height: 120px) { .range-labels { display: none; } }
  @container tile (max-height: 80px) {
    .slider-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .slider-area, .box-controls { display: none; }
  }
  @container tile (max-width: 100px) {  .icon-sq { display: none; } }

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
