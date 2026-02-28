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
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Logbook');
  const recentState = $derived(entity?.state ?? '');
  const lastChanged = $derived(entity?.last_changed ?? '');
  const showHeader = $derived(sizePreset !== 'sm');
  const showEntryTime = $derived(sizePreset !== 'sm');
  const showEntryName = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  function relTime(ts: string): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }
</script>

<div class="logbook-tile" data-size={sizePreset}>
  {#if showHeader}
    <div class="top">
      <div class="icon-sq"><Icon name="scroll-text" /></div>
      <span class="title">{name}</span>
    </div>
  {/if}

  {#if recentState}
    <div class="entry-card">
      <div class="entry-dot"></div>
      <div class="entry-body">
        <span class="entry-state">{recentState}</span>
        {#if showEntryName}<span class="entry-name">{entity?.attributes?.friendly_name ?? ''}</span>{/if}
      </div>
      {#if showEntryTime}<span class="entry-time">{relTime(lastChanged)}</span>{/if}
    </div>
  {:else}
    <div class="empty">No data</div>
  {/if}
</div>

<style>
  .logbook-tile { display: flex; flex-direction: column; width: 100%; height: 100%; gap: 8px; overflow: hidden; }

  .top { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .icon-sq {
    width: var(--control-chip-size); height: var(--control-chip-size); border-radius: var(--control-chip-radius);
    display: flex; align-items: center; justify-content: center;
    color: var(--fg-muted); background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: var(--control-chip-border-width) solid var(--border); flex-shrink: 0;
  }
  .title { font-size: 0.78rem; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }

  .empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--fg-subtle); }

  .entry-card {
    display: flex; align-items: center; gap: 10px; flex: 1;
    background: color-mix(in srgb, var(--fg) 4%, transparent);
    border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 10px 12px; overflow: hidden;
  }
  .entry-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .entry-body { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
  .entry-state { font-size: 0.72rem; font-weight: 700; text-transform: capitalize; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .entry-name { font-size: 0.68rem; color: var(--fg-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .entry-time { font-size: 0.65rem; color: var(--fg-subtle); flex-shrink: 0; font-variant-numeric: tabular-nums; }

  @container tile (max-width: 180px) { .entry-time { display: none; } }
  @container tile (max-width: 120px) { .top { display: none; } }
  @container tile (max-height: 80px) {
    .logbook-tile { flex-direction: row; align-items: center; gap: 10px; }
    .top { flex-shrink: 0; } .entry-card { flex: 1; }
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
