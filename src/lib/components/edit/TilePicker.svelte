<script lang="ts">
  // ── TilePicker ─────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import { generateId } from '$lib/utils/uuid';
  import { entities } from '$lib/ha/websocket';
  import { getDomain, getEntityName } from '$lib/ha/entities';
  import { dashboardStore } from '$lib/stores/dashboard';
  import { editMode } from '$lib/stores/editMode';
  import Icon from '$lib/components/ui/Icon.svelte';
  import TileRenderer from '$lib/components/tiles/TileRenderer.svelte';
  import type { Tile, TileType } from '$lib/types/dashboard';
  import { VISIBLE_ALL } from '$lib/types/dashboard';
  import { getAllowedPresets, resolvePresetToSpan } from '$lib/layout/tileSizing';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props {
    open: boolean;
    sectionId: string;
    pageId: string;
    columnHint?: number;
    onclose: () => void;
  }

  const { open, sectionId, pageId, columnHint = 0, onclose }: Props = $props();

  // ── Local State ───────────────────────────────────────────────────────────
  type Step = 'source' | 'type' | 'size';

  let search = $state('');
  let step = $state<Step>('source');
  let selectedEntityId = $state<string | undefined>(undefined);
  let selectedType = $state<TileType | null>(null);
  let selectedPreset = $state<'sm' | 'md' | 'lg' | 'xl'>('sm');
  let previewGridWidth = $state(0);
  let liveSectionGridWidth = $state(0);
  let liveSectionActiveColumns = $state(0);
  const PREVIEW_IMAGE_DATA_URI =
    'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 600 360%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop stop-color=%22%23364a5c%22/%3E%3Cstop offset=%221%22 stop-color=%22%23232f3c%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22600%22 height=%22360%22 fill=%22url(%23g)%22/%3E%3Ccircle cx=%22125%22 cy=%22115%22 r=%2232%22 fill=%22%23ffffff33%22/%3E%3Cpath d=%22M70 280L185 170l85 78 95-108 165 140H70z%22 fill=%22%23ffffff22%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22%23f5f7fa%22 font-size=%2230%22 text-anchor=%22middle%22 font-family=%22system-ui,-apple-system,Segoe UI,Roboto,sans-serif%22%3EImage Preview%3C/text%3E%3C/svg%3E';
  const PREVIEW_IFRAME_DATA_URI =
    'data:text/html,%3C!doctype%20html%3E%3Chtml%3E%3Chead%3E%3Cmeta%20charset=%22utf-8%22/%3E%3Cmeta%20name=%22viewport%22%20content=%22width=device-width,initial-scale=1%22/%3E%3Cstyle%3Ehtml,body%7Bheight:100%25;margin:0;font-family:system-ui,-apple-system,Segoe%20UI,Roboto,sans-serif;background:linear-gradient(135deg,%231f2d3d,%2333475f);color:%23eef3f8;display:grid;place-items:center%7D.card%7Bpadding:14px%2018px;border-radius:14px;background:rgba(255,255,255,.1);backdrop-filter:blur(6px);font-size:16px%7D%3C/style%3E%3C/head%3E%3Cbody%3E%3Cdiv%20class=%22card%22%3EWebpage%20Preview%3C/div%3E%3C/body%3E%3C/html%3E';

  // Preview should mirror current app breakpoint sizing so tile internals
  // (font/icon/control scales) match the live dashboard.
  function resolvePreviewBreakpoint(): 'sm' | 'md' | 'lg' {
    if (typeof window === 'undefined') return 'lg';
    const width = window.innerWidth;
    if (width <= 800) return 'sm';
    if (width <= 1160) return 'md';
    return 'lg';
  }

  function getDefaultPresetForType(type: TileType): 'sm' | 'md' | 'lg' | 'xl' {
    if (type === 'media_player' || type === 'media_hero') return 'lg';
    return 'sm';
  }

  // ── Open-State Reset ──────────────────────────────────────────────────────
  $effect(() => {
    if (!open) return;
    search = '';
    step = 'source';
    selectedEntityId = undefined;
    selectedType = null;
    selectedPreset = 'sm';
    liveSectionGridWidth = 0;
    liveSectionActiveColumns = 0;
  });

  $effect(() => {
    if (!open || typeof document === 'undefined') return;

    const safeSectionId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(sectionId)
      : sectionId;
    const sectionEl = document.querySelector<HTMLElement>(`[data-section-id="${safeSectionId}"]`);
    if (!sectionEl) {
      liveSectionGridWidth = 0;
      liveSectionActiveColumns = 0;
      return;
    }
    const gridEl = sectionEl?.querySelector<HTMLElement>('.section__grid-ctr') ?? null;
    const readColumns = () => {
      const raw = sectionEl?.dataset.activeColumns ?? '';
      const parsed = Number(raw);
      liveSectionActiveColumns = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
    };
    const readWidth = () => {
      if (!gridEl) return;
      liveSectionGridWidth = Math.round(gridEl.clientWidth);
    };

    readColumns();
    readWidth();

    if (!gridEl) return;

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          readColumns();
          readWidth();
        })
      : null;
    resizeObserver?.observe(gridEl);

    const attrObserver = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(() => {
          readColumns();
          readWidth();
        })
      : null;
    attrObserver?.observe(sectionEl, { attributes: true, attributeFilter: ['data-active-columns'] });

    const onWindowResize = () => {
      readColumns();
      readWidth();
    };
    window.addEventListener('resize', onWindowResize);

    return () => {
      resizeObserver?.disconnect();
      attrObserver?.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  });

  // ── Entity / Source Derivations ──────────────────────────────────────────
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
    if (isChipHorizontalRow) return ['entity'];
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
      case 'select': return ['input_select', 'entity'];
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
    if (isChipHorizontalRow) {
      if (!entityId) return;
      selectedEntityId = entityId;
      selectedType = 'entity';
      selectedPreset = 'sm';
      step = 'size';
      return;
    }
    selectedEntityId = entityId;
    const types = entityId ? candidateTypes(entityId) : [type];

    if (types.length === 1) {
      selectedType = types[0];
      const allowed = getAllowedPresets(selectedType);
      const preferred = getDefaultPresetForType(selectedType);
      selectedPreset = allowed.includes(preferred) ? preferred : allowed[0];
      step = 'size';
      return;
    }

    selectedType = null;
    step = 'type';
  }

  function pickType(type: TileType) {
    selectedType = type;
    const allowed = getAllowedPresets(type);
    const preferred = getDefaultPresetForType(type);
    selectedPreset = allowed.includes(preferred) ? preferred : allowed[0];
    step = 'size';
  }

  // ── Preview Construction ──────────────────────────────────────────────────
  function buildPreviewConfig(type: TileType): Tile['config'] {
    const base: Tile['config'] = {
      tap_action: { type: 'none' },
      hold_action: { type: 'none' },
      double_tap_action: { type: 'none' }
    };

    if (type === 'markdown') {
      return {
        ...base,
        content: '## Tile Preview\n- Sample line one\n- Sample line two'
      };
    }

    if (type === 'iframe') {
      return {
        ...base,
        url: PREVIEW_IFRAME_DATA_URI
      };
    }

    if (type === 'image') {
      return {
        ...base,
        url: PREVIEW_IMAGE_DATA_URI
      };
    }

    if (type === 'media_hero') {
      return {
        ...base,
        name: 'Now Playing',
        show_artwork: true,
        show_progress: true
      };
    }

    return base;
  }

  const previewTile = $derived.by(() => {
    if (!selectedType) return null;
    const span = resolvePresetToSpan(selectedType, selectedPreset, resolvePreviewBreakpoint());
    const preview: Tile = {
      id: 'preview',
      type: selectedType,
      entity_id: selectedEntityId,
      size: span,
      sizePreset: selectedPreset,
      layout: { x: 0, y: 0, w: span.w, h: span.h },
      visibility: { ...VISIBLE_ALL },
      config: buildPreviewConfig(selectedType)
    };
    return preview;
  });

  // Preview canvas mirrors SectionGrid sizing math so the add-tile preview
  // reflects the same column density and span proportions as the dashboard.
  const previewSection = $derived.by(() => {
    const page = $dashboardStore.pages.find((p) => p.id === pageId);
    return page?.sections.find((s) => s.id === sectionId) ?? null;
  });
  const previewGridWidthEffective = $derived.by(() => {
    return liveSectionGridWidth > 0 ? liveSectionGridWidth : previewGridWidth;
  });
  const isChipHorizontalRow = $derived(previewSection?.layoutMode === 'horizontal_chip_row');
  const previewGridGap = $derived.by(() => Number(previewSection?.grid.gap ?? 0));
  const previewGridPad = $derived.by(() => Number(previewSection?.padding ?? 0));
  const previewColumns = $derived.by(() => {
    if (liveSectionActiveColumns > 0) return liveSectionActiveColumns;
    if (columnHint > 0) return columnHint;
    const explicitColumns = previewSection?.grid.columns;
    if (explicitColumns && explicitColumns > 0) return explicitColumns;

    const base = Number(previewSection?.grid.baseSize ?? 120);
    if (!Number.isFinite(base) || base <= 0) return 2;
    if (!Number.isFinite(previewGridGap)) return 2;
    if (!previewGridWidthEffective || previewGridWidthEffective <= 0) return 2;

    const fit = Math.floor((previewGridWidthEffective + previewGridGap) / (base + previewGridGap));
    return Math.max(2, Math.min(3, fit));
  });
  const previewCellSize = $derived.by(() => {
    const base = Number(previewSection?.grid.baseSize ?? 120);
    const usable =
      previewGridWidthEffective -
      previewGridPad * 2 -
      (previewColumns - 1) * previewGridGap;

    if (!Number.isFinite(usable) || usable <= 0) return Math.max(1, base);
    return Math.max(1, usable / Math.max(1, previewColumns));
  });
  const previewPadY = $derived.by(() => Math.max(1, Math.round(previewCellSize * 0.22)));

  const previewTileWidth = $derived.by(() => {
    const w = previewTile?.layout?.w ?? 1;
    return w * previewCellSize + Math.max(0, w - 1) * previewGridGap;
  });
  const previewTileHeight = $derived.by(() => {
    const h = previewTile?.layout?.h ?? 1;
    return h * previewCellSize + Math.max(0, h - 1) * previewGridGap;
  });

  const previewGridStyle = $derived.by(() => {
    const cols = Math.max(1, previewColumns);
    const gap = Number(previewSection?.grid.gap ?? 0);
    const pad = Number(previewSection?.padding ?? 0);
    const parts: string[] = [];

    parts.push(`grid-template-columns: repeat(${cols}, 1fr)`);
    const subtract = pad * 2 + (cols - 1) * gap;
    parts.push(`grid-auto-rows: calc((100cqw - ${subtract}px) / ${cols})`);
    parts.push(`gap: ${gap}px`);
    if (pad > 0) parts.push(`padding: ${pad}px`);

    return parts.join('; ');
  });

  const previewGridContainerWidth = $derived.by(() => {
    const width = previewGridWidthEffective > 0 ? previewGridWidthEffective : previewGridWidth;
    return Math.max(1, width);
  });

  const previewShellMinHeight = $derived.by(() => {
    return previewTileHeight + previewPadY * 2;
  });

  function createTile() {
    if (!selectedType) return;
    if (isChipHorizontalRow && !selectedEntityId) return;
    const finalType: TileType = isChipHorizontalRow ? 'entity' : selectedType;
    const finalPreset = isChipHorizontalRow ? 'sm' : selectedPreset;
    // Persist the selected preset span directly; placement logic handles fit.
    const span = resolvePresetToSpan(finalType, finalPreset, resolvePreviewBreakpoint());
    const newTile: Tile = {
      id: generateId(),
      type: finalType,
      entity_id: selectedEntityId,
      size: span,
      sizePreset: finalPreset,
      layout: { x: 0, y: 0, w: span.w, h: span.h },
      visibility: { ...VISIBLE_ALL },
      config: {
        tap_action: { type: isChipHorizontalRow ? 'more-info' : (ACTUATOR_TYPES.has(finalType) ? 'toggle' : 'more-info') },
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
        {#if !isChipHorizontalRow}
          <div class="tp-static">
            {#each STATIC_TILES as item}
              <button class="tp-static-btn" onclick={() => pickSource(item.type)}>
                <Icon name={item.icon} size={16} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            {/each}
          </div>
        {/if}

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
            <div class="tp-chip">{isChipHorizontalRow ? 'Chip Button' : (TYPE_META[selectedType]?.label ?? selectedType)}</div>
            <div class="tp-entity-label">{displayName(selectedEntityId)}</div>
          </div>
        </div>

        {#if !isChipHorizontalRow}
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
        {/if}

        <div class="tp-preview-shell" bind:clientWidth={previewGridWidth} style="min-height:{previewShellMinHeight}px;">
          <div class="tp-preview-canvas">
            {#if previewTile}
              <div class="tp-preview-grid-ctr" style="width:{previewGridContainerWidth}px;">
                <div class="tp-preview-grid" style={previewGridStyle}>
                  <div
                    class="tp-preview-slot"
                    style="grid-column: 1 / span {previewTile.layout?.w ?? 1}; grid-row: 1 / span {previewTile.layout?.h ?? 1};"
                  >
                    <TileRenderer tile={previewTile} preview={true} />
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <button class="tp-confirm" onclick={createTile}>{isChipHorizontalRow ? 'Add chip' : 'Add tile'}</button>
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
    gap: 0.5rem;
  }

  .tp-preset-btn {
    height: 2.35rem;
    min-width: 6rem;
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
    padding: 0;
    background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
    display: flex;
    overflow: auto;
  }

  .tp-preview-canvas {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 100%;
    width: max-content;
    min-height: 100%;
    overflow: visible;
  }

  .tp-preview-grid-ctr {
    container-type: inline-size;
    max-width: 100%;
  }

  .tp-preview-grid {
    display: grid;
    position: relative;
  }

  .tp-preview-slot {
    display: flex;
    min-width: 0;
    min-height: 0;
    border-radius: var(--tile-radius, var(--radius));
    overflow: hidden;
  }

  /* Force the tile-wrapper to fill its preview cell completely */
  .tp-preview-slot :global(.tile-wrapper) {
    width: 100%;
    height: 100%;
    min-height: 0;
    border-radius: inherit;
    pointer-events: none;
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
