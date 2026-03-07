<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import { haService, sceneService, scriptService, automationService, inputButtonService, buttonService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const domain = $derived(entityId.split('.')[0] ?? 'script');
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Button');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const iconName = $derived(config.icon ?? (domain === 'scene' ? 'star' : domain === 'automation' ? 'zap' : domain === 'input_button' ? 'circle-dot' : 'play'));
  const iconIsCustom = $derived(typeof iconName === 'string' && isCustomIcon(iconName));
  const isOn = $derived(
    entity?.state === 'on' ||
    entity?.state === 'active' ||
    (domain === 'scene' && entity?.state !== 'scenery_not_ready')
  );

  function domainLabel() {
    if (domain === 'scene') return '';
    if (domain === 'automation') return 'Automation';
    if (domain === 'script') return 'Script';
    if (domain === 'input_button') return 'Button';
    return 'Activate';
  }

  async function activate() {
    if (!entityId) return;
    if (domain === 'scene') { sceneService.turnOn(entityId); }
    else if (domain === 'automation') { automationService.trigger(entityId); }
    else if (domain === 'script') { scriptService.turnOn(entityId); }
    else if (domain === 'input_button') { inputButtonService.press(entityId); }
    else if (domain === 'button') { buttonService.press(entityId); }
    else { haService.turnOn(entityId); }
  }
</script>

<!-- Button tiles are activated by TileWrapper tap_action; activate() is available for tap_action override -->
<BaseTile {name} state={domainLabel()} {isOn}>

  {#snippet icon()}
    <!-- Visual-only icon circle — tile tap handled by TileWrapper -->
    {#if iconIsCustom}
      <Icon name={iconName} entity={entity} />
    {:else}
      <div class="icon-circle" class:on={isOn} class:override={!!iconOverride}>
        <Icon name={iconName} size="100%" />
      </div>
    {/if}
  {/snippet}

</BaseTile>

<style>
  /* ── Icon circle (visual only) ───────────────────────────────────────── */
  .icon-circle {
    width: 100%;
    aspect-ratio: 1;
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
    transition: background var(--transition);
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .icon-circle.override {
    background: transparent;
    border-color: transparent;
  }
  </style>
