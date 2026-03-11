<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Map');
  const lat = $derived((entity?.attributes?.latitude ?? config.latitude) as number | undefined);
  const lon = $derived((entity?.attributes?.longitude ?? config.longitude) as number | undefined);
  const showLabel = $derived(sizePreset !== 'sm');
  const showCoords = $derived((sizePreset === 'lg' || sizePreset === 'xl') && lat !== undefined && lon !== undefined);

  const mapUrl = $derived.by(() => {
    if (lat === undefined || lon === undefined) return '';
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
  });
</script>

<div class="map-tile" data-size={sizePreset}>
  {#if mapUrl}
    <iframe src={mapUrl} title="{name} map" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe>
    {#if showLabel}
      <div class="overlay-label">
        <span>{name}</span>
        {#if showCoords}
          <span class="overlay-coords">{lat?.toFixed(3)}, {lon?.toFixed(3)}</span>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="empty">No location available</div>
  {/if}
</div>

<style>
  .map-tile {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: inherit;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: inherit;
    pointer-events: none;
  }

  .overlay-label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    padding: 4px 10px;
    background: color-mix(in srgb, var(--bg) 80%, transparent);
    border-radius: 20px;
    pointer-events: none;
    backdrop-filter: blur(8px);
  }

  .overlay-label span {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg);
  }

  .overlay-coords {
    display: block;
    font-size: var(--secondary-label-size);
    color: var(--fg-muted);
    margin-top: 2px;
    opacity: 0.7;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
  }
</style>
