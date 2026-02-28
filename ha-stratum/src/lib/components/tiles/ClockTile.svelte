<script lang="ts">
  import type { Tile } from '$lib/types/dashboard';

  let { tile }: { tile: Tile } = $props();

  const config = $derived(tile.config ?? {});
  const showSeconds = $derived(config.show_seconds ?? false);
  const use24h = $derived(config.use_24h ?? false);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );
  const showDate = $derived(config.show_date !== false);

  let now = $state(new Date());
  let intervalId: ReturnType<typeof setInterval>;

  $effect(() => {
    intervalId = setInterval(() => { now = new Date(); }, 1000);
    return () => clearInterval(intervalId);
  });

  const timeStr = $derived.by(() => {
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    if (use24h) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${showSeconds ? ':' + String(s).padStart(2, '0') : ''}`;
    }
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${h12}:${String(m).padStart(2, '0')}${showSeconds ? ':' + String(s).padStart(2, '0') : ''} ${ampm}`;
  });

  const dateStr = $derived(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
  const showDateLine = $derived(showDate && sizePreset !== 'sm');
</script>

<div class="clock-tile" data-size={sizePreset}>
  <div class="time">{timeStr}</div>
  {#if showDateLine}
    <div class="date">{dateStr}</div>
  {/if}
</div>

<style>
  .clock-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 4px;
  }

  .time {
    font-size: clamp(1.4rem, 10cqw, 3.5rem);
    font-weight: 800;
    color: var(--fg);
    letter-spacing: -0.04em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .date {
    font-size: clamp(0.65rem, 3cqw, 0.95rem);
    color: var(--fg-muted);
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  @container tile (max-width: 160px) {
    .date { display: none; }
  }

  @container tile (min-height: 200px) {
    .clock-tile { gap: 8px; }
    .time { font-size: clamp(2.5rem, 12cqw, 5rem); }
    .date { font-size: clamp(0.8rem, 3.5cqw, 1.1rem); }
  }

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
