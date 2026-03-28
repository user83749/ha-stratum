<script lang="ts">
  // ── EntityTile ───────────────────────────────────────────────────────────

  // ── Imports ─────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
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

  const entityIcon  = $derived(entity ? (cfg.icon ?? getEntityIcon(entity)) : (cfg.icon ?? 'circle-dot'));
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
  const iconIsCustom = $derived(typeof entityIcon === 'string' && isCustomIcon(entityIcon));

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
    $relativeNow;
    return relativeTime(entity.last_changed);
  });

  const tileStyle = $derived(
    `--tile-label-on: ${entityColor};` +
    (unavailable ? `--tile-label-off: ${entityColor}; opacity: 0.45;` : '')
  );
</script>

<BaseTile {name} state={stateText} isOn={active} {showName} {showState} style={tileStyle}>

  {#snippet icon()}
    {#if showIcon}
      <div class="entity-icon-wrap" class:is-custom={iconIsCustom}>
        {#if iconIsCustom}
          <Icon name={entityIcon} entity={entity} />
        {:else}
          <Icon name={entityIcon} entity={entity} size="100%" />
        {/if}
      </div>
    {/if}
  {/snippet}

  {#snippet below()}
    {#if showExtraMeta && secondaryValue !== null}
      <span class="secondary-val">{secondaryValue}</span>
    {/if}
    {#if showExtraMeta && showLastChanged && lastChangedText}
      <span class="changed-val">{lastChangedText}</span>
    {/if}
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
  {/snippet}

</BaseTile>

<style>
  /* ── Icon wrap (fills icon-area cell, passes color from BaseTile) ─────── */
  .entity-icon-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .entity-icon-wrap.is-custom {
    display: block;
    line-height: 0;
  }

  /* ── Extra meta (lg/xl only) ─────────────────────────────────────────── */
  .secondary-val {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .changed-val {
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
    opacity: 0.8;
  }

  /* ── Attribute grid (lg/xl only) ─────────────────────────────────────── */
  .attr-grid {
    display: grid;
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
  }
</style>
