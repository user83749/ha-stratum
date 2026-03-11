<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { sirenService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const sizePreset = $derived(getTileSizePreset(tile));
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const isOn = $derived(entity?.state === 'on');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Siren');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const tones = $derived((attrs.available_tones as string[]) ?? []);
  const currentTone = $derived(attrs.tone as string ?? '');
  const showToneChips = $derived((sizePreset === 'lg' || sizePreset === 'xl') && tones.length > 0 && isOn);
</script>

<BaseTile {name} state={isOn ? 'Sounding' : 'Silent'} {isOn}>

  {#snippet icon()}
    <!-- Visual-only siren icon — tile tap handled by TileWrapper -->
    <div
      class="siren-icon"
      class:on={isOn}
      class:override={!!iconOverride}
      class:is-custom={overrideIsCustom}
      style={iconOverride ? `color:${isOn ? 'var(--color-danger)' : 'var(--fg-muted)'};` : ''}
    >
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <span class="icon-span" class:pulse={isOn}><Icon name={iconOverride} entity={entity} size="100%" /></span>
        {/if}
      {:else}
        <span class="icon-span" class:pulse={isOn}><Icon name="siren" size="100%" /></span>
      {/if}
    </div>
  {/snippet}

  {#snippet below()}
    {#if showToneChips}
      <div class="tones">
        {#each tones.slice(0, 4) as t}
          <button class="tone-chip" class:active={currentTone === t}
            onclick={() => entityId && sirenService.turnOn(entityId, t)}>{t}</button>
        {/each}
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Siren icon (visual only) ────────────────────────────────────────── */
  .siren-icon {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    border: 1.5px solid var(--border);
    transition: all var(--transition);
  }

  .siren-icon.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  /* Inner chip only: danger color when sounding. */
  .siren-icon.on {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 20%, transparent);
    border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .siren-icon.override {
    background: transparent;
    border-color: transparent;
  }
  .siren-icon.override.on {
    background: transparent;
    border-color: transparent;
  }

  .icon-span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; }
  .pulse { animation: siren-pulse 0.5s ease-in-out infinite alternate; }
  @keyframes siren-pulse { from { transform: scale(0.85); } to { transform: scale(1.15); } }

  /* ── Tone chips ──────────────────────────────────────────────────────── */
  .tones {
    position: relative;
    z-index: 1;
    display: flex;
    gap: calc(var(--button-card-font-size) * 0.3);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .tone-chip {
    all: unset;
    font-size: var(--secondary-label-size);
    font-weight: 500;
    padding: calc(var(--button-card-font-size) * 0.22) calc(var(--button-card-font-size) * 0.6);
    border-radius: 99px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    cursor: pointer;
    transition: all var(--transition);
    text-transform: capitalize;
  }

  /* Inner tone chip only: active text state, not tile background. */
  .tone-chip.active {
    background: transparent;
    color: var(--color-danger);
    border-color: transparent;
  }
</style>
