<script lang="ts">
  // ── PersonTile ────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const state = $derived(entity?.state ?? 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Person');
  const picture = $derived(attrs.entity_picture as string | undefined);
  const isHome = $derived(state === 'home');
  const statusColor = $derived(isHome ? 'var(--color-on)' : 'var(--fg-muted)');
  const locationLabel = $derived(isHome ? 'Home' : state === 'not_home' ? 'Away' : state);
  const showName = $derived(sizePreset !== 'sm');
</script>

<div class="person-tile" class:home={isHome} data-size={sizePreset} style="--pc: {statusColor};">
  <div class="top">
    <div class="avatar-wrap">
      {#if picture}
        <img class="avatar" src={picture} alt={name} />
      {:else}
        <div class="avatar fallback"><Icon name="user" /></div>
      {/if}
      <span class="status-dot" aria-hidden="true"></span>
    </div>
  </div>

  <div class="bottom">
    <span class="location-text">
      <Icon name={isHome ? 'home' : 'map-pin'} size={12} />
      {locationLabel}
    </span>
    {#if showName}
      <span class="name-small">{name}</span>
    {/if}
  </div>
</div>

<style>
  /* ── Root ─────────────────────────────────────────────────────────────── */
  .person-tile {
    --pc: var(--fg-muted);
    width: 100%; height: 100%; position: relative;
    display: flex; flex-direction: column; justify-content: space-between;
  }

  /* ── Avatar ───────────────────────────────────────────────────────────── */
  .top { display: flex; align-items: flex-start; }

  .avatar-wrap { position: relative; width: var(--control-chip-size); height: var(--control-chip-size); flex-shrink: 0; }

  .avatar {
    width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
  }

  .avatar.fallback {
    display: flex; align-items: center; justify-content: center;
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 2px solid var(--border); color: var(--fg-muted);
    border-radius: 50%; width: 100%; height: 100%; box-sizing: border-box;
  }

  .status-dot {
    position: absolute; bottom: calc(var(--tile-padding-effective) * 0.08); right: calc(var(--tile-padding-effective) * 0.08);
    width: calc(var(--button-card-font-size) * 0.88); height: calc(var(--button-card-font-size) * 0.88); border-radius: 50%;
    background: var(--pc);
    border: 2px solid var(--surface);
    transition: background var(--transition);
  }

  /* ── Labels ───────────────────────────────────────────────────────────── */
  .bottom { display: flex; flex-direction: column; gap: calc(var(--tile-padding-effective) * 0.08); }

  .location-text {
    display: flex; align-items: center; gap: calc(var(--tile-padding-effective) * 0.35);
    font-size: var(--control-label-size); font-weight: 500;
    color: var(--pc); line-height: 1; letter-spacing: -0.02em;
    text-transform: capitalize; transition: color var(--transition);
  }

  .name-small {
    font-size: var(--secondary-label-size); color: var(--fg-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
</style>
