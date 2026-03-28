<script lang="ts">
  // ── MediaPlayerTile ───────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import CircleControl from '$lib/components/ui/CircleControl.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Marquee from '$lib/components/ui/Marquee.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';
  import { mediaService } from '$lib/ha/services';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const isSm = $derived(sizePreset === 'sm');
  const isMd = $derived(sizePreset === 'md');
  const isLg = $derived(sizePreset === 'lg');
  const isXl = $derived(sizePreset === 'xl');
  const isHero = $derived(isLg || isXl);

  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);

  const entityState = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const isOn = $derived.by(() => {
    const s = entityState.toLowerCase();
    return s !== 'off' && s !== 'idle';
  });
  const mediaOn = $derived(isOn);
  const mediaOff = $derived(!isOn);
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
  const volumePct = $derived.by(() => {
    const raw = attrs.volume_level as number | undefined;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    return Math.max(0, Math.min(100, Math.round(raw * 100)));
  });
  
  // State row (used by BaseTile): always show player state label, not media metadata.
  const displayState = $derived.by(() => {
    if (entityState === 'off' || entityState === 'idle' || entityState === 'standby') return 'Off';
    if (entityState === 'paused') return 'Paused';
    if (entityState === 'playing') return 'Playing';
    if (entityState === 'buffering') return 'Buffering';
    return entityState ? entityState.charAt(0).toUpperCase() + entityState.slice(1) : 'Off';
  });

  // ── Hero Metadata (2x2+) ──────────────────────────────────────────────────
  const heroTitle = $derived.by(() => {
    if (!isOn) return name;
    return track || artist || name;
  });
  const heroSubtitle = $derived.by(() => {
    if (!isOn) return displayState;
    if (artist) return artist;
    if (track) return isPlaying ? 'Playing' : entityState === 'paused' ? 'Paused' : entityState;
    return displayState;
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  function togglePlay() {
    if (!entity?.entity_id) return;
    mediaService.playPause(entity.entity_id).catch(() => {});
  }

  function prevTrack() {
    if (!entity?.entity_id) return;
    mediaService.previous(entity.entity_id).catch(() => {});
  }

  function nextTrack() {
    if (!entity?.entity_id) return;
    mediaService.next(entity.entity_id).catch(() => {});
  }
</script>

{#if isHero}
  <div
    class="media-hero"
    class:media-on={mediaOn}
    class:media-off={mediaOff}
    class:has-artwork={hasArtwork}
    style="
      background-image: {hasArtwork
        ? `url(${mediaImage})`
        : isOn
          ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)'
          : 'linear-gradient(0deg, rgba(115, 115, 115, 0.2) 0%, rgba(115, 115, 115, 0.2) 100%)'
      };
      color: {mediaOff || !entity
        ? 'rgba(255, 255, 255, 0.3)'
        : mediaOn && !hasArtwork
          ? 'rgba(0, 0, 0, 0.6)'
          : '#efefef'
      };
      text-shadow: {hasArtwork && mediaOn
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
        <span class="name-text">{heroTitle}</span>
        {#if heroSubtitle}
          <Marquee text={heroSubtitle} class="state-marquee" />
        {/if}
      </div>
    </div>
  </div>
{:else if isMd}
  <!-- ── Medium bar layout ──────────────────────────────────────── -->
  <div class="mp-md" class:mp-md--tall={isTallMd} class:on={isOn} class:playing={isPlaying}>

    <!-- Left: album artwork or icon fallback -->
    <div class="mp-md__art">
      {#if hasArtwork && isOn}
        <img src={mediaImage} alt="Album art" class="mp-md__img" />
      {:else}
        <div class="mp-md__art-icon" class:on={isOn}>
          {#if iconIsCustom}
            <Icon name={iconName} entity={entity} />
          {:else}
            <Icon name={iconName} entity={entity} size="100%" />
          {/if}
        </div>
      {/if}
    </div>

  <!-- Centre: track + entity name -->
    <div class="mp-md__info">
      <Marquee text={isOn && primaryMeta ? primaryMeta : name} class="mp-md__track" />
      <span class="mp-md__sub">{isOn && primaryMeta ? (secondaryMeta || name) : displayState}</span>
    </div>

    <!-- Right: transport controls -->
    <div class="mp-md__controls">
      <button
        class="mp-md__btn"
        onclick={(e) => { e.stopPropagation(); prevTrack(); }}
        disabled={!isOn}
        aria-label="Previous track"
      >
        <Icon name="skip-back" />
      </button>
      <button
        class="mp-md__btn mp-md__btn--play"
        class:active={isPlaying}
        onclick={(e) => { e.stopPropagation(); togglePlay(); }}
        disabled={!entity}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        <Icon name={isPlaying ? 'pause' : 'play'} />
      </button>
      <button
        class="mp-md__btn"
        onclick={(e) => { e.stopPropagation(); nextTrack(); }}
        disabled={!isOn}
        aria-label="Next track"
      >
        <Icon name="skip-forward" />
      </button>
    </div>
  </div>
{:else}
  <BaseTile {name} state={entityState || 'off'} {isOn}>
    {#snippet icon()}
      {#if iconIsCustom}
        <Icon name={iconName} entity={entity} />
      {:else}
        <div class="mp-icon-wrap" class:isPlaying>
          <Icon name={iconName} entity={entity} size="100%" />
        </div>
      {/if}
    {/snippet}

    {#snippet circle()}
      {#if isSm && isPlaying && volumePct !== null}
        <CircleControl
          value={volumePct}
          isOn={true}
          unit="%"
          min={0}
          max={100}
          label="Volume"
          hideRing={true}
        />
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
  /* ── Medium bar redesign ───────────────────────────────────────────────── */
  .mp-md {
    flex: 1;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    gap: calc(var(--tile-md-pad-x) * 0.5);
    padding-left: 0;
    padding-right: calc(var(--tile-md-pad-x) * 0.5);
  }

  .mp-md--tall {
    flex-direction: column;
    align-items: stretch;
  }

  /* Album art square — fits inside the bounded grid */
  .mp-md__art {
    height: 100%;
    aspect-ratio: 1;
    flex-shrink: 0;
    overflow: hidden;
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--control-chip-radius-compact);
  }

  .mp-md--tall .mp-md__art {
    width: 60%;
    height: auto;
    margin: 0 auto;
  }

  .mp-md__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .mp-md__art-icon {
    width: 44%;
    height: 44%;
    color: var(--fg-subtle);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mp-md__art-icon.on { color: var(--accent); }

  /* Track + entity info */
  .mp-md__info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-md-pad-y) * 0.3);
    flex: 1;
  }

  .mp-md--tall .mp-md__info {
    align-items: center;
    text-align: center;
  }

  :global(.mp-md__track) {
    font-size: calc(var(--button-card-font-size) * 1.05);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-on, var(--control-active-name));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.22;
    transition: color var(--transition);
    max-width: 100%;
  }

  .mp-md:not(.on) :global(.mp-md__track) {
    color: var(--tile-label-off, #97989c);
  }

  .mp-md__sub {
    font-size: calc(var(--button-card-font-size) * 0.82);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .mp-md__controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: calc(var(--tile-md-pad-x) * 0.5);
    flex-shrink: 0;
  }

  .mp-md--tall .mp-md__controls {
    justify-content: center;
    width: 100%;
  }

  .mp-md__btn {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--button-card-font-size) * 1.8);
    height: calc(var(--button-card-font-size) * 1.8);
    border-radius: 50%;
    color: var(--fg-muted);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--transition), color var(--transition), transform 80ms ease;
  }

  .mp-md__btn:not(:disabled):hover {
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    color: var(--fg);
  }

  .mp-md__btn:not(:disabled):active { transform: scale(0.88); }

  .mp-md__btn:disabled {
    opacity: 0.22;
    cursor: not-allowed;
  }

  .mp-md__btn :global(svg) {
    width: calc(var(--button-card-font-size) * 0.9);
    height: calc(var(--button-card-font-size) * 0.9);
  }

  /* Play / pause — larger, accented */
  .mp-md__btn--play {
    width: calc(var(--button-card-font-size) * 2.1);
    height: calc(var(--button-card-font-size) * 2.1);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    color: var(--fg);
  }

  .mp-md__btn--play.active {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
  }

  .mp-md__btn--play :global(svg) {
    width: calc(var(--button-card-font-size) * 1.0);
    height: calc(var(--button-card-font-size) * 1.0);
  }

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
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 62%);
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

</style>
