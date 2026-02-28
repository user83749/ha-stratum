<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { vacuumService } from '$lib/ha/services';

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
  const state = $derived(entity?.state ?? 'docked');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Vacuum');
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
  const showBatteryBadge = $derived(battery !== undefined && sizePreset !== 'sm');
  const showActionRow = $derived(sizePreset !== 'sm');
  const showSpeedChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && fanSpeeds.length > 0);
</script>

<div class="vacuum-tile" class:cleaning={isCleaning} data-size={sizePreset} style="--vc: {stateColor};">

  <div class="tile-content">
    <div class="top">
      <!-- Big round vacuum button — spins when cleaning -->
      <button class="vac-btn" onclick={() => entityId && (isCleaning ? vacuumService.pause(entityId) : vacuumService.start(entityId))}
        aria-label={isCleaning ? 'Pause' : 'Start cleaning'}>
        <span class:spin={isCleaning}><Icon name="bot" /></span>
      </button>
      {#if showBatteryBadge}
        <span class="battery-badge">
          <Icon name="battery" size={11} />
          {battery}%
        </span>
      {/if}
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{stateLabel}</span>
    </div>
  </div>

  <!-- Action row -->
  {#if showActionRow}
  <div class="actions">
    {#if !isDocked}
      <button class="action-btn" onclick={() => entityId && vacuumService.returnToBase(entityId)} aria-label="Return to dock">
        <Icon name="home" />
        <span>Dock</span>
      </button>
    {/if}
    <button class="action-btn" onclick={() => entityId && vacuumService.locate(entityId)} aria-label="Locate">
      <Icon name="map-pin" />
      <span>Find</span>
    </button>
    {#if isPaused}
      <button class="action-btn primary" onclick={() => entityId && vacuumService.start(entityId)} aria-label="Resume">
        <Icon name="play" />
        <span>Resume</span>
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
</div>

<style>
  .vacuum-tile {
    --vc: var(--fg-muted);
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

  /* ── Vacuum button ──────────────────────────────────────────────────────── */
  .vac-btn {
    all: unset;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
    flex-shrink: 0;
  }

  /* Inner control chip only: this styles the round vacuum button itself.
     It must not be used as the main active tile-face treatment. */
  .vacuum-tile.cleaning .vac-btn {
    /* Changes the icon glyph color only. */
    color: var(--color-on);
    /* Changes the round icon-chip fill only. */
    background: color-mix(in srgb, var(--color-on) 16%, transparent);
    /* Changes the round icon-chip border only. */
    border-color: color-mix(in srgb, var(--color-on) 40%, transparent);
  }

  .spin { animation: spin 2s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Status badge only: keep information visible without painting a second
     filled chip on top of the shared active tile surface. */
  .battery-badge {
    /* Changes the battery badge text only unless fill/border are edited below. */
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--fg-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 99px;
    padding: 2px 6px;
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  /* Changes the active name text only. */
  .vacuum-tile.cleaning .name-text { color: var(--control-active-name); }

  /* Changes the active state text only. */
  .vacuum-tile.cleaning .state-text { color: var(--control-active-name); }

  /* ── Actions ────────────────────────────────────────────────────────────── */
  .actions {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 5px;
    flex-shrink: 0;
  }

  .action-btn {
    all: unset;
    flex: 1;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 0.65rem;
    font-weight: 700;
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

  /* Primary action chip only: accent text state, not tile background. */
  .action-btn.primary {
    /* Changes the primary action chip fill only. */
    background: transparent;
    /* Changes the primary action chip text only. */
    color: var(--color-on);
    /* Changes the primary action chip border only. */
    border-color: transparent;
  }

  /* ── Speed chips ────────────────────────────────────────────────────────── */
  .speeds {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .speed-chip {
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

  /* Inner speed chip only: active text state, not tile background. */
  .speed-chip.active {
    /* Changes the speed chip fill only. */
    background: transparent;
    /* Changes the speed chip text only. */
    color: var(--accent);
    /* Changes the speed chip border only. */
    border-color: transparent;
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @container tile (max-width: 180px) { .speeds { display: none; } }
  @container tile (max-width: 140px) { .actions span { display: none; } }
  @container tile (max-width: 110px) {
    .vac-btn { width: 38px; height: 38px; }
    .battery-badge { display: none; }
  }
  @container tile (max-width: 90px) {  .actions { display: none; } }

  @container tile (max-height: 140px) { .speeds { display: none; } }
  @container tile (max-height: 110px) { .actions { display: none; } }
  @container tile (max-height: 90px) { .vac-btn { width: 38px; height: 38px; } }

  @container tile (max-height: 80px) {
    .vacuum-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .actions, .speeds { display: none; }
  }
  @container tile (max-width: 100px) { .battery-badge { display: none; } }

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
    color: var(--fg);
    transition: color var(--transition);
  }

</style>
