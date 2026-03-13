<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Marquee from '$lib/components/ui/Marquee.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';
  import { mediaService } from '$lib/ha/services';
  import { clockNow } from '$lib/stores/clock';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const isSm = $derived(sizePreset === 'sm');
  const isMd = $derived(sizePreset === 'md');
  const isLg = $derived(sizePreset === 'lg');
  const isXl = $derived(sizePreset === 'xl');
  const isHero = $derived(isLg || isXl);

  const entityState = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const isOn = $derived(!['off', 'idle', 'standby', 'unknown', 'unavailable'].includes(entityState));
  const isPlaying = $derived(entityState === 'playing');
  
  const track = $derived(attrs.media_title as string ?? '');
  const artist = $derived(attrs.media_artist as string ?? '');
  const primaryMeta = $derived(track || artist || '');
  const secondaryMeta = $derived(track && artist ? artist : '');
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Media');
  const iconName = $derived(config.icon ?? (isPlaying ? 'music' : 'play'));
  const iconIsCustom = $derived(typeof iconName === 'string' && isCustomIcon(iconName));
  const mediaImage = $derived(attrs.entity_picture as string | undefined);
  const hasArtwork = $derived(!!mediaImage);
  
  // State row: show track name when playing, artist when paused, else basic state label
  const displayState = $derived.by(() => {
    if (entityState === 'off' || entityState === 'idle' || entityState === 'standby') return 'Off';
    if (entityState === 'paused') return track || artist || 'Paused';
    if (isPlaying) return track || artist || 'Playing';
    return entityState;
  });

  const mediaDuration = $derived((attrs.media_duration as number) ?? 0);
  const mediaPosition = $derived((attrs.media_position as number) ?? 0);
  const positionUpdatedAt = $derived((attrs.media_position_updated_at as string) ?? null);

  const livePosition = $derived.by(() => {
    if (!isPlaying || !positionUpdatedAt || !mediaDuration) return mediaPosition;
    const updatedMs = new Date(positionUpdatedAt).getTime();
    if (!Number.isFinite(updatedMs)) return mediaPosition;
    return Math.min(mediaPosition + ($clockNow - updatedMs) / 1000, mediaDuration);
  });
  const progressPct = $derived(mediaDuration > 0 ? Math.min((livePosition / mediaDuration) * 100, 100) : 0);
  const showProgress = $derived(mediaDuration > 0 && isOn);
</script>

