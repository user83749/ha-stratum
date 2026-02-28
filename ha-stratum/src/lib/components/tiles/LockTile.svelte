<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { lockService } from '$lib/ha/services';

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
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Lock');
  const isLocked = $derived(entityState === 'locked');
  const isUnlocked = $derived(entityState === 'unlocked');
  const isJammed = $derived(entityState === 'jammed');

  const lockColor = $derived(
    isJammed ? 'var(--color-danger)' :
    isLocked ? 'var(--color-on)' :
    'var(--color-warning)'
  );
  const stateLabel = $derived(isLocked ? 'Locked' : isJammed ? 'Jammed!' : isUnlocked ? 'Unlocked' : entityState);
  const showAction = $derived(sizePreset !== 'sm');

  let confirming = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout>;

  function handleToggle() {
    if (!entityId) return;
    if (isLocked) {
      if (!confirming) {
        confirming = true;
        confirmTimer = setTimeout(() => { confirming = false; }, 3000);
        return;
      }
      clearTimeout(confirmTimer);
      confirming = false;
      lockService.unlock(entityId);
    } else {
      lockService.lock(entityId);
    }
  }
</script>

<div class="lock-tile" class:locked={isLocked} class:jammed={isJammed} data-size={sizePreset} style="--lc: {lockColor};">

  <div class="tile-content">
    <div class="top">
      <div class="icon-wrap">
        <Icon name={isLocked ? 'lock' : 'lock-open'} />
      </div>
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{stateLabel}</span>
    </div>
  </div>

  <!-- Action button -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  {#if showAction}
  <button
    class="action-btn"
    class:confirming
    onclick={handleToggle}
    aria-label={confirming ? 'Confirm unlock' : isLocked ? 'Unlock' : 'Lock'}
  >
    {#if confirming}
      <span>Tap again to unlock</span>
    {:else if isLocked}
      <span>Unlock</span>
    {:else}
      <span>Lock</span>
    {/if}
  </button>
  {/if}
</div>

<style>
  .lock-tile {
    --lc: var(--fg-muted);
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

  .top { display: flex; }

  .icon-wrap {
    /* Base icon chip: these colors affect the lock icon chip itself, not the tile face. */
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--lc);
    background: color-mix(in srgb, var(--lc) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--lc) var(--control-chip-border-strength), var(--border));
    transition: all var(--transition);
  }

  .lock-tile.locked .icon-wrap {
    /* Changes the icon glyph color only. */
    color: var(--lc);
    /* Changes the icon chip fill only. */
    background: color-mix(in srgb, var(--lc) 18%, transparent);
    /* Changes the icon chip border only. */
    border-color: color-mix(in srgb, var(--lc) 35%, var(--border));
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  /* Changes the active name text only. */
  .lock-tile.locked .name-text { color: var(--control-active-name); }

  /* Changes the active state text only. */
  .lock-tile.locked .state-text { color: var(--control-active-name); }

  /* ── Action button ────────────────────────────────────────────────────── */
  .action-btn {
    all: unset;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    border-radius: 99px;
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--lc) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--lc) 35%, var(--border));
    color: var(--lc);
    transition: all var(--transition);
  }

  

  .action-btn.confirming {
    background: color-mix(in srgb, var(--color-danger) 22%, transparent);
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 40%, var(--border));
    animation: pulse 0.7s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.65; }
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @container tile (max-width: 140px) { .action-btn { font-size: 0.62rem; } }
  @container tile (max-width: 110px) {
    .icon-wrap {
      width: var(--control-chip-size-compact);
      height: var(--control-chip-size-compact);
      border-radius: var(--control-chip-radius-compact);
    }
    .action-btn { height: 28px; font-size: 0.6rem; }
  }
  @container tile (max-width: 90px) {   .action-btn { height: 24px; font-size: 0.56rem; } }
  @container tile (max-width: 75px) { .action-btn { display: none; } }

  @container tile (max-height: 130px) { .action-btn { height: 28px; font-size: 0.62rem; } }
  @container tile (max-height: 105px) { .action-btn { display: none; } }

  @container tile (max-height: 80px) {
    .lock-tile { flex-direction: row; align-items: center; gap: 8px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .action-btn { display: flex; margin-left: auto; height: 28px; font-size: 0.6rem; }
  }

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
