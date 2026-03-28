<script lang="ts">
  // ── CoverTile ─────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { coverService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const sizePreset = $derived(getTileSizePreset(tile));

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
  const showDirectControls = $derived(sizePreset === 'lg' || sizePreset === 'xl');
  const showSliderRing = $derived(sizePreset === 'sm' && pos !== undefined && isOpen);
  const showSliderOverlay = $derived((sizePreset === 'lg' || sizePreset === 'xl') && pos !== undefined);

  // ── Local State ───────────────────────────────────────────────────────────
  let localPos = $state<number | null>(null);
  let dragging = $state(false);
  const displayPos = $derived(dragging ? localPos : (pos ?? null));

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleSliderInput(ev: Event) { dragging = true; localPos = Number((ev.target as HTMLInputElement).value); }
  function handleSliderChange(ev: Event) {
    dragging = false;
    const val = Number((ev.target as HTMLInputElement).value);
    localPos = null;
    if (entityId) coverService.setPosition(entityId, val);
  }
</script>
<BaseTile {name} state={stateLabel} isOn={isOpen} style="--cc: {coverColor};">

  {#snippet icon()}
    <div class="icon-wrap" class:open={isOpen}>
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
    </div>
  {/snippet}

  {#snippet circle()}
    <!-- sm: show position indicator if open and position known -->
  {/snippet}

  {#snippet below()}
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
    {#if showSliderOverlay}
      <div class="pos-slider">
        <input type="range" min="0" max="100" value={displayPos ?? pos}
          oninput={handleSliderInput} onchange={handleSliderChange} aria-label="Position" />
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Icon wrapper ─────────────────────────────────────────────────────── */
  .icon-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
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
    gap: calc(var(--tile-padding-effective) * 0.27);
  }

  .ctrl {
    all: unset;
    width: var(--action-icon-size);
    height: var(--action-icon-size);
    border-radius: var(--control-chip-radius-compact);
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
</style>
