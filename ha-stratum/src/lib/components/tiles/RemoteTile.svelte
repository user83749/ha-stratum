<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { callService } from '$lib/ha/services';

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
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Remote');
  const isOn = $derived(entity?.state === 'on');
  const showHeader = $derived(sizePreset !== 'sm');
  const showAuxRows = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  function send(command: string) {
    if (!entityId) return;
    callService('remote', 'send_command', { command }, { entity_id: entityId });
  }
  function toggle() {
    if (!entityId) return;
    callService('remote', isOn ? 'turn_off' : 'turn_on', {}, { entity_id: entityId });
  }
</script>

<div class="remote-tile" class:on={isOn} data-size={sizePreset}>

  <!-- Name + power at top -->
  {#if showHeader}
  <div class="header">
    <span class="name-small">{name}</span>
    <button class="power-btn" class:on={isOn} onclick={toggle} aria-label={isOn ? 'Turn off' : 'Turn on'}>
      <Icon name="power" />
    </button>
  </div>
  {/if}

  <!-- D-pad centered -->
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
  .remote-tile {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    gap: 6px;
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
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  /* Changes the active remote title text only. */
  .remote-tile.on .name-small { color: var(--control-active-name); }

  .power-btn {
    all: unset;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-subtle);
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    transition: all var(--transition);
    flex-shrink: 0;
  }

  /* Inner control chip only: this styles the power button itself.
     It must not be used as the main active tile-face treatment. */
  .power-btn.on {
    /* Changes the icon glyph color only. */
    color: var(--accent);
    /* Changes the round power-chip fill only. */
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    /* Changes the round power-chip border only. */
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  }

  .dpad {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 36px 36px 36px;
    grid-template-rows: 36px 36px 36px;
    gap: 3px;
    flex-shrink: 0;
  }

  .dpad-btn {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    cursor: pointer;
    color: var(--fg-muted);
    font-size: 0.75rem;
    font-weight: 800;
    transition: all var(--transition);
    user-select: none;
  }

  .dpad-btn:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); color: var(--fg); }

  .dpad-btn.up { grid-column: 2; grid-row: 1; }
  .dpad-btn.left { grid-column: 1; grid-row: 2; }
  /* Center key only: accent foreground, but no filled block.
     The shared active tile surface should remain the dominant background. */
  .dpad-btn.center {
    grid-column: 2;
    grid-row: 2;
    /* Changes the center D-pad chip fill only. */
    background: transparent;
    /* Changes the center D-pad glyph only. */
    color: var(--accent);
    /* Changes the center D-pad border only. */
    border-color: transparent;
    font-size: 0.8rem;
  }
  .dpad-btn.center:hover { opacity: 0.85; }
  .dpad-btn.right { grid-column: 3; grid-row: 2; }
  .dpad-btn.down { grid-column: 2; grid-row: 3; }

  .action-row,
  .vol-row {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 5px;
    flex-shrink: 0;
  }

  .act-btn {
    all: unset;
    width: 36px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    cursor: pointer;
    color: var(--fg-muted);
    transition: all var(--transition);
  }

  .act-btn:hover { background: color-mix(in srgb, var(--fg) 14%, transparent); color: var(--fg); }

  .vol-label {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--fg-subtle);
    display: flex;
    align-items: center;
    flex: 1;
    justify-content: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @container tile (max-width: 140px) { .action-row, .vol-row { display: none; } }
  @container tile (max-height: 160px) { .vol-row { display: none; } }
  @container tile (max-height: 120px) { .action-row, .vol-row { display: none; } }
  @container tile (max-width: 100px) { .header { display: none; } }

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
