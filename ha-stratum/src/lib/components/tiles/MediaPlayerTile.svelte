<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { mediaService } from '$lib/ha/services';

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
  const entityState = $derived(entity?.state ?? 'idle');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Media');
  
  const isOff = $derived(['off', 'idle', 'standby', 'unknown', 'unavailable'].includes(entityState));
  const isActive = $derived(!isOff);
  const isPlaying = $derived(entityState === 'playing');

  const mediaTitle = $derived(attrs.media_title as string ?? '');
  const mediaArtist = $derived(attrs.media_artist as string ?? '');
  const mediaImage = $derived(attrs.entity_picture as string ?? null);

  const displayTitle = $derived(mediaTitle || name);
  const displayState = $derived(mediaTitle ? mediaArtist || entityState : (isOff ? 'Off' : entityState));
  const showSecondaryLine = $derived(sizePreset !== 'sm');
  const showPrimaryAction = $derived(sizePreset !== 'sm' && isActive);
  const showTransportControls = $derived((sizePreset === 'lg' || sizePreset === 'xl') && isActive);

  const bgStyle = $derived(
    isOff
      ? 'linear-gradient(0deg, rgba(115, 115, 115, 0.2) 0%, rgba(115, 115, 115, 0.2) 100%)'
      : (isActive && !mediaImage)
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)'
        : `linear-gradient(0deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,0) 100%), url('${mediaImage}')`
  );

  const textColor = $derived(
    isOff ? '#97989c' : (isActive && !mediaImage) ? '#4b5254' : '#efefef'
  );

  const secondaryColor = $derived(
    isOff ? '#97989c' : (isActive && !mediaImage) ? '#4b5254' : 'rgba(239, 239, 239, 0.6)'
  );

  const textShadow = $derived(
    (isActive && mediaImage) ? '1px 1px 5px rgba(18, 22, 23, 0.9)' : 'none'
  );
</script>

<div class="mp-tile" data-size={sizePreset} style="background-image: {bgStyle}; color: {textColor}; text-shadow: {textShadow};">
  <div class="tile-content">
    
    <div class="top">
      {#if isOff || (!isOff && !mediaImage)}
         <div class="icon-wrap" style="color: {isOff ? '#9da0a2' : 'var(--accent)'}; width: 30%;">
            <!-- Use a generic music/media icon matching the standard layout if no custom SVG is provided in YAML -->
            <svg viewBox="0 0 24 24" class="top-icon">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
         </div>
      {/if}
    </div>

    <!-- Bottom: Info + controls -->
    <div class="bottom-area">
      <div class="track-info">
        <span class="track-title">{displayTitle}</span>
        {#if showSecondaryLine}
          <span class="track-artist" style="color: {secondaryColor}">{displayState}</span>
        {/if}
      </div>

      {#if showPrimaryAction}
      <div class="controls">
        {#if showTransportControls}
          <button class="mini-btn" onclick={(e) => { e.stopPropagation(); if (entityId) mediaService.previous(entityId); }} aria-label="Previous">
            <Icon name="skip-back" size={14} />
          </button>
        {/if}
        <!-- We use z-index to make sure clicks catch the play button properly -->
        <button class="play-btn" onclick={(e) => { e.stopPropagation(); if (entityId) mediaService.playPause(entityId); }} aria-label={isPlaying ? 'Pause' : 'Play'}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={18} />
        </button>
        {#if showTransportControls}
          <button class="mini-btn" onclick={(e) => { e.stopPropagation(); if (entityId) mediaService.next(entityId); }} aria-label="Next">
            <Icon name="skip-forward" size={14} />
          </button>
        {/if}
      </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .mp-tile {
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding: var(--tile-padding);
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: background 0.3s ease, color 0.3s ease;
  }

  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    min-height: 0;
  }

  .top {
    flex: 1;
    display: flex;
    align-items: flex-start;
  }

  .icon-wrap {
    width: 30%;
    max-width: 40px;
    margin-left: 2%;
    margin-top: 2%;
    opacity: 0.8;
  }

  .top-icon {
    width: 100%;
    height: 100%;
    margin-left: 2%;
  }

  .bottom-area {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    margin-top: auto;
  }

  .track-info {
    display: flex;
    flex-direction: column;
    gap: 0px;
    min-width: 0;
    flex: 1;
  }

  .track-title {
    font-size: 0.85rem;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    padding: 2px 0 2px 0;
  }

  .track-artist {
    font-size: 0.85rem;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
    }

  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-shrink: 0;
    margin-bottom: 2px;
    z-index: 5;
  }

  .mini-btn {
    all: unset;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.28);
    color: #efefef;
    border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
    transition: all var(--transition);
  }

  .play-btn {
    all: unset;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    background: rgba(0, 0, 0, 0.4);
    color: #efefef;
    transition: all var(--transition);
    border: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  }

  .play-btn:hover { background: rgba(0, 0, 0, 0.6); transform: scale(1.05); }


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
