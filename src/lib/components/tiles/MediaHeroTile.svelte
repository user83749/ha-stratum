<script lang="ts">
  /**
   * MediaHeroTile — ports the HA conditional_media / base_media / media button-card templates.
   *
   * Layout:
   *   ┌─────────────────────────────────────┐
   *   │  [icon 30%]                         │  ← top-left (user-specified, e.g. icon_kodi/icon_sonos)
   *   │                                     │
   *   │  [name — dimmed]                    │  ← bottom, e.g. "Now Playing"
   *   │  [state/title marquee]              │  ← bottom, "artist - title", padding-bottom 4%
   *   └─────────────────────────────────────┘
   *
   * No explicit play/pause button — whole tile taps via TileWrapper tap_action.
   * Background: full-bleed artwork image with bottom-to-top gradient overlay.
   * Blur overlay: 110×110% copy of same image, blurred+darkened, inserted behind content.
   * Icon: user-specified per player entry (mirrors icon_kodi / icon_sonos / icon_tv templates).
   *       Hidden when artwork is present and media is on.
   * Name: card name field (e.g. "Now Playing", "Sonos"), dimmed, at bottom above state.
   * State: title marquee at bottom — "artist - title" or whichever exists.
   *
   * Actions (configured in TileEditor per tile):
   *   tap        → media_player.media_play_pause
   *   hold       → media_player.turn_off
   *   double-tap → more-info
   *
   * Config:
   *   entity            = select.conditional_media  (state = active player name)
   *   config.player_map = [{ state, entity_id, picture_entity?, name?, icon? }, …]
   *   config.sensor_entity = sensor.active_media_players  (pre-aggregated metadata)
   *   config.show_artwork  = true (default)
   *   config.show_progress = true (default)
   */
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Marquee from '$lib/components/ui/Marquee.svelte';
  import { optimisticEntities } from '$lib/ha/optimistic';
  import { isCustomIcon } from '$lib/icons/customIcons';

  export interface PlayerMapEntry {
    state: string;           // select/sensor state to match, e.g. "CoreELEC"
    entity_id: string;       // media_player.* to control
    picture_entity?: string; // entity whose entity_picture attr = artwork (e.g. sensor.kodi_poster)
    name?: string;           // friendly name override
    icon?: string;           // icon name override
  }

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);

  // ── Resolve the "Active" Player vs Fallback Entity ─────────────────────────

  const switcherId     = $derived(config.switcher_entity_id as string | undefined);
  const switcherEntity = $derived(switcherId ? ($optimisticEntities[switcherId] ?? null) : null);
  const switcherState  = $derived(switcherEntity?.state?.trim() ?? entity?.state?.trim() ?? '');

  const playerMap     = $derived((config.player_map ?? []) as PlayerMapEntry[]);

  // Find if current state matches a mapped media_player
  const mappedEntry = $derived.by(() => {
    if (!playerMap.length || !switcherState) return null;
    const s = switcherState.toLowerCase();
    return playerMap.find(e => e.state.trim().toLowerCase() === s) ?? null;
  });

  /**
   * RESOLUTION LOGIC:
   * 1. If switcher state matches a mapped entry -> Use that media_player.
   * 2. Otherwise -> Fall back to the tile's main entity (e.g. sensor.trakt).
   */
  const activeEntityId = $derived(mappedEntry?.entity_id ?? entity?.entity_id ?? '');
  const activeEntity   = $derived(activeEntityId ? ($optimisticEntities[activeEntityId] ?? null) : null);
  const activeAttrs    = $derived(activeEntity?.attributes ?? {});

  // Optional aggregator sensor (sensor.active_media_players)
  const sensorEntityId = $derived((config.sensor_entity as string | undefined) ?? '');
  const sensorEntity   = $derived(sensorEntityId ? ($optimisticEntities[sensorEntityId] ?? null) : null);
  const sensorAttrs    = $derived(sensorEntity?.attributes ?? {});

  // ── Playback / On State ───────────────────────────────────────────────────

  const rawState = $derived(activeEntity?.state ?? 'off');

  const MEDIA_ON  = ['on', 'playing', 'paused', 'idle', 'active'];
  const MEDIA_OFF = ['off', 'standby', 'unknown', 'unavailable', '0'];

  const mediaOn   = $derived(MEDIA_ON.includes(rawState.toLowerCase()));
  const mediaOff  = $derived(MEDIA_OFF.includes(rawState.toLowerCase()));
  const isPlaying = $derived(rawState.toLowerCase() === 'playing');

  // ── Metadata Parsing (strictly per YAML conditional_media) ─────────────────

  const dataList = $derived(activeAttrs.data as any[] | undefined);
  
  // Pick a random item once per data-list length change, not on every WS tick.
  // Using a plain closure variable to track the previous length avoids
  // treating a re-created array (same length) as a meaningful change.
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

    // 1. Aggregator Active State
    if (rawState === 'Active') {
      const title = activeAttrs.title || '';
      const s_e   = activeAttrs.number;
      const number = (s_e === undefined && title !== undefined) ? ' ' : ` · ${s_e}`;
      return `${title}${number}`;
    }

    // 2. Trakt / Data Array (Recommended index variables.i)
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

    // 3. Fallback Standard Media (Artist - Title)
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

  // ── Artwork Resolution ─────────────────────────────────────────────────────

  const pictureEntityId = $derived(mappedEntry?.picture_entity);
  const pictureEntity   = $derived(pictureEntityId ? ($optimisticEntities[pictureEntityId] ?? null) : null);

  const mediaImages = $derived.by(() => {
    const imgs: string[] = [];
    if (config.entity_picture) imgs.push(config.entity_picture as string);

    // 1. Check mapped picture_entity
    const fromPicEntity = pictureEntity?.attributes.entity_picture as string | undefined;
    if (fromPicEntity) imgs.push(fromPicEntity);

    // 2. Check current Trakt item attributes
    if (currentItem) {
      if (currentItem.fanart) imgs.push(currentItem.fanart);
      if (currentItem.poster) imgs.push(currentItem.poster);
      if (currentItem.entity_picture) imgs.push(currentItem.entity_picture);
    }

    // 3. Fallback to sensor aggregator or active entity
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

  // ── Progress Bar ───────────────────────────────────────────────────────────

  const mediaDuration     = $derived((sensorAttrs.media_duration as number) ?? (activeAttrs.media_duration as number) ?? 0);
  const mediaPosition     = $derived((sensorAttrs.media_position as number) ?? (activeAttrs.media_position as number) ?? 0);
  const positionUpdatedAt  = $derived((sensorAttrs.media_position_updated_at as string) ?? (activeAttrs.media_position_updated_at as string) ?? null);

  let livePosition = $state(0);
  $effect(() => {
    livePosition = mediaPosition;
    if (!isPlaying || !positionUpdatedAt || !mediaDuration) return;
    const updatedMs = new Date(positionUpdatedAt).getTime();
    const tick = () => { livePosition = Math.min(mediaPosition + (Date.now() - updatedMs) / 1000, mediaDuration); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  });

  const progressPct  = $derived(mediaDuration > 0 ? Math.min((livePosition / mediaDuration) * 100, 100) : 0);
  const showProgress = $derived(config.show_progress !== false && mediaDuration > 0 && mediaOn);
</script>

<!--
  Layout:
    ┌─[icon top-left]──────────────┐
    │                              │
    │                              │
    │ Now Playing    ← name        │
    │ artist - title ← state       │
    └──────────────────────────────┘  ← padding-bottom 4%
  Icon top-left (user-specified per player, e.g. icon_kodi/icon_sonos/icon_tv).
  Name + state stacked at bottom. No play button — whole tile taps via TileWrapper.
-->
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
  <!-- 
    blur_overlay: Bottom-weighted glass bar per YAML.
    Only blurs the area behind the text/labels for legibility.
  -->

  <!-- Card content -->
  <div class="card-grid">

	    <!-- Icon: top-left (HA conditional_media: custom_fields.icon always rendered). -->
	    {#if showIcon}
	      <div class="icon-field">
	        <div class="icon-inner">
	          <Icon name={iconName} entity={activeEntity} />
	        </div>
	      </div>
	    {/if}

    <!-- Spacer: fills middle area -->
    <div class="spacer-field"></div>

    <!-- Bottom: name + state stacked -->
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

	  /* ── Icon (top-left, HA conditional_media: custom_fields.icon width 30%) ─── */
	  .icon-field {
	    grid-area: icon;
	    display: flex;
	    align-items: flex-start;
	    transition: opacity 0.3s ease;
	  }

		.icon-inner {
			width: 24%;
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
    gap: 3px;
    padding-bottom: 3.25%;
    min-width: 0;
    overflow: visible;
  }

  /* name: dimmed label — inherits card font size, 120% line-height per HA template */
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
    height: 3px;
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