{#if isHero}
  <div
    class="media-hero"
    class:media-on={isOn}
    class:media-off={!isOn}
    class:has-artwork={hasArtwork}
    style="
      background-image: {hasArtwork
        ? `url(${mediaImage})`
        : isOn
          ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)'
          : 'linear-gradient(0deg, rgba(115, 115, 115, 0.2) 0%, rgba(115, 115, 115, 0.2) 100%)'
      };
      color: {!isOn || !entity
        ? 'rgba(255, 255, 255, 0.3)'
        : isOn && !hasArtwork
          ? 'rgba(0, 0, 0, 0.6)'
          : '#efefef'
      };
      text-shadow: {hasArtwork && isOn
        ? '1px 1px 5px rgba(18, 22, 23, 0.9)'
        : 'none'
      };
    "
  >
    <div class="card-grid">
      <div class="icon-field">
        <div class="icon-inner">
          <Icon name={iconName} entity={entity} />
        </div>
      </div>

      <div class="spacer-field"></div>

      <div class="bottom-field">
        {#if showProgress}
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-fill" style="width: {progressPct}%"></div>
          </div>
        {/if}
        <div class="bottom-info-row">
          <div class="meta-col">
            <span class="name-text">{isOn && primaryMeta ? primaryMeta : name}</span>
            {#if isOn && primaryMeta}
              <Marquee text={secondaryMeta || (isPlaying ? 'Playing' : entityState === 'paused' ? 'Paused' : entityState)} class="state-marquee" />
            {:else if displayState}
              <Marquee text={displayState} class="state-marquee" />
            {/if}
          </div>
          {#if isOn && entity?.entity_id}
            <div class="media-controls">
              <button class="hero-ctrl" aria-label="Previous" onclick={(e) => { e.stopPropagation(); mediaService.previous(entity.entity_id); }}>
                <Icon name="skip-back" size={16} />
              </button>
              <button class="hero-ctrl play-pause" aria-label={isPlaying ? 'Pause' : 'Play'} onclick={(e) => { e.stopPropagation(); mediaService.playPause(entity.entity_id); }}>
                <Icon name={isPlaying ? "pause" : "play"} size={18} />
              </button>
              <button class="hero-ctrl" aria-label="Next" onclick={(e) => { e.stopPropagation(); mediaService.next(entity.entity_id); }}>
                <Icon name="skip-forward" size={16} />
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
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
       {#if isOn && primaryMeta && !isSm}
         <div class="mp-details" class:wide={isMd}>
            {#if isMd}
              <span class="track-static">{primaryMeta}</span>
            {:else}
              <Marquee text={primaryMeta} class="track-info" />
            {/if}
            {#if !isMd && secondaryMeta}<span class="artist-info">{secondaryMeta}</span>{/if}
         </div>
       {/if}
    {/snippet}
  </BaseTile>
{/if}

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
    margin-top: calc(var(--button-card-font-size) * 0.15);
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.08);
    opacity: 0.9;
    min-width: 0;
    max-width: 100%;
  }

  .mp-details.wide {
    margin-top: calc(var(--button-card-font-size) * 0.08);
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

  /* ── Hero Style (lg/xl) ────────────────────────────────────────────────── */
  .media-hero {
    position: relative;
    width: calc(100% + var(--tile-padding, 10px) * 2);
    height: calc(100% + var(--tile-padding, 10px) * 2);
    margin: calc(var(--tile-padding, 10px) * -1);
    padding: 5.75% 5.75% 0 5.75%;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    overflow: hidden;
    box-sizing: border-box;
    background-color: transparent;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: background-image 0.5s ease, color 0.3s ease;
  }

  .media-hero.has-artwork::before {
    content: "";
    position: absolute;
    inset: 0;
    /* Darken bottom ~32% with a sharp cutoff line for readability */
    background: linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.8) 0%,
      rgba(0, 0, 0, 0.6) 32%,
      rgba(0, 0, 0, 0) 32.1%
    );
    pointer-events: none;
    z-index: 0;
  }

  .card-grid {
    position: relative;
    z-index: 1;
    flex: 1;
    display: grid;
    grid-template-rows: auto 1fr auto;
    grid-template-columns: 1fr;
    grid-template-areas:
      "icon"
      "spacer"
      "bottom";
    min-height: 0;
  }

  .icon-field {
    grid-area: icon;
    display: flex;
    align-items: flex-start;
    transition: opacity 0.3s ease;
  }

  .icon-inner {
    width: 20%;
    margin-left: 0;
    color: currentColor;
    fill: currentColor;
    transition: color 0.3s ease;
  }

  .spacer-field { grid-area: spacer; }

  .bottom-field {
    grid-area: bottom;
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-padding-effective, var(--tile-padding, 10px)) * 0.3);
    padding-bottom: 3.25%;
    min-width: 0;
    overflow: visible;
  }

  .bottom-info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: calc(var(--button-card-font-size) * 0.5);
    min-width: 0;
  }

  .meta-col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  .media-controls {
    display: flex;
    align-items: center;
    gap: calc(var(--button-card-font-size) * 0.3);
    flex-shrink: 0;
  }

  .hero-ctrl {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--button-card-font-size) * 2.2);
    height: calc(var(--button-card-font-size) * 2.2);
    border-radius: 50%;
    background: color-mix(in srgb, currentColor 8%, transparent);
    color: currentColor;
    cursor: pointer;
    transition: all var(--transition);
  }

  .hero-ctrl:hover {
    background: color-mix(in srgb, currentColor 15%, transparent);
  }

  .hero-ctrl:active {
    transform: scale(0.92);
  }

  .hero-ctrl.play-pause {
    background: color-mix(in srgb, currentColor 12%, transparent);
    width: calc(var(--button-card-font-size) * 2.5);
    height: calc(var(--button-card-font-size) * 2.5);
  }

  .name-text {
    justify-self: flex-start;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    line-height: 120%;
    color: rgba(255,255,255,0.6);
    padding: 0.2vw;
    margin: -0.2vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.state-marquee) {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    line-height: 120%;
    max-width: 100%;
    padding-bottom: 0;
    overflow: visible;
    text-shadow: 3px 1px 4px black;
  }

  .progress-bar {
    width: 100%;
    height: calc(var(--action-icon-size) * 0.14);
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.22);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: rgba(255, 255, 255, 0.82);
    transition: width 1s linear;
  }

  .media-on:not(.has-artwork) .progress-bar { background: color-mix(in srgb, var(--accent) 20%, transparent); }
  .media-on:not(.has-artwork) .progress-fill { background: var(--accent); }
</style>
