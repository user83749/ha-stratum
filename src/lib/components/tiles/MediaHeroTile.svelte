<script lang="ts">
  // ── MediaHeroTile ────────────────────────────────────────────────────────

  // ── Imports ─────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Marquee from '$lib/components/ui/Marquee.svelte';
  import { optimisticEntities } from '$lib/ha/optimistic';
  import { isCustomIcon } from '$lib/icons/customIcons';
  import { clockNow } from '$lib/stores/clock';

  // ── Types ─────────────────────────────────────────────────────────────
  export interface PlayerMapEntry {
    state: string;           // state value used to select the mapped player
    entity_id: string;       // target media player entity
    picture_entity?: string; // optional entity used as artwork source
    name?: string;           // optional display name override
    icon?: string;           // optional icon override
  }

  // ── Props ─────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Base Config ────────────────────────────────────────────────────────
  const config = $derived(tile.config);

  // ── Active Entity Resolution ─────────────────────────────────────────────────────────────

  const switcherId     = $derived(config.switcher_entity_id as string | undefined);
  const switcherEntity = $derived(switcherId ? ($optimisticEntities[switcherId] ?? null) : null);
  const switcherState  = $derived(switcherEntity?.state?.trim() ?? entity?.state?.trim() ?? '');

  const playerMap     = $derived((config.player_map ?? []) as PlayerMapEntry[]);

  // Match current state to a mapped player entry when available.
  const mappedEntry = $derived.by(() => {
    if (!playerMap.length || !switcherState) return null;
    const s = switcherState.toLowerCase();
    return playerMap.find(e => e.state.trim().toLowerCase() === s) ?? null;
  });

  // Prefer mapped player; otherwise use tile/entity fallback.
  const activeEntityId = $derived(mappedEntry?.entity_id ?? entity?.entity_id ?? '');
  const activeEntity   = $derived(activeEntityId ? ($optimisticEntities[activeEntityId] ?? null) : null);
  const activeAttrs    = $derived(activeEntity?.attributes ?? {});

  // Optional metadata aggregator entity.
  const sensorEntityId = $derived((config.sensor_entity as string | undefined) ?? '');
  const sensorEntity   = $derived(sensorEntityId ? ($optimisticEntities[sensorEntityId] ?? null) : null);
  const sensorAttrs    = $derived(sensorEntity?.attributes ?? {});

  // ── Playback State ─────────────────────────────────────────────────────────────

  const rawState = $derived(activeEntity?.state ?? 'off');

  const MEDIA_ON  = ['on', 'playing', 'paused', 'idle', 'active'];
  const MEDIA_OFF = ['off', 'standby', 'unknown', 'unavailable', '0'];

  const mediaOn   = $derived(MEDIA_ON.includes(rawState.toLowerCase()));
  const mediaOff  = $derived(MEDIA_OFF.includes(rawState.toLowerCase()));
  const isPlaying = $derived(rawState.toLowerCase() === 'playing');

  // ── Metadata Parsing ─────────────────────────────────────────────────────────────

  const dataList = $derived(activeAttrs.data as any[] | undefined);
  
  // Pick a random item once per data-list length change, not on every WS tick.
  // Using a plain closure variable to track the previous length avoids
  // treating a re-created array (same length) as a meaningful change.
  // ── Local State ────────────────────────────────────────────────────────
  let _prevDataLen = -1;
  let dataIdx = $state(0);
  $effect(() => {
    const len = dataList?.length ?? 0;
    if (len === _prevDataLen) return;
    _prevDataLen = len;
    dataIdx = len <= 1 ? 0 : Math.floor(Math.random() * (len - 1)) + 1;
  });

  const currentItem = $derived(dataList && dataList[dataIdx] ? dataList[dataIdx] : null);

  const displayName = $derived(
    mappedEntry?.name ||
    (config.name as string | undefined) ||
    (activeEntity?.attributes?.friendly_name as string | undefined) ||
    ''
  );

  const displayState = $derived.by(() => {
    if (!activeEntity) return 'Unknown';

    // Aggregator active-state display.
    if (rawState === 'Active') {
      const title = activeAttrs.title || '';
      const s_e   = activeAttrs.number;
      const number = (s_e === undefined && title !== undefined) ? ' ' : ` · ${s_e}`;
      return `${title}${number}`;
    }

    // Data-array item display.
    if (dataList !== undefined && currentItem) {
      const title = currentItem.title || '';
      let number = '';
      if (currentItem.number === undefined && currentItem.aired !== undefined) {
        number = ` (${currentItem.aired.split('-')[0]})`;
      } else if (currentItem.number === undefined && currentItem.aired === undefined) {
        number = ' ';
      } else {
        number = ` · ${currentItem.number}`;
      }
      return `${title}${number}`;
    }

    // Standard media metadata fallback.
    const media_artist = activeAttrs.media_artist;
    const media_title = activeAttrs.media_title;
    if (media_artist && media_title) return `${media_artist} - ${media_title}`;
    if (media_title) return media_title as string;
    if (media_artist) return media_artist as string;

    return 'Idle';
  });

  const iconName = $derived(
    mappedEntry?.icon ||
    (config.icon as string | undefined) ||
    'tv-2'
  );
  const iconIsCustom = $derived(typeof iconName === 'string' && isCustomIcon(iconName));

  // ── Artwork Resolution ─────────────────────────────────────────────────────────────

  const pictureEntityId = $derived(mappedEntry?.picture_entity);
  const pictureEntity   = $derived(pictureEntityId ? ($optimisticEntities[pictureEntityId] ?? null) : null);

  const mediaImages = $derived.by(() => {
    const imgs: string[] = [];
    if (config.entity_picture) imgs.push(config.entity_picture as string);

    // Mapped picture entity.
    const fromPicEntity = pictureEntity?.attributes.entity_picture as string | undefined;
    if (fromPicEntity) imgs.push(fromPicEntity);

    // Current data-item artwork fields.
    if (currentItem) {
      if (currentItem.fanart) imgs.push(currentItem.fanart);
      if (currentItem.poster) imgs.push(currentItem.poster);
      if (currentItem.entity_picture) imgs.push(currentItem.entity_picture);
    }

    // Fallback artwork sources.
    const fromSensor = sensorAttrs.entity_picture as string | undefined;
    if (fromSensor && fromSensor !== 'null') imgs.push(fromSensor);

    if (activeAttrs.fanart) imgs.push(activeAttrs.fanart as string);
    if (activeAttrs.poster) imgs.push(activeAttrs.poster as string);
    if (activeAttrs.entity_picture) imgs.push(activeAttrs.entity_picture as string);

    return imgs.filter(Boolean);
  });

  const hasArtwork  = $derived(mediaImages.length > 0 && config.show_artwork !== false);
  const mainImage   = $derived(mediaImages[0] ?? null);

  const showIcon = $derived(config.show_icon !== false);

  // ── Progress ─────────────────────────────────────────────────────────────

  const mediaDuration     = $derived((sensorAttrs.media_duration as number) ?? (activeAttrs.media_duration as number) ?? 0);
  const mediaPosition     = $derived((sensorAttrs.media_position as number) ?? (activeAttrs.media_position as number) ?? 0);
  const positionUpdatedAt  = $derived((sensorAttrs.media_position_updated_at as string) ?? (activeAttrs.media_position_updated_at as string) ?? null);

  const livePosition = $derived.by(() => {
    if (!isPlaying || !positionUpdatedAt || !mediaDuration) return mediaPosition;
    const updatedMs = new Date(positionUpdatedAt).getTime();
    if (!Number.isFinite(updatedMs)) return mediaPosition;
    return Math.min(mediaPosition + ($clockNow - updatedMs) / 1000, mediaDuration);
  });

  const progressPct  = $derived(mediaDuration > 0 ? Math.min((livePosition / mediaDuration) * 100, 100) : 0);
  const showProgress = $derived(config.show_progress !== false && mediaDuration > 0 && mediaOn);
