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
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Calendar');
  const nextEventTitle = $derived(entity?.attributes?.message as string ?? '');
  const startTime = $derived(entity?.attributes?.start_time as string ?? '');
  const allDay = $derived(entity?.attributes?.all_day as boolean ?? false);
  const showHeader = $derived(sizePreset !== 'sm');
  const showTimeMeta = $derived(sizePreset !== 'sm');
  const showTitleLine = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  function relTime(ts: string): string {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const mins = Math.round((d.getTime() - now.getTime()) / 60000);
    if (mins < 0) return 'Now';
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    if (Math.round(hrs / 24) === 1) return 'Tomorrow';
    return `in ${Math.round(hrs / 24)}d`;
  }
  function formatTime(ts: string): string {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
</script>

<div class="cal-tile" data-size={sizePreset}>
  {#if showHeader}
    <div class="top">
      <div class="icon-sq"><Icon name="calendar" /></div>
      <span class="title">{name}</span>
    </div>
  {/if}

  {#if nextEventTitle}
    <div class="event-card">
      <div class="event-bar"></div>
      <div class="event-body">
        <span class="event-rel">{relTime(startTime)}</span>
        {#if showTitleLine}
          <span class="event-name">{nextEventTitle}</span>
        {/if}
        {#if showTimeMeta && !allDay && startTime}
          <span class="event-time">{formatTime(startTime)}</span>
        {:else if showTimeMeta && allDay}
          <span class="event-time">All day</span>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty">No upcoming events</div>
  {/if}
</div>

<style>
  .cal-tile { display: flex; flex-direction: column; width: 100%; height: 100%; gap: 8px; overflow: hidden; }

  .top { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .icon-sq {
    width: var(--control-chip-size); height: var(--control-chip-size); border-radius: var(--control-chip-radius);
    display: flex; align-items: center; justify-content: center;
    color: var(--accent); background: color-mix(in srgb, var(--accent) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--accent) var(--control-chip-border-strength), transparent);
    flex-shrink: 0;
  }
  .title { font-size: 0.78rem; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }

  .empty { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--fg-subtle); }

  .event-card {
    display: flex; gap: 10px; flex: 1; min-height: 0; overflow: hidden;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
    border-radius: var(--radius-sm); padding: 10px 12px;
  }
  .event-bar { width: 3px; border-radius: 2px; background: var(--accent); flex-shrink: 0; align-self: stretch; }
  .event-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .event-rel { font-size: 0.6rem; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; }
  .event-name { font-size: 0.85rem; font-weight: 700; color: var(--fg); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .event-time { font-size: 0.68rem; color: var(--fg-muted); }

  @container tile (max-width: 140px) { .top { display: none; } }
  @container tile (max-width: 100px) { .event-bar { display: none; } .event-time { display: none; } .event-card { padding: 6px 8px; } }
  @container tile (max-height: 80px) {
    .cal-tile { flex-direction: row; align-items: center; gap: 10px; }
    .top { flex-shrink: 0; } .event-card { flex: 1; }
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
