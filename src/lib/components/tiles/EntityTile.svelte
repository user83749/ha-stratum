<script lang="ts">
  // ── EntityTile ───────────────────────────────────────────────────────────

  // ── Imports ─────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';
  import {
    getEntityIcon, getEntityName, getStateColor,
    isActive, isUnavailable, formatState
  } from '$lib/ha/entities';
  import { relativeTime } from '$lib/utils/format';
  import { entities } from '$lib/ha/websocket';
  import { relativeNow } from '$lib/stores/clock';

  // ── Props ───────────────────────────────────────────────────────────────
  let { tile, entity }: { tile: Tile; entity: HassEntity | null } = $props();

  // ── Derived State ───────────────────────────────────────────────────────
  const cfg             = $derived(tile.config ?? {});
  const sizePreset = $derived(getTileSizePreset(tile));
  const showName        = $derived(cfg.show_name !== false);
  const showIcon        = $derived(cfg.show_icon !== false);
  const showState       = $derived(cfg.show_state !== false);
  const showLastChanged = $derived(cfg.show_last_changed === true);
  const showAttributes  = $derived((cfg.show_attributes ?? []) as string[]);

  const icon        = $derived(entity ? (cfg.icon ?? getEntityIcon(entity)) : (cfg.icon ?? 'circle-dot'));
  const name        = $derived(entity ? (cfg.name ?? getEntityName(entity)) : (cfg.name ?? tile.entity_id ?? ''));
  const stateText   = $derived(entity ? formatState(entity) : '—');
  const entityColor = $derived.by(() => {
    if (!entity) return 'var(--fg-subtle)';
    if (isUnavailable(entity)) return 'var(--tile-label-unavailable, var(--fg-subtle))';
    if (isActive(entity)) return getStateColor(entity);
    return 'var(--tile-label-off, #97989c)';
  });
  const active      = $derived(entity ? isActive(entity) : false);
  const unavailable = $derived(entity ? isUnavailable(entity) : false);
  const iconIsCustom = $derived(typeof icon === 'string' && isCustomIcon(icon));

  // ── Secondary / Attributes ─────────────────────────────────────────────
  const secondaryEntity = $derived(
    cfg.secondary_entity_id ? ($entities[cfg.secondary_entity_id] ?? null) : null
  );
  const showExtraMeta = $derived(sizePreset === 'lg' || sizePreset === 'xl');
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
  const showAttributeCards = $derived((sizePreset === 'lg' || sizePreset === 'xl') && attributeRows.length > 0);

  const lastChangedText = $derived.by(() => {
    if (!showLastChanged || !entity?.last_changed) return '';
    // Keep reactive dependency so this recomputes on the shared 30s cycle only.
    $relativeNow;
    return relativeTime(entity.last_changed);
  });
</script>

<div
  class="entity-tile"
  class:active
  class:unavailable
  class:no-icon={!showIcon}
  style="--ec: {entityColor};"
>
  <!-- ── Primary layout ─────────────────────────────────────────────── -->
  {#if showIcon}
    <div class="icon-wrap" class:active class:is-custom={iconIsCustom}>
      {#if iconIsCustom}
        <Icon name={icon} entity={entity} />
      {:else}
        <Icon name={icon} entity={entity} size="100%" />
      {/if}
    </div>
  {/if}

  <!-- ── Circle placeholder ──────────────────────────────────────────── -->
  <div class="circle-placeholder"></div>

  {#if showName}
    <span class="name-text">{name}</span>
  {/if}
  {#if showState}
    <span class="state-text">{stateText}</span>
  {/if}
  {#if showExtraMeta && secondaryValue !== null}
    <span class="secondary-val">{secondaryValue}</span>
  {/if}
  {#if showExtraMeta && showLastChanged && lastChangedText}
    <span class="changed-val">{lastChangedText}</span>
  {/if}

  <!-- ── Attribute cards ─────────────────────────────────────────────── -->
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
    display: grid;
    grid-template-areas:
      "icon circle"
      "n    n"
      "s    s";
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto repeat(2, min-content);
    gap: 1.3%;
    align-items: start;
    position: relative;
  }

  .entity-tile.no-icon {
    grid-template-areas:
      "n n"
      "s s";
    grid-template-rows: repeat(2, min-content);
  }

  /* ── Icon (grid-area: icon) ──────────────────────────────────────────── */
  .icon-wrap {
    grid-area: icon;
    position: relative;
    z-index: 1;
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ec);
    transition: color var(--transition);
  }
  .icon-wrap.is-custom {
    /* Keep a square icon box so percentage-based custom icon spacing remains stable. */
    display: block;
    line-height: 0;
  }

  /* ── Circle placeholder (grid-area: circle) — invisible spacer ──────── */
  .circle-placeholder {
    grid-area: circle;
  }

  /* ── Name / state grid areas ─────────────────────────────────────────── */
  .name-text { grid-area: n; }
  .state-text { grid-area: s; }

  .name-text {
    justify-self: start;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.21;
  }

  .state-text {
    justify-self: start;
    line-height: 1.15;
    font-size: var(--button-card-font-size);
    font-weight: var(--button-card-font-weight);
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color var(--transition);
  }

  .state-text::first-letter {
    text-transform: uppercase;
  }

  .secondary-val {
    grid-column: 1 / -1;
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .changed-val {
    grid-column: 1 / -1;
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
    opacity: 0.8;
  }



  /* ── Active entity state ─────────────────────────────────────────────── */
  .entity-tile.active .name-text  { color: var(--tile-label-on, var(--control-active-name)); }
  .entity-tile.active .state-text { color: var(--tile-label-on, var(--control-active-name)); }

  .entity-tile.unavailable .state-text {
    line-height: 1.15;
    color: var(--tile-label-unavailable, var(--fg-subtle));
  }

  /* ── Unavailable ─────────────────────────────────────────────────────── */
  .entity-tile.unavailable { opacity: 0.45; }

  /* ── Attribute grid — hidden by default, shown on larger tiles ────────── */
  .attr-grid {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 1fr 1fr;
    gap: calc(var(--tile-padding-effective) * 0.45);
    position: relative;
    z-index: 1;
  }



  .attr-card {
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: calc(var(--tile-padding-effective) * 0.55) calc(var(--tile-padding-effective) * 0.72);
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-padding-effective) * 0.18);
    min-width: 0;
  }

  .attr-label {
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .attr-value {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }</style>