</script>

<!-- ── Tile Root ───────────────────────────────────────────────────────────── -->
<div
  class="media-hero"
  class:media-on={mediaOn}
  class:media-off={mediaOff}
  class:has-artwork={hasArtwork}
  style="
    background-image: {hasArtwork
      ? `${mediaImages.map(img => `url(${img})`).join(', ')}`
      : mediaOn && !hasArtwork
        ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.8) 100%)'
        : 'linear-gradient(0deg, rgba(115, 115, 115, 0.2) 0%, rgba(115, 115, 115, 0.2) 100%)'
    };
    color: {mediaOff || !entity
      ? 'rgba(255, 255, 255, 0.3)'
      : mediaOn && !hasArtwork
        ? 'rgba(0, 0, 0, 0.6)'
        : (rawState === 'Active' ? 'rgba(239, 239, 239, 0.5)' : '#efefef')
    };
    text-shadow: {hasArtwork && mediaOn
      ? '1px 1px 5px rgba(18, 22, 23, 0.9)'
      : 'none'
    };
  "
>
  <!-- ── Tile Content ───────────────────────────────────────────────────────────── -->
  <div class="card-grid">

		    <!-- ── Icon ───────────────────────────────────────────────────────────── -->
		    {#if showIcon}
	      <div class="icon-field">
	        <div class="icon-inner">
	          <Icon name={iconName} entity={activeEntity} />
	        </div>
	      </div>
		    {/if}

    <!-- ── Spacer ───────────────────────────────────────────────────────────── -->
    <div class="spacer-field"></div>

    <!-- ── Bottom Meta ───────────────────────────────────────────────────────────── -->
    <div class="bottom-field">
      {#if showProgress}
        <div class="progress-bar" aria-hidden="true">
          <div class="progress-fill" style="width: {progressPct}%"></div>
        </div>
      {/if}
      <span class="name-text">{displayName}</span>
      {#if displayState}
        <Marquee text={displayState} class="state-marquee" />
      {/if}
    </div>

  </div>
</div>

<style>
  /* ── Card shell ────────────────────────────────────────────────────────────── */
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

  /* Artwork scrim: keeps bottom text readable without darkening the entire image. */
  .media-hero.has-artwork::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0) 62%);
    pointer-events: none;
    z-index: 0;
  }

  /* ── Grid layout ──────────────────────────────────────────────────────────── */
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

  /* ── Icon ───────────────────────────────────────────────────────────── */
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

  /* ── Spacer ────────────────────────────────────────────────────────────────── */
  .spacer-field { grid-area: spacer; }

  /* ── Bottom (name + state stacked) ─────────────────────────────────────────── */
  .bottom-field {
    grid-area: bottom;
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-padding-effective, var(--tile-padding, 10px)) * 0.3);
    padding-bottom: 3.25%;
    min-width: 0;
    overflow: visible;
  }

  /* Name label inherits card typography with tuned line-height for readability. */
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

  /* ── Progress bar ─────────────────────────────────────────────────────────── */
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

  /* On solid surface (no artwork, active): use accent */
  .media-on:not(.has-artwork) .progress-bar { background: color-mix(in srgb, var(--accent) 20%, transparent); }
  .media-on:not(.has-artwork) .progress-fill { background: var(--accent); }
</style>
