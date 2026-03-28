<script lang="ts">
  // ── FanTile ───────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import CircleControl from '$lib/components/ui/CircleControl.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { fanService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  // ── Props ─────────────────────────────────────────────────────────────────
  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const iconOverride = $derived((config.icon as string | undefined) ?? undefined);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Fan');
  const isOn = $derived(entity?.state === 'on');
  const speed = $derived(attrs.percentage as number | null ?? null);
  const oscillating = $derived(attrs.oscillating as boolean ?? false);
  const presets = $derived((attrs.preset_modes as string[]) ?? []);
  const currentPreset = $derived(attrs.preset_mode as string ?? '');
  const showSpeedRing = $derived(isOn && speed !== null && sizePreset === 'sm');
  const showPresetChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && presets.length > 0 && isOn);
  const isCustom      = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
</script>

<BaseTile {name} state={isOn ? 'On' : 'Off'} {isOn}>

  {#snippet icon()}
    {#if iconOverride && isCustom}
      <div class="fan-icon-wrap">
        <Icon name={iconOverride} entity={entity} />
      </div>
    {:else}
      <div class="fan-icon" class:on={isOn} class:override={!!iconOverride}>
        {#if iconOverride}
          <span class="icon-span"><Icon name={iconOverride} entity={entity} size="100%" /></span>
        {:else}
          <span class:spinning={isOn} class="fan-glyph">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" />
              <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" transform="rotate(120 12 12)" />
              <ellipse cx="12" cy="6.2" rx="2.2" ry="4.4" fill="currentColor" transform="rotate(240 12 12)" />
              <circle cx="12" cy="12" r="1.9" fill="currentColor" />
            </svg>
          </span>
        {/if}
      </div>
    {/if}
  {/snippet}

  {#snippet circle()}
    {#if showSpeedRing}
      <CircleControl
        value={speed}
        {isOn}
        unit="%"
        min={1}
        max={100}
        label="Fan speed"
        onchange={(v) => entityId && fanService.setPercentage(entityId, v)}
      />
    {:else if oscillating}
      <span class="osc-chip">OSC</span>
    {/if}
  {/snippet}

  {#snippet below()}
    {#if showPresetChips}
      <div class="presets">
        {#each presets as p}
          <button class="preset" class:active={currentPreset === p}
            onclick={() => entityId && fanService.setPresetMode(entityId, p)}>{p}</button>
        {/each}
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Fan icon wrap (custom icons — mirrors hue-icon-wrap in LightTile) ── */
  .fan-icon-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Fan icon (visual only) ──────────────────────────────────────────── */
  .fan-icon {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .fan-icon.on {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .fan-icon.override {
    background: transparent;
    border-color: transparent;
  }
  .fan-icon.override.on {
    background: transparent;
    border-color: transparent;
  }

  .icon-span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
  .spinning { animation: spin 1.5s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fan-glyph {
    display: flex;
    width: 65%;
    height: 65%;
    align-items: center;
    justify-content: center;
  }

  .fan-glyph svg { width: 100%; height: 100%; display: block; }

  /* ── OSC chip (shown in circle area when no speed ring) ─────────────── */
  .osc-chip {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--color-info);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding-top: calc(var(--button-card-font-size) * 0.3);
  }

  /* ── Preset chips ───────────────────────────────────────────────────── */
  .presets {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.3);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .preset {
    all: unset;
    font-size: var(--secondary-label-size);
    font-weight: 500;
    padding: calc(var(--button-card-font-size) * 0.22) calc(var(--button-card-font-size) * 0.6);
    border-radius: 99px;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  .preset.active {
    background: transparent;
    color: var(--accent);
    border-color: transparent;
  }

  :global(.tile-wrapper.shape-wide) .presets {
    display: none;
  }
</style>
