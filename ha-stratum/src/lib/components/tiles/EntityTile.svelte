<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import {
    getEntityIcon, getEntityName, getStateColor,
    isActive, isUnavailable, formatState
  } from '$lib/ha/entities';
  import { relativeTime } from '$lib/utils/format';
  import { entities } from '$lib/ha/websocket';

  let { tile, entity }: { tile: Tile; entity: HassEntity | null } = $props();

  const cfg             = $derived(tile.config ?? {});
  const showName        = $derived(cfg.show_name !== false);
  const showIcon        = $derived(cfg.show_icon !== false);
  const showState       = $derived(cfg.show_state !== false);
  const showLastChanged = $derived(cfg.show_last_changed === true);
  const showAttributes  = $derived((cfg.show_attributes ?? []) as string[]);
  const sizePreset      = $derived(tile.sizePreset ?? 'md');

  const icon        = $derived(entity ? (cfg.icon ?? getEntityIcon(entity)) : (cfg.icon ?? 'circle-dot'));
  const name        = $derived(entity ? (cfg.name ?? getEntityName(entity)) : (cfg.name ?? tile.entity_id ?? ''));
  const stateText   = $derived(entity ? formatState(entity) : '—');
  const entityColor = $derived(entity ? getStateColor(entity) : 'var(--fg-subtle)');
  const active      = $derived(entity ? isActive(entity) : false);
  const unavailable = $derived(entity ? isUnavailable(entity) : false);

  const secondaryEntity = $derived(
    cfg.secondary_entity_id ? ($entities[cfg.secondary_entity_id] ?? null) : null
  );
  const secondaryValue = $derived.by(() => {
    if (!secondaryEntity) return null;
    if (cfg.secondary_attribute) {
      const val = secondaryEntity.attributes[cfg.secondary_attribute];
      return val !== undefined ? String(val) : null;
    }
    return formatState(secondaryEntity);
  });

  const attributeRows = $derived.by(() => {
    if (!entity || showAttributes.length === 0) return [];
    return showAttributes
      .filter((key: string) => entity!.attributes[key] !== undefined)
      .map((key: string) => ({
        label: key.replace(/_/g, ' '),
        value: String(entity!.attributes[key])
      }));
  });

  let lastChangedText = $state('');
  $effect(() => {
    function refresh() {
      lastChangedText = entity?.last_changed ? relativeTime(entity.last_changed) : '';
    }
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  });

  const showStateLine   = $derived(showState && sizePreset !== 'sm');
  const showSecondaryLine = $derived(sizePreset !== 'sm' && secondaryValue !== null);
  const showChangedLine = $derived(sizePreset !== 'sm' && showLastChanged && !!lastChangedText);
  const showAttributeCards = $derived((sizePreset === 'lg' || sizePreset === 'xl') && attributeRows.length > 0);
</script>

<div
  class="entity-tile"
  class:active
  class:unavailable
  style="--ec: {entityColor};"
>
  <!-- Icon top-left -->
  {#if showIcon}
    <div class="icon-wrap" class:active>
      <Icon name={icon} entity={entity} />
    </div>
  {/if}

  <!-- Name + state pushed to bottom -->
  <div class="bottom-content">
    {#if showName}
      <span class="name-text">{name}</span>
    {/if}
    {#if showStateLine}
      <span class="state-text">{stateText}</span>
    {/if}
    {#if showSecondaryLine}
      <span class="secondary-val">{secondaryValue}</span>
    {/if}
    {#if showChangedLine}
      <span class="changed-val">{lastChangedText}</span>
    {/if}
  </div>

  <!-- Attribute cards only on large tiles -->
  {#if showAttributeCards}
    <div class="attr-grid">
      {#each attributeRows as row}
        <div class="attr-card">
          <span class="attr-label">{row.label}</span>
          <span class="attr-value">{row.value}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .entity-tile {
    --ec: var(--fg-subtle);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 4px;
    position: relative;
  }

  /* ── Icon ────────────────────────────────────────────────────────────── */
  .icon-wrap {
    position: relative;
    z-index: 1;
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    /* Generic entity icon chip only: this is the icon-chip border/fill layer,
       not the outer tile face. Keep it aligned with the outlined chip treatment
       used by the timer/fan/lock style tiles. */
    background: color-mix(in srgb, var(--ec) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--ec) var(--control-chip-border-strength), transparent);
    color: var(--ec);
    transition: background var(--transition), border-color var(--transition), color var(--transition);
  }

  

  .bottom-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    margin-top: auto;
    }

  

  

  /* Changes the active name text only. */
  .entity-tile.active .name-text { color: var(--control-active-name); }

  /* Changes the active state text only. */
  .entity-tile.active .state-text { color: var(--control-active-name); }

  .entity-tile.unavailable .state-text {
    line-height: 1.15;
    color: var(--fg-subtle);
  }

  .secondary-val {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .changed-val {
    font-size: 0.6rem;
    color: var(--fg-subtle);
  }

  /* ── Attribute grid ──────────────────────────────────────────────────── */
  .attr-grid {
    display: none;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    position: relative;
    z-index: 1;
  }

  @container tile (min-width: 280px) and (min-height: 160px) {
    .attr-grid { display: grid; }
  }

  .attr-card {
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .attr-label {
    font-size: 0.58rem;
    color: var(--fg-subtle);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .attr-value {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Small tile ──────────────────────────────────────────────────────── */
  @container tile (max-width: 140px) {
    .icon-wrap {
    width: var(--control-chip-size-compact);
    height: var(--control-chip-size-compact);
    border-radius: var(--control-chip-radius-compact); }
    .secondary-val, .changed-val { display: none; }
  }

  @container tile (max-width: 100px) {
    .entity-tile { align-items: center; justify-content: center; }
    .bottom-content { align-items: center; text-align: center; margin-top: 0; }
    
    
  }

  /* ── Short horizontal ────────────────────────────────────────────────── */
  @container tile (max-height: 80px) {
    .entity-tile { flex-direction: row; align-items: center; gap: 10px; }
    .bottom-content { margin-top: 0; flex: 1; }
    .attr-grid { display: none; }
  }

  /* ── Unavailable ─────────────────────────────────────────────────────── */
  .entity-tile.unavailable { opacity: 0.45; }

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
    color: var(--fg);
    transition: color var(--transition);
  }

</style>
