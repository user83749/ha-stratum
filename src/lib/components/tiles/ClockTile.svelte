<script lang="ts">
  import type { Tile } from '$lib/types/dashboard';
  import { appSettings } from '$lib/stores/dashboard';

  let { tile }: { tile: Tile } = $props();

  const config = $derived(tile.config ?? {});
  const showSeconds = $derived(config.show_seconds ?? false);
  // use_24h in tile config overrides global timeFormat setting
  const use24h = $derived(
    config.use_24h !== undefined ? config.use_24h : $appSettings.timeFormat === '24h'
  );
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

  const dateStr = $derived(now.toLocaleDateString($appSettings.locale || undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
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
    align-items: flex-start;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    gap: 4px;
  }

  .time {
    font-size: var(--hero-text-size);
    font-weight: 500;
    color: var(--fg);
    letter-spacing: -0.04em;
    line-height: 0.9;
    font-variant-numeric: tabular-nums;
  }

  .date {
    font-size: var(--secondary-label-size);
    color: var(--fg-muted);
    font-weight: 500;
    letter-spacing: 0.02em;
  }
</style>
