<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';

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
  const state = $derived(entity?.state ?? '0');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Energy');
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
  const showName = $derived(sizePreset !== 'sm');
  const showMeta = $derived(sizePreset === 'lg' || sizePreset === 'xl');
</script>

<div class="energy-tile" data-size={sizePreset} style="--ec: {flowColor};">


  <div class="tile-content">
    <div class="top">
      <div class="icon-sq">
        <Icon name={iconForClass(deviceClass)} />
      </div>
    </div>

    <div class="bottom">
      <span class="val-hero">{displayValue}</span>
      {#if showName}<span class="name-small">{name}</span>{/if}
      {#if showMeta && deviceClass}<span class="meta-chip">{deviceClass}</span>{/if}
    </div>
  </div>
</div>

<style>
  .energy-tile {
    --ec: var(--color-warning);
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
  }


  .tile-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding-bottom: 4px;
  }

  .top { display: flex; }

  .icon-sq {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ec);
    background: color-mix(in srgb, var(--ec) var(--control-chip-fill-strength), transparent);
    border: var(--control-chip-border-width) solid color-mix(in srgb, var(--ec) var(--control-chip-border-strength), transparent);
    transition: all var(--transition);
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-bottom: 1px;
  }

  .val-hero {
    font-size: clamp(1rem, 7cqw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
    color: var(--ec);
    font-variant-numeric: tabular-nums;
    transition: color var(--transition);
  }

  .name-small {
    font-size: 0.7rem;
    color: var(--fg-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-chip {
    display: inline-block;
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--ec);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  @container tile (max-width: 110px) {
    .icon-sq { width: var(--control-chip-size-compact); height: var(--control-chip-size-compact); border-radius: var(--control-chip-radius-compact); }
  }
  
  @container tile (max-width: 80px) {
    .icon-sq { width: var(--control-chip-size-compact); height: var(--control-chip-size-compact); border-radius: var(--control-chip-radius-compact); }
  }
  @container tile (max-height: 90px) {
    .icon-sq { width: var(--control-chip-size-compact); height: var(--control-chip-size-compact); border-radius: var(--control-chip-radius-compact); }
  }
  @container tile (max-height: 80px) {
    .energy-tile { flex-direction: row; }
    .tile-content { flex-direction: row; align-items: center; gap: 10px; }
    .bottom { flex: 1; }
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
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
