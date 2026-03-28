<script lang="ts">
  // ── EnergyTile ────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const state = $derived(entity?.state ?? '0');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Energy');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const unit = $derived(attrs.unit_of_measurement as string ?? 'W');
  const deviceClass = $derived(attrs.device_class as string ?? '');
  const value = $derived(parseFloat(state) || 0);
  const displayValue = $derived(
    Math.abs(value) >= 1000
      ? (value / 1000).toFixed(1) + (unit === 'W' ? ' kW' : ' k' + unit)
      : value.toFixed(1) + ' ' + unit
  );
  function iconForClass(dc: string) {
    if (dc === 'battery') return 'battery-charging';
    if (dc === 'current') return 'zap';
    if (dc === 'energy') return 'activity';
    if (dc === 'gas') return 'flame';
    if (dc === 'monetary') return 'dollar-sign';
    if (dc === 'power') return 'zap';
    if (dc === 'voltage') return 'activity';
    if (dc === 'water') return 'droplets';
    return 'plug-zap';
  }
  const isPositive = $derived(value >= 0);
  const flowColor = $derived(deviceClass === 'battery' ? 'var(--color-info)' : isPositive ? 'var(--color-warning)' : 'var(--color-on)');
  const showName = $derived(sizePreset === 'lg' || sizePreset === 'xl');
  const showMeta = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  // ── Helpers ───────────────────────────────────────────────────────────────
</script>

<BaseTile {name} state={displayValue} isOn={isPositive} style="--ec: {flowColor};">

  {#snippet icon()}
    <div class="icon-sq" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <Icon name={iconOverride} entity={entity} size="100%" />
        {/if}
      {:else}
        <Icon name={iconForClass(deviceClass)} size="100%" />
      {/if}
    </div>
  {/snippet}

  {#snippet circle()}
    {#if showMeta && deviceClass}
      <span class="meta-chip">{deviceClass}</span>
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
    color: var(--ec);
    background: color-mix(in srgb, var(--ec) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--ec) var(--control-chip-border-strength), transparent);
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

  .meta-chip {
    display: inline-block;
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--ec);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.8;
  }
</style>
