<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Marquee from '$lib/components/ui/Marquee.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const is1x1 = $derived(layoutW === 1 && layoutH === 1);
  const isWide = $derived(layoutW >= 2 && layoutH === 1);

  const state = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const isOn = $derived(!['off', 'idle', 'standby', 'unknown', 'unavailable'].includes(state));
  const isPlaying = $derived(state === 'playing');
  
  const track = $derived(attrs.media_title as string ?? '');
  const artist = $derived(attrs.media_artist as string ?? '');
  const primaryMeta = $derived(track || artist || '');
  const secondaryMeta = $derived(track && artist ? artist : '');
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Media');
  const iconName = $derived(config.icon ?? (isPlaying ? 'music' : 'play'));
  const iconIsCustom = $derived(typeof iconName === 'string' && isCustomIcon(iconName));
  
  // State row: show track name when playing, artist when paused, else basic state label
  const displayState = $derived.by(() => {
    if (state === 'off' || state === 'idle' || state === 'standby') return 'Off';
    if (state === 'paused') return track || artist || 'Paused';
    if (isPlaying) return track || artist || 'Playing';
    return state;
  });
</script>

<BaseTile {name} state={displayState} {isOn}>
  {#snippet icon()}
    {#if iconIsCustom}
      <Icon name={iconName} entity={entity} />
    {:else}
      <div class="mp-icon-wrap" class:isPlaying>
        <Icon name={iconName} entity={entity} size="100%" />
      </div>
    {/if}
  {/snippet}

  {#snippet below()}
     {#if isOn && primaryMeta && !is1x1}
       <div class="mp-details" class:wide={isWide}>
          {#if isWide}
            <span class="track-static">{primaryMeta}</span>
          {:else}
            <Marquee text={primaryMeta} class="track-info" />
          {/if}
          {#if secondaryMeta}<span class="artist-info">{secondaryMeta}</span>{/if}
       </div>
     {/if}
  {/snippet}
</BaseTile>

<style>
  .mp-icon-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    opacity: 0.9;
  }
  .mp-icon-wrap.isPlaying { color: var(--color-on); }

  .mp-details {
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    opacity: 0.9;
    min-width: 0;
    max-width: 100%;
  }

  .mp-details.wide {
    margin-top: 1px;
    gap: 0;
    line-height: 1.15;
  }

  .track-static {
    display: block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    line-height: 1.15;
  }
  :global(.track-info) {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    line-height: 1.15;
    max-width: 100%;
  }
  .artist-info {
    font-size: var(--secondary-label-size);
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
  }
</style>
