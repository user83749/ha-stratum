<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { lawnMowerService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const state = $derived(entity?.state ?? 'idle');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Lawn Mower');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const battery = $derived(attrs.battery_level as number | undefined);
  const activity = $derived(attrs.activity as string ?? state);

  const isMowing = $derived(activity === 'mowing');
  const isDocked = $derived(activity === 'docked' || state === 'docked');
  const isPaused = $derived(activity === 'paused');
  const isError = $derived(activity === 'error');

  const stateColor = $derived(
    isMowing ? 'var(--color-on)' :
    isError ? 'var(--color-danger)' :
    isPaused ? 'var(--color-warning)' :
    'var(--fg-muted)'
  );
  const stateLabel = $derived(
    isMowing ? 'Mowing' :
    isDocked ? 'Docked' :
    isPaused ? 'Paused' :
    isError ? 'Error' :
    activity
  );
  const showBatteryBadge = $derived(battery !== undefined && sizePreset !== 'sm');
  const showActions = $derived(sizePreset !== 'sm');
</script>

<BaseTile {name} state={stateLabel} isOn={isMowing} style="--lmc: {stateColor};">

  {#snippet icon()}
    <!-- Visual-only mower icon — tile tap handled by TileWrapper -->
    <div
      class="mow-icon"
      class:mowing={isMowing}
      class:override={!!iconOverride}
      class:is-custom={overrideIsCustom}
      style={iconOverride ? 'color: var(--lmc);' : ''}
    >
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <span class="icon-span" class:spin={isMowing}><Icon name={iconOverride} entity={entity} size="100%" /></span>
        {/if}
      {:else}
        <span class="icon-span" class:spin={isMowing}><Icon name="scissors" size="100%" /></span>
      {/if}
    </div>
  {/snippet}

  {#snippet circle()}
    {#if showBatteryBadge}
      <span class="battery-badge">
        <Icon name="battery" size={11} />
        {battery}%
      </span>
    {/if}
  {/snippet}

  {#snippet below()}
    {#if showActions}
      <div class="actions">
        {#if !isDocked}
          <button class="action-btn" onclick={() => entityId && lawnMowerService.dock(entityId)} aria-label="Dock">
            <Icon name="home" />
            <span>Dock</span>
          </button>
        {/if}
        {#if isPaused}
          <button class="action-btn primary" onclick={() => entityId && lawnMowerService.startMowing(entityId)} aria-label="Resume">
            <Icon name="play" />
            <span>Resume</span>
          </button>
        {/if}
        {#if !isMowing && !isDocked}
          <button class="action-btn primary" onclick={() => entityId && lawnMowerService.startMowing(entityId)} aria-label="Mow">
            <Icon name="scissors" />
            <span>Mow</span>
          </button>
        {/if}
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Mow icon (visual only) ──────────────────────────────────────────── */
  .mow-icon {
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

  .mow-icon.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  /* Inner control chip only: mowing state. */
  .mow-icon.mowing {
    color: var(--color-on);
    background: color-mix(in srgb, var(--color-on) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-on) 40%, transparent);
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .mow-icon.override {
    background: transparent;
    border-color: transparent;
  }
  .mow-icon.override.mowing {
    background: transparent;
    border-color: transparent;
  }

  .icon-span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
  .spin { animation: spin 2s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Battery badge (shown in circle area) ────────────────────────────── */
  .battery-badge {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: calc(var(--button-card-font-size) * 0.22);
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */
  .actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.38);
    flex-shrink: 0;
  }

  .action-btn {
    all: unset;
    flex: 1;
    height: var(--action-icon-size);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: calc(var(--button-card-font-size) * 0.3);
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all var(--transition);
  }

  .action-btn:hover {
    background: color-mix(in srgb, var(--fg) 12%, transparent);
    color: var(--fg);
  }

  .action-btn.primary {
    background: color-mix(in srgb, var(--color-on) 18%, transparent);
    color: var(--color-on);
    border-color: color-mix(in srgb, var(--color-on) 35%, transparent);
  }
</style>
