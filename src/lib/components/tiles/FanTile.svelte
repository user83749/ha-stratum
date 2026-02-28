<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { fanService } from '$lib/ha/services';

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
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Fan');
  const isOn = $derived(entity?.state === 'on');
  const speed = $derived(attrs.percentage as number | null ?? null);
  const oscillating = $derived(attrs.oscillating as boolean ?? false);
  const presets = $derived((attrs.preset_modes as string[]) ?? []);
  const currentPreset = $derived(attrs.preset_mode as string ?? '');
  const showSpeedRing = $derived(isOn && speed !== null);
  const showPresetChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && presets.length > 0 && isOn);

  let localSpeed = $state<number | null>(null);
  let dragging = $state(false);
  const displaySpeed = $derived(dragging ? localSpeed : speed);
  const speedPct = $derived(displaySpeed ?? (isOn ? 100 : 0));

  function toggle() { if (entityId) fanService.toggle(entityId); }
  function handleSpeedInput(ev: Event) { dragging = true; localSpeed = Number((ev.target as HTMLInputElement).value); }
  function handleSpeedChange(ev: Event) {
    dragging = false;
    localSpeed = null;
    if (entityId) fanService.setPercentage(entityId, Number((ev.target as HTMLInputElement).value));
  }
</script>

<div class="fan-tile" class:on={isOn} data-size={sizePreset} style="--sp: {speedPct}%;">

  <div class="tile-content">
    <div class="top">
      <!-- Fan icon button -->
      <button class="fan-btn" onclick={toggle} aria-label={isOn ? 'Turn off' : 'Turn on'}>
        <!-- Ceiling-fan glyph only: this controls the icon artwork itself.
           The surrounding circular chip is still controlled by `.fan-btn` below. -->
        <span class:spinning={isOn} class="fan-glyph">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" />
            <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" transform="rotate(120 12 12)" />
            <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" transform="rotate(240 12 12)" />
            <circle cx="12" cy="12" r="1.9" fill="currentColor" />
          </svg>
        </span>
      </button>
      {#if oscillating}
        <span class="osc-chip">OSC</span>
      {/if}
    </div>

    <div class="bottom">
      <span class="name-text">{name}</span>
      <span class="state-text">{isOn ? 'On' : 'Off'}</span>
    </div>
  </div>

  {#if showSpeedRing}
    <div class="circle-wrap">
      <svg viewBox="0 0 50 50" class="circle-svg">
        <circle
          cx="25"
          cy="25"
          r="22.1"
          class="circle-stroke"
          stroke-dasharray="138.85"
          stroke-dashoffset="{138.85 - speedPct / 100 * 138.85}"
        />
        <text x="50%" y="52%" class="circle-value">
          {displaySpeed ?? 100}<tspan dx=".2" dy="-.4">%</tspan>
        </text>
      </svg>
    </div>
  {/if}

  <!-- Preset chips -->
  {#if showPresetChips}
    <div class="presets">
      {#each presets as p}
        <button class="preset" class:active={currentPreset === p}
          onclick={() => entityId && fanService.setPresetMode(entityId, p)}>{p}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .fan-tile {
    /* Shared ring geometry for this tile. Container queries override these
       variables instead of layering conflicting size/position rules. */
    --ring-size: 44px;
    --ring-top: 16px;
    --ring-right: 8px;
    --ring-value-size: 14px;
    --ring-suffix-size: 10.5px;
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding: var(--tile-padding);
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: 8px;
  }

  /* ── Content ─────────────────────────────────────────────────────────── */
  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    min-height: 0;
    padding-bottom: 4px;
  }

  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .fan-btn {
    all: unset;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  /* Inner control chip only: this styles the round fan button itself.
     It must not be used as the main active tile-face treatment. */
  .fan-tile.on .fan-btn {
    /* Changes the icon glyph color only. */
    color: var(--accent);
    /* Changes the round icon-chip fill only. */
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    /* Changes the round icon-chip border only. */
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .spinning { animation: spin 1.5s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fan-glyph {
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
  }

  .fan-glyph svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .circle-wrap {
    display: flex;
    position: absolute;
    /* Vertical alignment: move the ring down to sit level with the icon row. */
    top: var(--ring-top);
    right: var(--ring-right);
    width: var(--ring-size);
    height: var(--ring-size);
    z-index: 2;
    cursor: pointer;
  }

  .circle-svg {
    width: 100%;
    height: 100%;
  }

  .circle-stroke {
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    stroke-width: 2.3;
    stroke: rgba(136, 141, 146, 0.9);
    fill: none;
    transition: stroke-dashoffset 0.08s ease;
  }

  .circle-value {
    font-size: var(--ring-value-size);
    font-weight: 700;
    letter-spacing: -0.02rem;
    fill: rgba(132, 137, 142, 0.96);
    text-anchor: middle;
    dominant-baseline: central;
    font-variant-numeric: tabular-nums;
  }

  .circle-value tspan {
    font-size: var(--ring-suffix-size);
  }

  .osc-chip {
    /* Changes the OSC status chip fill only. */
    font-size: 0.55rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    background: transparent;
    color: var(--color-info);
    border-radius: 4px;
    padding: 2px 6px;
    align-self: flex-start;
    margin-top: 10px;
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: auto;
  }

  

  

  /* Changes the active name text only. */
  .fan-tile.on .name-text { color: var(--control-active-name); }

  /* Changes the active state text only. */
  .fan-tile.on .state-text { color: var(--control-active-name); opacity: 0.7; }

  /* ── Presets ─────────────────────────────────────────────────────────── */
  .presets {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .preset {
    all: unset;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  /* Inner preset chip only: accent text state, not tile background. */
  .preset.active {
    /* Changes the preset chip fill only. */
    background: transparent;
    /* Changes the preset chip text only. */
    color: var(--accent);
    /* Changes the preset chip border only. */
    border-color: transparent;
  }

  /* ── Responsive ─────────────────────────────────────────────────────── */
  @container tile (max-width: 160px) { .presets { display: none; } }
  @container tile (max-height: 120px) { .presets { display: none; } }
  @container tile (max-height: 80px) {
    .fan-tile {
      --ring-size: 40px;
      --ring-top: 10px;
      --ring-right: 4px;
      --ring-value-size: 13px;
      --ring-suffix-size: 10px;
    }
    .fan-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; }
    .bottom { flex: 1; }
    .presets { display: none; }
  }

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    .fan-tile {
      --ring-size: 40px;
      --ring-top: 10px;
      --ring-right: 4px;
      --ring-value-size: 13px;
      --ring-suffix-size: 10px;
    }
    .fan-btn { width: 38px !important; height: 38px !important; }
    .bottom { gap: 0px !important; }
    .tile-content { padding-bottom: 2px !important; }
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
    color: var(--fg);
    transition: color var(--transition);
  }

</style>
