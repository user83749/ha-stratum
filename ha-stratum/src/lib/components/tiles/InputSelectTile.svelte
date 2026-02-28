<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { inputSelectService, selectService } from '$lib/ha/services';

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
  const domain = $derived(entityId.split('.')[0] ?? 'input_select');
  const entityState = $derived(entity?.state ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Select');
  const options = $derived((attrs.options as string[]) ?? []);
  const showCycleArrows = $derived(sizePreset !== 'sm');
  const showOptionsMeta = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  let open = $state(false);

  function select(option: string) {
    open = false;
    if (!entityId) return;
    if (domain === 'select') selectService.selectOption(entityId, option);
    else inputSelectService.selectOption(entityId, option);
  }

  function cycle(dir: 1 | -1) {
    const idx = options.indexOf(entityState);
    const next = options[(idx + dir + options.length) % options.length];
    if (next) select(next);
  }
</script>

<div class="is-tile" data-size={sizePreset}>


  <div class="tile-content">
    <div class="top">
      <div class="icon-sq">
        <Icon name="list" />
      </div>
    </div>

    <div class="bottom">
      <span class="val-hero">{entityState || '—'}</span>
      <span class="name-small">{name}</span>
    </div>
  </div>

  <!-- Cycle arrows + expand -->
  <div class="select-row">
    {#if showCycleArrows}
    <button class="arrow-btn" onclick={() => cycle(-1)} aria-label="Previous">
      <Icon name="chevron-left" />
    </button>
    {/if}
    <button class="open-btn" onclick={() => { open = !open; }} aria-label="Open options" aria-expanded={open}>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} />
    </button>
    {#if showCycleArrows}
    <button class="arrow-btn" onclick={() => cycle(1)} aria-label="Next">
      <Icon name="chevron-right" />
    </button>
    {/if}
  </div>

  {#if showOptionsMeta}
    <div class="options-meta">
      {options.length} option{options.length === 1 ? '' : 's'}
    </div>
  {/if}

  {#if open}
    <div class="dropdown">
      {#each options as opt}
        <button class="opt" class:selected={opt === entityState} onclick={() => select(opt)}>{opt}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .is-tile {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: 8px;
  }


  /* ── Content ───────────────────────────────────────────────────────────── */
  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    padding-bottom: 4px;
    min-height: 0;
  }

  .top { display: flex; }

  .icon-sq {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--accent) var(--control-chip-border-strength), transparent);
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-bottom: 1px;
  }

  .val-hero {
    font-size: clamp(0.9rem, 6cqw, 1.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name-small {
    font-size: 0.7rem;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Cycle row ──────────────────────────────────────────────────────────── */
  .select-row {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .options-meta {
    position: relative;
    z-index: 1;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--fg-subtle);
  }

  .arrow-btn {
    all: unset;
    width: 36px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    transition: all var(--transition);
    flex-shrink: 0;
  }

  .arrow-btn:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .open-btn {
    all: unset;
    flex: 1;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    transition: all var(--transition);
  }

  .open-btn:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }

  /* ── Dropdown ───────────────────────────────────────────────────────────── */
  .dropdown {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    overflow-y: auto;
    max-height: 180px;
    box-shadow: var(--shadow-lg);
    z-index: 10;
  }

  .opt {
    all: unset;
    display: block;
    width: 100%;
    padding: 8px 12px;
    box-sizing: border-box;
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--fg);
    cursor: pointer;
    transition: background var(--transition);
  }

  .opt:hover { background: var(--hover); }

  .opt.selected {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
    font-weight: 700;
  }

  /* ── Responsive ─────────────────────────────────────────────────────────── */
  @container tile (max-width: 140px) {
    .arrow-btn { display: none; }
    .open-btn { flex: 1; }
  }
  @container tile (max-height: 80px) {
    .is-tile { flex-direction: row; align-items: center; gap: 10px; }
    .tile-content { flex-direction: row; align-items: center; flex: 1; }
    .bottom { flex: 1; }
    .select-row { display: none; }
  }
  @container tile (max-width: 100px) {  .icon-sq { display: none; } }

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
