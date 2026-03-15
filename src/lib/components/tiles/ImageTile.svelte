<script lang="ts">
  // ── ImageTile ─────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Image');
  const showName = $derived(config.show_name !== false);
  const objectFit = $derived((config as Record<string, unknown>).object_fit as string ?? 'cover');

  const imageUrl = $derived.by(() => {
    if (config.url) return config.url as string;
    if (entity?.attributes?.entity_picture) return entity.attributes.entity_picture as string;
    if (entity?.state?.startsWith('http')) return entity.state;
    return '';
  });

  // ── Local State ───────────────────────────────────────────────────────────
  let loaded = $state(false);
  let imgError = $state(false);

  $effect(() => {
    void imageUrl;
    loaded = false;
    imgError = false;
  });
</script>

<div class="image-tile" data-size={sizePreset}>
  {#if imageUrl && !imgError}
    <img
      src={imageUrl}
      alt={name}
      style="object-fit:{objectFit}"
      class:loaded
      onload={() => { loaded = true; }}
      onerror={() => { imgError = true; }}
    />
  {:else}
    <div class="placeholder">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="m21 15-5-5L5 21"/><circle cx="9" cy="9" r="2"/>
      </svg>
    </div>
  {/if}
  {#if showName && name && sizePreset !== 'sm'}
    <div class="overlay"><span class="overlay-name">{name}</span></div>
  {/if}
</div>

<style>
  .image-tile {
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    border-radius: inherit;
  }

  img {
    width: 100%;
    height: 100%;
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s;
  }

  img.loaded { opacity: 1; }

  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-subtle);
  }

  .overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: calc(var(--tile-padding-effective) * 0.72) calc(var(--tile-padding-effective) * 1.1);
    background: linear-gradient(to top, color-mix(in srgb, var(--bg) 75%, transparent) 0%, transparent 100%);
    pointer-events: none;
  }

  .overlay-name {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
