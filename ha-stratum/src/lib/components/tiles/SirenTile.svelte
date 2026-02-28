<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { sirenService } from '$lib/ha/services';

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
  const isOn = $derived(entity?.state === 'on');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Siren');
  const tones = $derived((attrs.available_tones as string[]) ?? []);
  const currentTone = $derived(attrs.tone as string ?? '');
  const showToneChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && tones.length > 0 && isOn);

  function toggle() {
    if (!entityId) return;
    if (isOn) sirenService.turnOff(entityId);
    else sirenService.turnOn(entityId);
  }
</script>

<div class="siren-tile" class:on={isOn} data-size={sizePreset}>

  <div class="tile-content">
    <div class="top">
      <button class="siren-btn" class:on={isOn} onclick={toggle} aria-label={isOn ? 'Turn off' : 'Turn on'}>
        <span class:pulse={isOn}><Icon name="siren" size={32} /></span>
      </button>
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{isOn ? 'Sounding' : 'Silent'}</span>
    </div>
  </div>

  {#if showToneChips}
    <div class="tones">
      {#each tones.slice(0, 4) as t}
        <button class="tone-chip" class:active={currentTone === t}
          onclick={() => entityId && sirenService.turnOn(entityId, t)}>{t}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .siren-tile {
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

  .top { display: flex; }

  .siren-btn {
    all: unset;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  /* Inner control chip only: this styles the siren button itself.
     It must not be used as the main active tile-face treatment. */
  .siren-btn.on {
    /* Changes the icon glyph color only. */
    color: var(--color-danger);
    /* Changes the square icon-chip fill only. */
    background: color-mix(in srgb, var(--color-danger) 20%, transparent);
    /* Changes the square icon-chip border only. */
    border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
  }

  .pulse { animation: siren-pulse 0.5s ease-in-out infinite alternate; display: flex; }
  @keyframes siren-pulse { from { transform: scale(0.85); } to { transform: scale(1.15); } }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  /* Changes the active name text only. */
  .siren-tile.on .name-text { color: var(--control-active-name); }

  /* Changes the active state text only. */
  .siren-tile.on .state-text { color: var(--control-active-name); }

  .tones {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .tone-chip {
    all: unset;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  /* Inner tone chip only: active text state, not tile background. */
  .tone-chip.active {
    /* Changes the tone chip fill only. */
    background: transparent;
    /* Changes the tone chip text only. */
    color: var(--color-danger);
    /* Changes the tone chip border only. */
    border-color: transparent;
  }

  @container tile (max-width: 180px) { .tones { display: none; } }
  @container tile (max-height: 100px) { .tones { display: none; } }
  @container tile (max-height: 80px) {
    .siren-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .tones { display: none; }
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
