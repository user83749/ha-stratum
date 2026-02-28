<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const url = $derived((config as Record<string, unknown>).url as string ?? '');
  const title = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Iframe');
  const allowInteraction = $derived(config.allow_interaction !== false);

  let src = $state('');
  $effect(() => { src = url; });
</script>

<div class="iframe-tile">
  {#if src}
    <iframe {src} title={title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={allowInteraction ? '' : 'pointer-events:none'} loading="lazy"></iframe>
  {:else}
    <div class="empty">No URL configured</div>
  {/if}
</div>

<style>
  .iframe-tile { display: flex; width: 100%; height: 100%; overflow: hidden; border-radius: inherit; }
  iframe { width: 100%; height: 100%; border: none; border-radius: inherit; }
  .empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--fg-subtle); }


</style>
