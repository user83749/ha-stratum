<script lang="ts">
  // ── VacuumTile ────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { vacuumService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const state = $derived(entity?.state ?? 'docked');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Vacuum');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const battery = $derived(attrs.battery_level as number | undefined);
  const fanSpeed = $derived(attrs.fan_speed as string ?? '');
  const fanSpeeds = $derived((attrs.fan_speed_list as string[]) ?? []);

  const isCleaning = $derived(state === 'cleaning');
  const isDocked = $derived(state === 'docked');
  const isPaused = $derived(state === 'paused');
  const isReturning = $derived(state === 'returning');

  const stateColor = $derived(
    isCleaning ? 'var(--color-on)' :
    state === 'error' ? 'var(--color-danger)' :
    isPaused ? 'var(--color-warning)' :
    'var(--fg-muted)'
  );
  const stateLabel = $derived(
    isCleaning ? 'Cleaning' :
    isDocked ? 'Docked' :
    isPaused ? 'Paused' :
    isReturning ? 'Returning' :
    state
  );
  const showBatteryBadge = $derived(battery !== undefined && (sizePreset === 'lg' || sizePreset === 'xl'));
  const showActionRow = $derived(sizePreset === 'lg' || sizePreset === 'xl');
  const showSpeedChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && fanSpeeds.length > 0);
  const showActionLabels = $derived(sizePreset === 'lg' || sizePreset === 'xl');
</script>

<BaseTile {name} state={stateLabel} isOn={isCleaning} style="--vc: {stateColor};">

  {#snippet icon()}
    <div
      class="vac-icon"
      class:cleaning={isCleaning}
      class:override={!!iconOverride}
      class:is-custom={overrideIsCustom}
      style={iconOverride ? 'color: var(--vc);' : ''}
    >
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <span class="icon-span" class:spin={isCleaning}><Icon name={iconOverride} entity={entity} size="100%" /></span>
        {/if}
      {:else}
        <span class="icon-span" class:spin={isCleaning}><Icon name="bot" size="100%" /></span>
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
    {#if showActionRow}
      <div class="actions">
        {#if !isDocked}
          <button class="action-btn" onclick={() => entityId && vacuumService.returnToBase(entityId)} aria-label="Return to dock">
            <Icon name="home" />
            {#if showActionLabels}<span>Dock</span>{/if}
          </button>
        {/if}
        <button class="action-btn" onclick={() => entityId && vacuumService.locate(entityId)} aria-label="Locate">
          <Icon name="map-pin" />
          {#if showActionLabels}<span>Find</span>{/if}
        </button>
        {#if isPaused}
          <button class="action-btn primary" onclick={() => entityId && vacuumService.start(entityId)} aria-label="Resume">
            <Icon name="play" />
            {#if showActionLabels}<span>Resume</span>{/if}
          </button>
        {/if}
      </div>
    {/if}
    {#if showSpeedChips}
      <div class="speeds">
        {#each fanSpeeds as s}
          <button class="speed-chip" class:active={fanSpeed === s}
            onclick={() => entityId && vacuumService.setFanSpeed(entityId, s)}>{s}</button>
        {/each}
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Vacuum icon (visual only) ───────────────────────────────────────── */
  .vac-icon {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .vac-icon.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  .vac-icon.cleaning {
    color: var(--color-on);
    background: color-mix(in srgb, var(--color-on) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-on) 40%, transparent);
  }

  .vac-icon.override {
    background: transparent;
    border-color: transparent;
  }
  .vac-icon.override.cleaning {
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
    background: transparent;
    color: var(--color-on);
    border-color: transparent;
  }

  /* ── Speed chips ──────────────────────────────────────────────────────── */
  .speeds {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.3);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .speed-chip {
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
  }

  .speed-chip.active {
    background: transparent;
    color: var(--accent);
    border-color: transparent;
  }
</style>
