<script lang="ts">
  import { generateId } from '$lib/utils/uuid';
  import { entities } from '$lib/ha/websocket';
  import { getDomain, getEntityName } from '$lib/ha/entities';
  import { dashboardStore } from '$lib/stores/dashboard';
  import { editMode } from '$lib/stores/editMode';
  import { currentBreakpoint } from '$lib/stores/ui';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TileRenderer from '$lib/components/tiles/TileRenderer.svelte';
  import type { Tile, TileType } from '$lib/types/dashboard';
  import { VISIBLE_ALL } from '$lib/types/dashboard';
  import { getAllowedPresets, resolvePresetToSpan } from '$lib/layout/tileSizing';

  interface Props {
    open: boolean;
    sectionId: string;
    pageId: string;
    columnHint?: number;
    onclose: () => void;
  }

  const { open, sectionId, pageId, columnHint = 0, onclose }: Props = $props();

  type Step = 'source' | 'type' | 'size';

  let search = $state('');
  let step = $state<Step>('source');
  let selectedEntityId = $state<string | undefined>(undefined);
  let selectedType = $state<TileType | null>(null);
  let selectedPreset = $state<'sm' | 'md' | 'lg' | 'xl'>('md');
  const breakpoint = $derived($currentBreakpoint);

  function resolvePreviewBreakpoint(): 'sm' | 'md' | 'lg' {
    return breakpoint;
  }

  function clampSpanToView(span: { w: number; h: number }) {
    if (!columnHint || columnHint <= 0) return span;
    return { ...span, w: Math.min(span.w, columnHint) };
  }

  $effect(() => {
    if (!open) return;
    search = '';
    step = 'source';
    selectedEntityId = undefined;
    selectedType = null;
    selectedPreset = 'md';
  });

  const entityList = $derived(
    Object.values($entities).sort((a, b) =>
      (a.attributes?.friendly_name ?? a.entity_id)
        .localeCompare(b.attributes?.friendly_name ?? b.entity_id)
    )
  );

  const filteredEntities = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entityList.slice(0, 60);
    return entityList
      .filter(
        (e) =>
          e.entity_id.toLowerCase().includes(q) ||
          (e.attributes?.friendly_name ?? '').toLowerCase().includes(q)
      )
      .slice(0, 80);
  });

  const STATIC_TILES: { type: TileType; label: string; icon: string }[] = [
    { type: 'media_hero', label: 'Custom Media', icon: 'tv' },
    { type: 'markdown', label: 'Text', icon: 'type' },
    { type: 'divider', label: 'Divider', icon: 'minus' },
    { type: 'iframe', label: 'Webpage', icon: 'globe' },
    { type: 'image', label: 'Image', icon: 'image' }
  ];

  // Types whose default tap action is 'toggle'.
  // alarm_panel is excluded — it needs the more-info code-entry UI, not a blind toggle.
  const ACTUATOR_TYPES = new Set<TileType>([
    'light', 'cover', 'lock', 'fan', 'humidifier', 'water_heater', 'siren', 'vacuum',
    'lawn_mower', 'button', 'slider', 'input_select', 'timer'
  ]);

  function candidateTypes(entityId: string): TileType[] {
    const domain = getDomain(entityId);
    switch (domain) {
      case 'light': return ['light', 'entity'];
      case 'sensor': return ['entity', 'gauge', 'history'];
      case 'binary_sensor': return ['entity'];
      case 'climate': return ['climate', 'entity'];
      case 'camera': return ['camera', 'entity'];
      case 'media_player': return ['media_player', 'media_hero', 'entity'];
      case 'fan': return ['fan', 'entity'];
      case 'lock': return ['lock', 'entity'];
      case 'cover': return ['cover', 'entity'];
      case 'weather': return ['weather', 'entity'];
      case 'timer': return ['timer', 'entity'];
      case 'todo': return ['todo', 'entity'];
      case 'update': return ['update', 'entity'];
      case 'input_number':
      case 'number': return ['slider', 'entity'];
      case 'input_select': return ['input_select', 'entity'];
      case 'select': return ['input_select', 'media_hero', 'entity'];
      case 'alarm_control_panel': return ['alarm_panel', 'entity'];
      case 'person':
      case 'device_tracker': return ['person', 'entity'];
      case 'vacuum': return ['vacuum', 'entity'];
      case 'lawn_mower': return ['lawn_mower', 'entity'];
      case 'humidifier': return ['humidifier', 'entity'];
      case 'water_heater': return ['water_heater', 'entity'];
      case 'siren': return ['siren', 'entity'];
      case 'remote': return ['remote', 'entity'];
      case 'scene':
      case 'script':
      case 'automation':
      case 'button':
      case 'input_button': return ['button'];
      default: return ['entity'];
    }
  }

  const TYPE_META: Partial<Record<TileType, { label: string; icon: string }>> = {
    entity: { label: 'Entity', icon: 'square' },
    light: { label: 'Light', icon: 'lightbulb' },
    gauge: { label: 'Gauge', icon: 'gauge' },
    history: { label: 'History', icon: 'chart-no-axes-combined' },
    climate: { label: 'Climate', icon: 'thermometer' },
    camera: { label: 'Camera', icon: 'camera' },
    media_player: { label: 'Media', icon: 'tv' },
    media_hero: { label: 'Custom Media', icon: 'tv' },
    fan: { label: 'Fan', icon: 'fan' },
    lock: { label: 'Lock', icon: 'lock' },
    cover: { label: 'Cover', icon: 'blinds' },
    weather: { label: 'Weather', icon: 'cloud-sun' },
    timer: { label: 'Timer', icon: 'timer' },
    todo: { label: 'Todo', icon: 'list-checks' },
    update: { label: 'Update', icon: 'download' },
    slider: { label: 'Slider', icon: 'sliders-horizontal' },
    input_select: { label: 'Options', icon: 'list' },
    button: { label: 'Button', icon: 'sparkles' },
    alarm_panel: { label: 'Alarm', icon: 'shield' },
    person: { label: 'Person', icon: 'user' },
    vacuum: { label: 'Vacuum', icon: 'disc' },
    lawn_mower: { label: 'Mower', icon: 'scissors' },
    humidifier: { label: 'Humidifier', icon: 'droplets' },
    water_heater: { label: 'Heater', icon: 'flame' },
    siren: { label: 'Siren', icon: 'siren' },
    remote: { label: 'Remote', icon: 'tv' },
    markdown: { label: 'Text', icon: 'type' },
    divider: { label: 'Divider', icon: 'minus' },
    iframe: { label: 'Webpage', icon: 'globe' },
    image: { label: 'Image', icon: 'image' }
  };

  function displayName(entityId?: string): string {
    if (!entityId) return 'Tile';
    const entity = $entities[entityId];
    return entity ? getEntityName(entity) : entityId;
  }

  function pickSource(type: TileType, entityId?: string) {
    selectedEntityId = entityId;
    const types = entityId ? candidateTypes(entityId) : [type];

    if (types.length === 1) {
      selectedType = types[0];
      const allowed = getAllowedPresets(selectedType);
      selectedPreset = allowed.includes('md') ? 'md' : allowed[0];
      step = 'size';
      return;
    }

    selectedType = null;
    step = 'type';
  }

  function pickType(type: TileType) {
    selectedType = type;
    const allowed = getAllowedPresets(type);
    selectedPreset = allowed.includes('md') ? 'md' : allowed[0];
    step = 'size';
  }

  const previewTile = $derived.by(() => {
    if (!selectedType) return null;
    const span = clampSpanToView(resolvePresetToSpan(selectedType, selectedPreset, resolvePreviewBreakpoint()));
    const preview: Tile = {
      id: 'preview',
      type: selectedType,
      entity_id: selectedEntityId,
      size: span,
      sizePreset: selectedPreset,
      layout: { x: 0, y: 0, w: span.w, h: span.h },
      visibility: { ...VISIBLE_ALL },
      config: {
        tap_action: { type: 'none' },
        hold_action: { type: 'none' },
        double_tap_action: { type: 'none' }
      }
    };
    return preview;
  });

  const previewCols = $derived.by(() => {
    const hinted = Math.max(1, Math.floor(columnHint || 0));
    if (hinted > 0) return Math.min(6, hinted);
    if (breakpoint === 'sm') return 2;
    if (breakpoint === 'md') return 3;
    return 4;
  });

  // Fixed row height that gives tiles enough room to render properly.
  const previewRowHeight = 156;

  const previewShellMinHeight = $derived.by(() => {
    const rows = previewTile?.layout?.h ?? 1;
    return rows * previewRowHeight + 36;
  });

  function createTile() {
    if (!selectedType) return;
    const span = clampSpanToView(resolvePresetToSpan(selectedType, selectedPreset, resolvePreviewBreakpoint()));
    const newTile: Tile = {
      id: generateId(),
      type: selectedType,
      entity_id: selectedEntityId,
      size: span,
      sizePreset: selectedPreset,
      layout: { x: 0, y: 0, w: span.w, h: span.h },
      visibility: { ...VISIBLE_ALL },
      config: {
        tap_action: { type: ACTUATOR_TYPES.has(selectedType) ? 'toggle' : 'more-info' },
        hold_action: { type: 'more-info' },
        double_tap_action: { type: 'more-info' }
      }
    };

    dashboardStore.insertTileAt(pageId, sectionId, newTile, undefined, columnHint || undefined);
    onclose();
    editMode.selectTile(pageId, sectionId, newTile.id);
  }

  function goBack() {
    if (step === 'size') {
      if (selectedEntityId && candidateTypes(selectedEntityId).length > 1) {
        step = 'type';
      } else {
        step = 'source';
      }
      return;
    }

    if (step === 'type') {
      step = 'source';
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="tp-backdrop" onclick={onclose}></div>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="tp-modal" role="dialog" aria-modal="true" aria-label="Add Tile" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <header class="tp-header">
      <div class="tp-header__left">
        <button class="tp-nav-btn" onclick={onclose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>
        {#if step !== 'source'}
          <button class="tp-nav-btn" onclick={goBack} aria-label="Back">
            <Icon name="arrow-left" size={16} />
          </button>
        {/if}
        <div>
          <h2 class="tp-title">Add Tile</h2>
          <p class="tp-subtitle">
            {#if step === 'source'}Choose an entity or widget.{/if}
            {#if step === 'type'}Choose how this tile should render.{/if}
			{#if step === 'size'}Choose the size preset and review the preview.{/if}
          </p>
        </div>
      </div>
    </header>

    {#if step === 'source'}
      <div class="tp-source">
        <div class="tp-static">
          {#each STATIC_TILES as item}
            <button class="tp-static-btn" onclick={() => pickSource(item.type)}>
              <Icon name={item.icon} size={16} strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          {/each}
        </div>

        <div class="tp-search-wrap">
          <Icon name="search" size={17} />
          <input
            class="tp-search"
            type="search"
            placeholder="Search entities…"
            bind:value={search}
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="tp-list">
          {#each filteredEntities as entity (entity.entity_id)}
            <button class="tp-entity" onclick={() => pickSource('entity', entity.entity_id)}>
              <span class="tp-entity__name">{displayName(entity.entity_id)}</span>
              <span class="tp-entity__id">{entity.entity_id}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if step === 'type'}
      <div class="tp-type-grid">
        {#each (selectedEntityId ? candidateTypes(selectedEntityId) : []) as type}
          <button class="tp-type-btn" onclick={() => pickType(type)}>
            <Icon name={TYPE_META[type]?.icon ?? 'box'} size={18} strokeWidth={1.75} />
            <span>{TYPE_META[type]?.label ?? type}</span>
          </button>
        {/each}
      </div>
    {/if}

    {#if step === 'size' && selectedType}
      <div class="tp-size-step">
        <div class="tp-size-meta">
          <div>
            <div class="tp-chip">{TYPE_META[selectedType]?.label ?? selectedType}</div>
            <div class="tp-entity-label">{displayName(selectedEntityId)}</div>
          </div>
        </div>

        <div class="tp-preset-row">
          {#each getAllowedPresets(selectedType) as preset}
            <button
              class="tp-preset-btn"
              class:tp-preset-btn--active={selectedPreset === preset}
              onclick={() => (selectedPreset = preset)}
            >
              {preset === 'sm' ? 'Small' : preset === 'md' ? 'Medium' : preset === 'lg' ? 'Large' : 'XL'}
            </button>
          {/each}
        </div>

        <div class="tp-preview-shell" style="min-height:{previewShellMinHeight}px;">
          <div class="tp-preview-grid" style="grid-auto-rows:{previewRowHeight}px;--tp-preview-cols:{previewCols};">
            {#if previewTile}
              {@const cols = previewTile.layout?.w ?? 1}
              {@const rows = previewTile.layout?.h ?? 1}
              <div
                class="tp-preview-slot"
                style="grid-column: span {cols}; grid-row: span {rows}; height: {rows * previewRowHeight + (rows - 1) * 10}px;"
              >
                <TileRenderer tile={previewTile} />
              </div>
            {/if}
          </div>
        </div>

        <button class="tp-confirm" onclick={createTile}>Add tile</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .tp-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.28);
    z-index: 399;
  }

  .tp-modal {
    position: fixed;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    width: min(860px, 96dvw);
    max-height: min(760px, 92dvh);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) + 6px);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 400;
  }

  .tp-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 14px;
    border-bottom: 1px solid var(--border);
  }

  .tp-header__left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .tp-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 650;
    color: var(--fg);
  }

  .tp-subtitle {
    margin: 4px 0 0;
    font-size: 0.82rem;
    color: var(--fg-muted);
  }

  .tp-nav-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--fg-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .tp-nav-btn:hover { background: var(--hover); color: var(--fg); }

  .tp-source,
  .tp-size-step {
    padding: 16px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
  }

  .tp-type-grid {
    padding: 18px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .tp-static {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    justify-items: center;
  }

  .tp-static-btn,
  .tp-type-btn {
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
    color: var(--fg);
    border-radius: var(--radius);
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    font: inherit;
    cursor: pointer;
    width: 100%;
    min-height: 44px;
  }

  .tp-static-btn > span,
  .tp-type-btn > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .tp-static-btn:hover,
  .tp-type-btn:hover,
  .tp-entity:hover,
  .tp-preset-btn:hover {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    background: color-mix(in srgb, var(--accent) 8%, var(--bg-elevated));
  }

  .tp-search-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 16px;
    height: 52px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--fg-subtle);
    background: var(--hover);
    flex-shrink: 0;
  }

  .tp-search {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: var(--fg);
    font: inherit;
    font-size: 1.05rem;
    outline: none;
    font-weight: 500;
  }

  .tp-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    overflow: auto;
  }

  .tp-entity {
    border: 1px solid var(--border);
    background: transparent;
    border-radius: var(--radius);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    cursor: pointer;
  }

  .tp-entity__name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--fg);
  }

  .tp-entity__id {
    font-size: 0.74rem;
    color: var(--fg-muted);
  }

  .tp-size-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .tp-chip {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
  }

  .tp-entity-label {
    margin-top: 8px;
    font-size: 0.84rem;
    color: var(--fg-muted);
  }

  .tp-preset-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tp-preset-btn {
    height: 38px;
    min-width: 96px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--fg-muted);
    font: inherit;
    cursor: pointer;
  }

  .tp-preset-btn--active {
    border-color: var(--accent);
    color: var(--fg);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }

  .tp-preview-shell {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
    background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
    display: flex;
    overflow: auto;
  }

  .tp-preview-grid {
    display: grid;
    grid-template-columns: repeat(var(--tp-preview-cols, 4), minmax(0, 1fr));
    gap: 10px;
    align-items: stretch;
    width: 100%;
    overflow: visible;
  }

  .tp-preview-slot {
    display: flex;
    min-width: 0;
    overflow: visible;
  }

  /* Force the tile-wrapper to fill its preview cell completely */
  .tp-preview-slot :global(.tile-wrapper) {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: visible;
  }

  .tp-confirm {
    height: 42px;
    border: none;
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--accent) 18%, var(--bg-elevated));
    color: var(--fg);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .tp-confirm:hover {
    background: color-mix(in srgb, var(--accent) 24%, var(--bg-elevated));
  }
</style>
