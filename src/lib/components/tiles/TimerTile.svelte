<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { timerService } from '$lib/ha/services';

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
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Timer');
  const entityState = $derived(entity?.state ?? 'idle');
  const isActive = $derived(entityState === 'active');
  const isPaused = $derived(entityState === 'paused');
  const duration = $derived(attrs.duration as string ?? '0:00:00');
  const remaining = $derived(attrs.remaining as string ?? duration);
  const finishesAt = $derived(attrs.finishes_at as string | undefined);

  let now = $state(Date.now());
  $effect(() => {
    if (!isActive) return;
    const ticker = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(ticker);
  });

  function parseSeconds(s: string): number {
    const parts = s.split(':').map(Number);
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  function formatTime(secs: number): string {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  const remainingSecs = $derived.by(() => {
    if (isActive && finishesAt) return Math.max(0, Math.round((new Date(finishesAt).getTime() - now) / 1000));
    return parseSeconds(remaining);
  });
  const totalSecs = $derived(parseSeconds(duration));
  const progressPct = $derived(totalSecs > 0 ? Math.max(0, Math.min(100, (1 - remainingSecs / totalSecs) * 100)) : 0);
  // `statusColor` is the timer's semantic accent for the icon/time/progress, not the entity label text.
  const statusColor = $derived(isActive ? 'var(--accent)' : isPaused ? 'var(--color-warning)' : 'var(--fg-muted)');
  // `labelColor` keeps the timer's visible "state" + entity name aligned with the shared tile label rules.
  const labelColor = $derived(
    isActive ? 'var(--control-active-name)' :
    isPaused ? 'var(--color-warning)' :
    'var(--fg)'
  );
  const statusLabel = $derived(isActive ? 'Active' : isPaused ? 'Paused' : 'Idle');
  const showStatus = $derived(sizePreset !== 'sm');
  const showControls = $derived(sizePreset !== 'sm');
  const showProgress = $derived(sizePreset !== 'sm' && totalSecs > 0);
  const showFinishAt = $derived((sizePreset === 'lg' || sizePreset === 'xl') && !!finishesAt);
  const finishLabel = $derived.by(() => {
    if (!finishesAt) return '';
    return new Date(finishesAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });
</script>

<div class="timer-tile" data-size={sizePreset} style="--tc: {statusColor}; --tlc: {labelColor};">
  <div class="top">
    <div class="icon-sq"><Icon name="timer" /></div>
    {#if showStatus}
    <span class="status-label">{statusLabel}</span>
    {/if}
  </div>

  <div class="time-hero">
    <span class="time-text">{formatTime(remainingSecs)}</span>
  </div>

  <span class="name-small">{name}</span>

  {#if showFinishAt}
    <span class="finish-line">Ends {finishLabel}</span>
  {/if}

  {#if showControls}
  <div class="controls">
    {#if isActive}
      <button class="ctrl-btn" onclick={() => entityId && timerService.pause(entityId)} aria-label="Pause"><Icon name="pause" /></button>
      <button class="ctrl-btn danger" onclick={() => entityId && timerService.cancel(entityId)} aria-label="Cancel"><Icon name="x" /></button>
    {:else if isPaused}
      <button class="ctrl-btn primary" onclick={() => entityId && timerService.start(entityId)} aria-label="Resume"><Icon name="play" /></button>
      <button class="ctrl-btn danger" onclick={() => entityId && timerService.cancel(entityId)} aria-label="Cancel"><Icon name="x" /></button>
    {:else}
      <button class="ctrl-btn primary" onclick={() => entityId && timerService.start(entityId)} aria-label="Start"><Icon name="play" /></button>
    {/if}
  </div>
  {/if}

  {#if showProgress}
    <div class="progress-bar"><div class="progress-fill" style="width:{progressPct}%"></div></div>
  {/if}
</div>

<style>
  .timer-tile {
    --tc: var(--fg-muted);
    --tlc: var(--fg);
    width: 100%; height: 100%;
    display: flex; flex-direction: column; gap: 6px; position: relative;
  }
  .top { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .icon-sq {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex; align-items: center; justify-content: center;
    color: var(--tc);
    background: color-mix(in srgb, var(--tc) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--tc) var(--control-chip-border-strength), transparent);
    transition: all var(--transition); flex-shrink: 0;
  }
  .status-label {
    /* Timer state label only: use the same shared label typography as the
       standard control tiles instead of a bespoke uppercase badge style. */
    font-size: var(--control-label-size);
    font-weight: var(--control-label-weight);
    line-height: var(--control-label-line-height);
    letter-spacing: normal;
    text-transform: none;
    color: var(--tlc);
    transition: color var(--transition);
  }
  .time-hero { flex: 1; min-height: 0; display: flex; align-items: flex-end; }
  .time-text {
    font-size: clamp(1.5rem, 11cqw, 3rem); font-weight: 800;
    letter-spacing: -0.04em; line-height: 1; color: var(--tc);
    font-variant-numeric: tabular-nums; transition: color var(--transition);
  }
  .name-small {
    /* Timer entity name only: use the shared control-tile label typography
       instead of a one-off small label style. */
    font-size: var(--control-label-size);
    font-weight: var(--control-label-weight);
    line-height: var(--control-label-line-height);
    color: var(--tlc);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
  }
  .finish-line {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--fg-subtle);
    flex-shrink: 0;
  }
  .controls { display: flex; gap: 6px; flex-shrink: 0; }
  .ctrl-btn {
    all: unset; width: 32px; height: 32px; border-radius: 50%;
    border: 1px solid var(--border); background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--fg-muted); transition: background var(--transition), color var(--transition);
  }
  .ctrl-btn:hover { background: var(--hover); color: var(--fg); }
  .ctrl-btn.primary { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 30%, var(--border)); }
  .ctrl-btn.danger { background: color-mix(in srgb, var(--color-danger) 14%, transparent); color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 30%, var(--border)); }
  .progress-bar { height: 3px; border-radius: 99px; background: color-mix(in srgb, var(--fg) 10%, transparent); flex-shrink: 0; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 99px; background: var(--tc); transition: width 0.5s linear, background var(--transition); }

  @container tile (max-width: 110px) {
    .icon-sq {
      width: var(--control-chip-size-compact);
      height: var(--control-chip-size-compact);
      border-radius: var(--control-chip-radius-compact);
    }
    .status-label { display: none; }
  }
  @container tile (max-width: 80px) { .controls { display: none; } }
  
  @container tile (max-height: 90px) { .controls { display: none; } }
  @container tile (max-height: 70px) {
    .timer-tile { flex-direction: row; align-items: center; gap: 8px; }
    .top { flex-shrink: 0; } .time-hero { flex: 1; min-height: unset; }
    .name-small, .controls, .progress-bar { display: none; }
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
