<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { lockService } from '$lib/ha/services';

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
  const entityState = $derived(entity?.state ?? 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Lock');
  const isLocked = $derived(entityState === 'locked');
  const isJammed = $derived(entityState === 'jammed');
  const isUnlocked = $derived(entityState === 'unlocked');

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

<BaseTile {name} state={stateLabel} isOn={isLocked} style="--lc: {lockColor};">

  {#snippet icon()}
    <!-- Visual-only lock icon — tile tap handled by TileWrapper -->
    <div class="lock-icon" class:locked={isLocked} class:jammed={isJammed}>
      <Icon name={isLocked ? 'lock' : 'lock-open'} size="100%" />
    </div>
  {/snippet}

  {#snippet below()}
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
  {/snippet}

</BaseTile>

<style>
  /* ── Lock icon (visual only) ─────────────────────────────────────────── */
  .lock-icon {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--lc);
    background: color-mix(in srgb, var(--lc) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--lc) var(--control-chip-border-strength), var(--border));
    transition: all var(--transition);
  }

  /* Changes the icon chip when locked. */
  .lock-icon.locked {
    background: color-mix(in srgb, var(--lc) 18%, transparent);
    border-color: color-mix(in srgb, var(--lc) 35%, var(--border));
  }

  /* Changes the icon chip when jammed — danger color override. */
  .lock-icon.jammed {
    background: color-mix(in srgb, var(--color-danger) 20%, transparent);
    border-color: color-mix(in srgb, var(--color-danger) 40%, var(--border));
  }

  /* ── Action button ───────────────────────────────────────────────────── */
  .action-btn {
    all: unset;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: var(--action-icon-size);
    border-radius: 99px;
    font-size: var(--secondary-label-size);
    font-weight: 500;
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
</style>
