<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { coverService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

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

  const config = $derived(tile.config);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const entityState = $derived(entity?.state ?? 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Cover');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const pos = $derived(attrs.current_position as number | undefined);
  const tilt = $derived(attrs.current_tilt_position as number | undefined);
  const deviceClass = $derived(attrs.device_class as string ?? 'blind');
  const isOpen = $derived(entityState === 'open');
  const isClosed = $derived(entityState === 'closed');
  const isMoving = $derived(entityState === 'opening' || entityState === 'closing');

  function iconName() {
    if (deviceClass === 'door') return isOpen ? 'door-open' : 'door-closed';
    if (deviceClass === 'garage') return isOpen ? 'car' : 'warehouse';
    if (deviceClass === 'window') return 'app-window';
    if (deviceClass === 'curtain') return 'columns';
    return isOpen ? 'chevrons-up' : 'chevrons-down';
  }

  const stateLabel = $derived(
    entityState === 'open' ? (pos !== undefined ? pos + '%' : 'Open')
    : entityState === 'closed' ? 'Closed'
    : entityState === 'opening' ? 'Opening…'
    : entityState === 'closing' ? 'Closing…'
    : entityState
  );

  const coverColor = $derived(
    isOpen
      ? 'var(--color-on)'
      : isMoving
        ? 'var(--color-warning)'
        : 'var(--tile-label-off, #97989c)'
  );
  const showDirectControls = $derived(sizePreset !== 'sm');
  const showSliderOverlay = $derived((sizePreset === 'lg' || sizePreset === 'xl') && pos !== undefined);

  let localPos = $state<number | null>(null);
  let dragging = $state(false);
  const displayPos = $derived(dragging ? localPos : (pos ?? null));

  function handleSliderInput(ev: Event) { dragging = true; localPos = Number((ev.target as HTMLInputElement).value); }
  function handleSliderChange(ev: Event) {
    dragging = false;
    const val = Number((ev.target as HTMLInputElement).value);
    localPos = null;
    if (entityId) coverService.setPosition(entityId, val);
  }
</script>

<div class="cover-tile" class:open={isOpen} data-size={sizePreset} style="--cc: {coverColor};">

    <div class="tile-content">
    <div class="top">
      <div class="icon-badge" class:open={isOpen} class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
        {#if iconOverride}
          {#if overrideIsCustom}
            <Icon name={iconOverride} entity={entity} />
          {:else}
            <span class="icon-span"><Icon name={iconOverride} entity={entity} size="100%" /></span>
          {/if}
        {:else}
          <Icon name={iconName()} />
        {/if}
      </div>
      {#if showDirectControls}
      <div class="ctrl-row">
        <button class="ctrl" onclick={() => entityId && coverService.open(entityId)} disabled={isOpen} aria-label="Open">
          <Icon name="chevron-up" />
        </button>
        <button class="ctrl stop" onclick={() => entityId && coverService.stop(entityId)} aria-label="Stop">
          <Icon name="square" />
        </button>
        <button class="ctrl" onclick={() => entityId && coverService.close(entityId)} disabled={isClosed} aria-label="Close">
          <Icon name="chevron-down" />
        </button>
      </div>
      {/if}
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{stateLabel}</span>
    </div>
  </div>

  <!-- Position slider overlay -->
  {#if showSliderOverlay}
    <div class="pos-slider">
      <input type="range" min="0" max="100" value={displayPos ?? pos}
        oninput={handleSliderInput} onchange={handleSliderChange} aria-label="Position" />
    </div>
  {/if}
</div>

<style>
  .cover-tile {
    --cc: var(--fg-muted);
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
  }

  /* ── Content ─────────────────────────────────────────────────────────── */
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

  .icon-badge {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    /* Match HA default off icon shade */
    color: var(--tile-label-off, #97989c);
    background: color-mix(in srgb, var(--fg) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--fg) var(--control-chip-border-strength), transparent);
    transition: all var(--transition);
  }

  .icon-badge.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  .icon-badge.open {
    /* Changes the badge icon color only. */
    color: var(--cc);
    /* Changes the badge fill only. */
    background: color-mix(in srgb, var(--cc) var(--control-chip-fill-strength), transparent);
    border-color: color-mix(in srgb, var(--cc) var(--control-chip-border-strength), transparent);
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .icon-badge.override {
    background: transparent;
    border-color: transparent;
  }
  .icon-badge.override.open {
    background: transparent;
    border-color: transparent;
  }

  .icon-span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }

  .ctrl-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .ctrl {
    all: unset;
    width: var(--action-icon-size);
    height: var(--action-icon-size);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    transition: all var(--transition);
  }

  .ctrl:hover:not(:disabled) { background: var(--hover); color: var(--fg); }
  .ctrl:disabled { opacity: 0.3; cursor: default; }

  .ctrl.stop {
    background: color-mix(in srgb, var(--color-warning) 16%, transparent);
    color: var(--color-warning);
    border-color: color-mix(in srgb, var(--color-warning) 30%, var(--border));
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  /* Changes the active name text only. */
  .cover-tile.open .name-text { color: var(--tile-label-on, var(--control-active-name)); }

  /* Changes the active state text only. */
  .cover-tile.open .state-text { color: var(--tile-label-on, var(--control-active-name)); }

  /* ── Invisible position slider over the whole tile ──────────────────── */
  .pos-slider {
    display: none;
    position: absolute;
    inset: 0;
    z-index: 2;
  }

  .pos-slider input[type=range] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: ns-resize;
    writing-mode: vertical-lr;
    direction: rtl;
    margin: 0;
  }
  /* ── Show position slider on larger tiles ───────────────────────────── */
  /* Only relevant if pos-slider is rendered (lg/xl per your Svelte condition) */
  .cover-tile[data-size="lg"] .pos-slider,
  .cover-tile[data-size="xl"] .pos-slider {
    display: block;
  }

  .cover-tile[data-size="lg"] .ctrl-row,
  .cover-tile[data-size="xl"] .ctrl-row {
    display: none;
  }

  /* ── Small tile adjustments ─────────────────────────────────────────── */
  /* sm already doesn't render ctrl-row, but keeping this is harmless */
  .cover-tile[data-size="sm"] .ctrl-row {
    display: none;
  }

  .cover-tile[data-size="sm"] .bottom {
    gap: 0;
  }

  .cover-tile[data-size="sm"] .tile-content {
    padding-bottom: 2px;
  }

  .name-text {
    justify-self: start;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.21;
  }

  .state-text {
    justify-self: start;
    line-height: 1.15;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    transition: color var(--transition);
  }

  .state-text::first-letter {
    text-transform: uppercase;
  }
</style>
