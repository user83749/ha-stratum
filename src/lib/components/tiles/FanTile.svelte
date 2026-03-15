<script lang="ts">
  // ── FanTile ───────────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
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
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW === 2 && layoutH === 1);
  const iconOverride = $derived((config.icon as string | undefined) ?? undefined);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Fan');
  const isOn = $derived(entity?.state === 'on');
  const speed = $derived(attrs.percentage as number | null ?? null);
  const oscillating = $derived(attrs.oscillating as boolean ?? false);
  const presets = $derived((attrs.preset_modes as string[]) ?? []);
  const currentPreset = $derived(attrs.preset_mode as string ?? '');
  const showSpeedRing = $derived(isOn && speed !== null);
  const showPresetChips = $derived((layoutW >= 2 || layoutH >= 2) && presets.length > 0 && isOn);
  const isCustom      = $derived(iconOverride ? isCustomIcon(iconOverride) : false);

  let wideDraftSpeed = $state<number | null>(null);
  let wideDragging = $state(false);
  const wideDisplaySpeed = $derived(wideDragging ? wideDraftSpeed : speed);
  const wideStateLabel = $derived(isOn ? 'On' : 'Off');

  // ── Actions ───────────────────────────────────────────────────────────────
  function handleWideSpeedInput(ev: Event) {
    wideDragging = true;
    wideDraftSpeed = Number((ev.target as HTMLInputElement).value);
  }

  function handleWideSpeedChange(ev: Event) {
    wideDragging = false;
    const next = Math.max(1, Math.min(100, Number((ev.target as HTMLInputElement).value)));
    wideDraftSpeed = next;
    if (entityId) fanService.setPercentage(entityId, next).catch(() => {});
  }
</script>

{#if isWideMd}
  <div class="fan-wide" class:on={isOn}>
    <div class="fan-wide__layout">
      <div class="fan-wide__icon-wrap">
        {#if iconOverride && isCustom}
          <div class="fan-wide__custom-icon">
            <Icon name={iconOverride} entity={entity} />
          </div>
        {:else}
          <div class="fan-icon fan-wide__icon-shell" class:on={isOn} class:override={!!iconOverride}>
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
      </div>

      <div class="fan-wide__content">
        <div class="fan-wide__copy">
          <span class="fan-wide__name">{name}</span>
          <span class="fan-wide__state">{wideStateLabel}</span>
        </div>

        <div class="fan-wide__control-row" class:on={isOn}>
          <div class="fan-wide__track-wrap" class:disabled={!isOn}>
            <div class="fan-wide__track">
              <div class="fan-wide__fill" style="width: {isOn ? Math.max(0, Math.min(100, wideDisplaySpeed ?? 0)) : 0}%"></div>
            </div>
            
            <div class="fan-wide__track-info">
              {#if speed !== null && isOn}
                <span class="fan-wide__value">{Math.round(wideDisplaySpeed ?? 0)}%</span>
              {:else}
                <span class="fan-wide__value">--%</span>
              {/if}
            </div>

            {#if speed !== null}
              <input
                class="fan-wide__slider"
                type="range"
                min="1"
                max="100"
                step="1"
                disabled={!isOn}
                value={wideDisplaySpeed ?? speed}
                aria-label="Fan speed"
                oninput={handleWideSpeedInput}
                onchange={handleWideSpeedChange}
              />
            {/if}
          </div>

          {#if entityId && (attrs.oscillating !== undefined)}
            <button
              class="fan-wide__osc"
              class:active={oscillating}
              type="button"
              aria-label="Toggle oscillation"
              onclick={(e) => { e.stopPropagation(); fanService.oscillate(entityId, !oscillating).catch(() => {}); }}
            >
              <Icon name="refresh" size={16} />
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else}
  <BaseTile {name} state={isOn ? 'On' : 'Off'} {isOn}>

    {#snippet icon()}
      {#if iconOverride && isCustom}
        <Icon name={iconOverride} entity={entity} />
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
{/if}

<style>
  /* ── Wide MD Fan Tile ───────────────────────────────────────────────── */
  .fan-wide {
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding:
      calc(10.9% * var(--tile-padding-scale, 1))
      calc(10.9% * var(--tile-padding-scale, 1))
      calc(8.9% * var(--tile-padding-scale, 1))
      calc(10.9% * var(--tile-padding-scale, 1));
    display: flex;
    align-items: center;
    height: 100%;
    color: var(--tile-label-off, #97989c);
  }

  .fan-wide.on {
    color: var(--tile-label-on, var(--control-active-name));
  }

  .fan-wide__layout {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: calc(var(--button-card-font-size) * 0.48);
  }

  .fan-wide__icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--control-chip-size) * 1.08); /* Matches LightTile ratio perfectly */
  }

  .fan-wide__custom-icon,
  .fan-wide__icon-shell {
    width: 100%;
    margin: 0;
  }

  /* Ensures native fan-icon scales within the space */
  .fan-wide__icon-shell {
    border-radius: 50%;
  }

  .fan-wide__content {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: calc(var(--button-card-font-size) * 0.18);
  }

  .fan-wide__copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: calc(var(--button-card-font-size) * 0.08);
  }

  .fan-wide__name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    line-height: 1.21;
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fan-wide__state {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    line-height: 1.15;
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fan-wide.on .fan-wide__name,
  .fan-wide.on .fan-wide__state,
  .fan-wide__control-row.on .fan-wide__value,
  .fan-wide.on .fan-wide__osc:not(.active) {
    color: var(--tile-label-on, var(--control-active-name));
  }

  .fan-wide__control-row {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: calc(var(--button-card-font-size) * 0.4);
  }

  .fan-wide__value {
    font-size: calc(var(--button-card-font-size) * 0.88);
    line-height: 1;
    font-weight: 600;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Thick inner slider track implementation natively supported within bounding box */
  .fan-wide__track-wrap {
    flex: 1;
    position: relative;
    /* Chunky iOS slider height matching the action icon size natively */
    height: calc(var(--button-card-font-size) * 1.8);
    border-radius: 99px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .fan-wide__track-wrap.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .fan-wide__track {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .fan-wide__fill {
    height: 100%;
    border-radius: inherit;
    /* Lighter saturated accent for the fill inside the track */
    background: color-mix(in srgb, var(--accent) 80%, #fff);
    transition: width 140ms ease;
  }

  .fan-wide__track-info {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: flex-end;
    padding: 0 calc(var(--button-card-font-size) * 0.6);
    pointer-events: none;
    z-index: 1;
  }

  .fan-wide__slider {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    z-index: 2;
  }

  /* Circular minimalist OSC button alongside thick slider */
  .fan-wide__osc {
    all: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    width: calc(var(--button-card-font-size) * 1.8);
    height: calc(var(--button-card-font-size) * 1.8);
    border-radius: 50%;
    color: var(--tile-label-off, #97989c);
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
    transition: color var(--transition), background var(--transition), transform var(--transition);
    flex-shrink: 0;
  }

  .fan-wide__osc:active {
    transform: scale(0.92);
  }

  .fan-wide__osc.active {
    color: #fff;
    background: var(--color-info);
  }

  .fan-wide__osc.active :global(svg) {
    animation: spin 3s linear infinite;
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
