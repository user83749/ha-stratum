<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { timerService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);
  const sizePreset = $derived(getTileSizePreset(tile));

  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Timer');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const entityState = $derived(entity?.state ?? 'idle');
  const isActive = $derived(entityState === 'active');
  const isPaused = $derived(entityState === 'paused');
  const duration = $derived((attrs.duration as string | undefined) ?? '0:00:00');
  const remaining = $derived((attrs.remaining as string | undefined) ?? duration);
  const finishesAt = $derived(attrs.finishes_at as string | undefined);

  let now = $state(Date.now());
  $effect(() => {
    if (!isActive) return;
    const ticker = setInterval(() => { now = Date.now(); }, 1000);
    return () => clearInterval(ticker);
  });

  // Supports "SS", "MM:SS", "HH:MM:SS"
  function parseSeconds(s: string): number {
    const parts = String(s ?? '').trim().split(':').map((p) => Number(p));
    if (parts.some((n) => Number.isNaN(n))) return 0;

    if (parts.length === 3) {
      const [h, m, sec] = parts;
      return (h ?? 0) * 3600 + (m ?? 0) * 60 + (sec ?? 0);
    }
    if (parts.length === 2) {
      const [m, sec] = parts;
      return (m ?? 0) * 60 + (sec ?? 0);
    }
    if (parts.length === 1) {
      return parts[0] ?? 0;
    }
    return 0;
  }

  function formatTime(secs: number): string {
    const total = Math.max(0, Math.floor(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const remainingSecs = $derived.by(() => {
    if (isActive && finishesAt) {
      const ms = new Date(finishesAt).getTime();
      if (!Number.isFinite(ms)) return parseSeconds(remaining);
      return Math.max(0, Math.round((ms - now) / 1000));
    }
    return parseSeconds(remaining);
  });

  const totalSecs = $derived(parseSeconds(duration));
  const progressPct = $derived(
    totalSecs > 0 ? Math.max(0, Math.min(100, (1 - remainingSecs / totalSecs) * 100)) : 0
  );

  // `statusColor` is the timer's semantic accent for the icon/time/progress, not the entity label text.
  const statusColor = $derived(
    isActive ? 'var(--accent)' :
    isPaused ? 'var(--color-warning)' :
    'var(--fg-muted)'
  );

  // `labelColor` keeps the timer's visible "state" + entity name aligned with the shared tile label rules.
  const labelColor = $derived(
    isActive ? 'var(--tile-label-on, var(--control-active-name))' :
    isPaused ? 'var(--color-warning)' :
    'var(--fg)'
  );

  const statusLabel = $derived(isActive ? 'Active' : isPaused ? 'Paused' : 'Idle');
  const showStatus = $derived(sizePreset !== 'sm');
  const showControls = $derived(sizePreset !== 'sm');
  const showProgress = $derived(sizePreset !== 'sm' && totalSecs > 0 && !isTallMd);
  const showFinishAt = $derived((sizePreset === 'lg' || sizePreset === 'xl') && !!finishesAt);

  const finishLabel = $derived.by(() => {
    if (!finishesAt) return '';
    const d = new Date(finishesAt);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });
</script>

<BaseTile {name} state={formatTime(remainingSecs)} isOn={isActive || isPaused} style="--tc: {statusColor}; --tlc: {labelColor};">
  {#snippet icon()}
    <div class="icon-sq" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <Icon name={iconOverride} entity={entity} size="100%" />
        {/if}
      {:else}
        <Icon name="timer" size="100%" />
      {/if}
    </div>
  {/snippet}

  {#snippet circle()}
    {#if showStatus}
      <span class="status-label">{statusLabel}</span>
    {/if}
  {/snippet}

  {#snippet below()}
    {#if showFinishAt && finishLabel}
      <span class="finish-line">Ends {finishLabel}</span>
    {/if}

    {#if showControls}
      <div class="controls">
        {#if isActive}
          <button class="ctrl-btn" onclick={() => entityId && timerService.pause(entityId)} aria-label="Pause">
            <Icon name="pause" />
          </button>
          <button class="ctrl-btn danger" onclick={() => entityId && timerService.cancel(entityId)} aria-label="Cancel">
            <Icon name="x" />
          </button>
        {:else if isPaused}
          <button class="ctrl-btn primary" onclick={() => entityId && timerService.start(entityId)} aria-label="Resume">
            <Icon name="play" />
          </button>
          <button class="ctrl-btn danger" onclick={() => entityId && timerService.cancel(entityId)} aria-label="Cancel">
            <Icon name="x" />
          </button>
        {:else}
          <button class="ctrl-btn primary" onclick={() => entityId && timerService.start(entityId)} aria-label="Start">
            <Icon name="play" />
          </button>
        {/if}
      </div>
    {/if}

    {#if showProgress}
      <div class="progress-bar">
        <div class="progress-fill" style="width:{progressPct}%"></div>
      </div>
    {/if}
  {/snippet}
</BaseTile>

<style>

  .icon-sq {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--tc);
    background: color-mix(in srgb, var(--tc) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid
      color-mix(in srgb, var(--tc) var(--control-chip-border-strength), transparent);
    transition: all var(--transition);
  }

  .icon-sq.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .icon-sq.override {
    background: transparent;
    border-color: transparent;
  }

  .status-label {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    line-height: var(--control-label-line-height);
    color: var(--tlc);
    transition: color var(--transition);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .finish-line {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--fg-subtle);
    flex-shrink: 0;
    opacity: 0.7;
    margin-top: calc(var(--button-card-font-size) * 0.5);
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .controls {
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.36);
    margin-top: calc(var(--button-card-font-size) * 0.8);
    flex-wrap: wrap;
  }

  .ctrl-btn {
    all: unset;
    height: calc(var(--action-icon-size) * 0.95);
    padding: 0 calc(var(--button-card-font-size) * 1);
    min-width: calc(var(--action-icon-size) * 1.35);
    border-radius: 999px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    transition: background var(--transition), color var(--transition), border-color var(--transition);
    font-size: var(--secondary-label-size);
    font-weight: 500;
  }

  .ctrl-btn:hover {
    background: var(--hover);
    color: var(--fg);
  }

  .ctrl-btn.primary {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
  }

  .ctrl-btn.danger {
    background: color-mix(in srgb, var(--color-danger) 14%, transparent);
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 30%, var(--border));
  }

  .progress-bar {
    height: calc(var(--action-icon-size) * 0.18);
    border-radius: 99px;
    background: color-mix(in srgb, var(--fg) 10%, transparent);
    margin-top: calc(var(--button-card-font-size) * 0.8);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 99px;
    background: var(--tc);
    transition: width 0.5s linear, background var(--transition);
  }
</style>
