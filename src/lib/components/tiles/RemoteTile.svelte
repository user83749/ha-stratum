<script lang="ts">
  // ── RemoteTile ────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { callService } from '$lib/ha/services';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const isTallMd = $derived(false);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Remote');
  const isOn = $derived(entity?.state === 'on');
  const showHeader = $derived((sizePreset === 'lg' || sizePreset === 'xl') && !isTallMd);
  const showAuxRows = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  // ── Actions ───────────────────────────────────────────────────────────────
  function send(command: string) {
    if (!entityId) return;
    callService('remote', 'send_command', { command }, { entity_id: entityId });
  }
  function toggle() {
    if (!entityId) return;
    callService('remote', isOn ? 'turn_off' : 'turn_on', {}, { entity_id: entityId });
  }
</script>

<div class="remote-tile" class:on={isOn} class:is-tall-md={isTallMd} data-size={sizePreset}>

  {#if showHeader}
  <div class="header">
    <span class="name-small">{name}</span>
    <button class="power-btn" class:on={isOn} onclick={toggle} aria-label={isOn ? 'Turn off' : 'Turn on'}>
      <Icon name="power" />
    </button>
  </div>
  {/if}

  <div class="dpad">
    <button class="dpad-btn up" onclick={() => send('up')} aria-label="Up"><Icon name="chevron-up" /></button>
    <button class="dpad-btn left" onclick={() => send('left')} aria-label="Left"><Icon name="chevron-left" /></button>
    <button class="dpad-btn center" onclick={() => send('select')} aria-label="Select">OK</button>
    <button class="dpad-btn right" onclick={() => send('right')} aria-label="Right"><Icon name="chevron-right" /></button>
    <button class="dpad-btn down" onclick={() => send('down')} aria-label="Down"><Icon name="chevron-down" /></button>
  </div>

  {#if showAuxRows}
  <div class="action-row">
    <button class="act-btn" onclick={() => send('back')} aria-label="Back"><Icon name="arrow-left" /></button>
    <button class="act-btn" onclick={() => send('home')} aria-label="Home"><Icon name="home" /></button>
    <button class="act-btn" onclick={() => send('menu')} aria-label="Menu"><Icon name="menu" /></button>
  </div>
  {/if}

  {#if showAuxRows}
  <div class="vol-row">
    <button class="act-btn" onclick={() => send('volume_down')} aria-label="Volume down"><Icon name="volume-x" /></button>
    <span class="vol-label">Vol</span>
    <button class="act-btn" onclick={() => send('volume_up')} aria-label="Volume up"><Icon name="volume-2" /></button>
  </div>
  {/if}
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
  .remote-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    gap: calc(var(--tile-padding-effective) * 0.5);
    border-radius: inherit;
  }

  .header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    flex-shrink: 0;
  }

  .name-small {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .remote-tile.on .name-small { color: var(--tile-label-on, var(--control-active-name)); }

  .power-btn {
    all: unset;
    width: var(--action-icon-size);
    height: var(--action-icon-size);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--tile-label-off, #97989c);
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    transition: all var(--transition);
    flex-shrink: 0;
  }

  .power-btn.on {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  }

  .dpad {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, var(--action-icon-size-lg));
    grid-template-rows: repeat(3, var(--action-icon-size-lg));
    gap: calc(var(--tile-padding-effective) * 0.28);
    flex-shrink: 0;
    margin: auto;
  }

  .remote-tile.is-tall-md .dpad {
    grid-template-columns: repeat(3, var(--action-icon-size));
    grid-template-rows: repeat(3, var(--action-icon-size));
    gap: calc(var(--tile-padding-effective) * 0.34);
  }

  .dpad-btn {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--control-chip-radius-compact);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    cursor: pointer;
    color: var(--fg-muted);
    font-size: var(--secondary-label-size);
    font-weight: 500;
    transition: all var(--transition);
    user-select: none;
  }

  .dpad-btn:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); color: var(--fg); }

  .dpad-btn.up { grid-column: 2; grid-row: 1; }
  .dpad-btn.left { grid-column: 1; grid-row: 2; }
  .dpad-btn.center {
    grid-column: 2;
    grid-row: 2;
    background: transparent;
    color: var(--accent);
    border-color: transparent;
    font-size: var(--button-card-font-size);
  }
  .dpad-btn.center:hover { opacity: 0.85; }
  .dpad-btn.right { grid-column: 3; grid-row: 2; }
  .dpad-btn.down { grid-column: 2; grid-row: 3; }

  .action-row,
  .vol-row {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--tile-padding-effective) * 0.42);
    flex-shrink: 0;
  }

  .act-btn {
    all: unset;
    width: calc(var(--action-icon-size-lg) * 1.8);
    height: calc(var(--action-icon-size-lg) * 1.5);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--control-chip-radius-compact);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    cursor: pointer;
    color: var(--fg-muted);
    transition: all var(--transition);
  }

  .remote-tile.is-tall-md .header {
    margin-bottom: calc(var(--tile-padding-effective) * 0.18);
  }

  .act-btn:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); color: var(--fg); }

  .vol-label {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

</style>
