<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';

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
  .person-tile {
    --pc: var(--fg-muted);
    width: 100%; height: 100%; position: relative;
    display: flex; flex-direction: column; justify-content: space-between;
  }

  .top { display: flex; align-items: flex-start; }

  .avatar-wrap { position: relative; width: 52px; height: 52px; flex-shrink: 0; }

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
    position: absolute; bottom: 1px; right: 1px;
    width: 12px; height: 12px; border-radius: 50%;
    background: var(--pc);
    border: 2px solid var(--surface);
    transition: background var(--transition);
  }

  .bottom { display: flex; flex-direction: column; gap: 1px; }

  .location-text {
    display: flex; align-items: center; gap: 4px;
    font-size: clamp(0.9rem, 6cqw, 1.5rem); font-weight: 800;
    color: var(--pc); line-height: 1; letter-spacing: -0.02em;
    text-transform: capitalize; transition: color var(--transition);
  }

  .name-small {
    font-size: 0.68rem; color: var(--fg-muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  @container tile (max-width: 100px) {  .avatar-wrap { width: 50px; height: 50px; } }
  @container tile (max-height: 80px) {
    .person-tile { flex-direction: row; align-items: center; gap: 10px; }
    .top { flex-shrink: 0; } .bottom { flex: 1; }
  }
  @container tile (min-width: 200px) { .avatar-wrap { width: 60px; height: 60px; } }

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
