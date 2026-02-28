<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { lawnMowerService } from '$lib/ha/services';

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
  const state = $derived(entity?.state ?? 'idle');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Lawn Mower');
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
  const showStateLine = $derived(sizePreset !== 'sm');
</script>

<div class="lm-tile" data-size={sizePreset} class:mowing={isMowing} style="--lmc: {stateColor};">

  <div class="tile-content">
    <div class="top">
      <button class="mow-btn" onclick={() => entityId && (isMowing ? lawnMowerService.pause(entityId) : lawnMowerService.startMowing(entityId))}
        aria-label={isMowing ? 'Pause' : 'Start mowing'}>
        <span class:spin={isMowing}><Icon name="scissors" /></span>
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
      {#if showStateLine}<span class="state-text">{stateLabel}</span>{/if}
    </div>
  </div>

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
</div>

<style>
  .lm-tile {
    --lmc: var(--fg-muted);
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: 8px;
  }

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

  .mow-btn {
    all: unset;
    width: 50px;
    height: 50px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .lm-tile.mowing .mow-btn {
    color: var(--color-on);
    background: color-mix(in srgb, var(--color-on) 16%, transparent);
    border-color: color-mix(in srgb, var(--color-on) 40%, transparent);
  }

  .spin { animation: spin 2s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .battery-badge {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 2px 6px;
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  .lm-tile.mowing .state-text,
  .lm-tile.mowing .name-text {
    color: #4b5254; }

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

  .action-btn.primary {
    background: color-mix(in srgb, var(--color-on) 18%, transparent);
    color: var(--color-on);
    border-color: color-mix(in srgb, var(--color-on) 35%, transparent);
  }

  @container tile (max-width: 160px) { .actions span { display: none; } }
  @container tile (max-width: 110px) {
    .mow-btn { width: 38px; height: 38px; }
    .battery-badge { display: none; }
  }
  @container tile (max-width: 90px) {  .actions { display: none; } }

  @container tile (max-height: 120px) { .actions { display: none; } }
  @container tile (max-height: 90px) { .mow-btn { width: 38px; height: 38px; } }

  @container tile (max-height: 80px) {
    .lm-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .actions { display: none; }
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
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
