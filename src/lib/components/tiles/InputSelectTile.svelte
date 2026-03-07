<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { inputSelectService, selectService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

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
  const domain = $derived(entityId.split('.')[0] || 'input_select');
  const entityState = $derived(entity?.state ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Select');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
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
    if (!options.length) return;
    const idx = options.indexOf(entityState);
    const safeIdx = idx >= 0 ? idx : 0;
    const next = options[(safeIdx + dir + options.length) % options.length];
    if (next) select(next);
  }
</script>

<BaseTile {name} state={entityState || '—'} isOn={!!entityState}>
  {#snippet icon()}
    <div class="icon-sq" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <Icon name={iconOverride} entity={entity} size="100%" />
        {/if}
      {:else}
        <Icon name="list" size="100%" />
      {/if}
    </div>
  {/snippet}

  {#snippet below()}
    <!-- Cycle arrows + expand -->
    <div class="select-row">
      {#if showCycleArrows}
        <button class="arrow-btn" onclick={() => cycle(-1)} aria-label="Previous">
          <Icon name="chevron-left" />
        </button>
      {/if}

      <button
        class="open-btn"
        onclick={() => { open = !open; }}
        aria-label="Open options"
        aria-expanded={open}
      >
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
          <button
            class="opt"
            class:selected={opt === entityState}
            onclick={() => select(opt)}
            title={opt}
          >
            {opt}
          </button>
        {/each}
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
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid
      color-mix(in srgb, var(--accent) var(--control-chip-border-strength), transparent);
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

  /* ── Cycle row ──────────────────────────────────────────────────────────── */
  .select-row {
    margin-top: 8px;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .options-meta {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--fg-subtle);
    margin-top: 4px;
  }

  .arrow-btn {
    all: unset;
    width: var(--action-icon-size-lg);
    height: var(--action-icon-size);
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
    height: var(--action-icon-size);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 6%, transparent);
    border: 1px solid var(--border);
    transition: all var(--transition);
    min-width: 0;
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
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg);
    cursor: pointer;
    transition: background var(--transition);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .opt:hover { background: var(--hover); }

  .opt.selected {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
    font-weight: 500;
  }
</style>
