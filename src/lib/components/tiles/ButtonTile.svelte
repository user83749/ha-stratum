<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { haService, sceneService, scriptService, automationService, inputButtonService, buttonService } from '$lib/ha/services';

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
  const entityId = $derived(entity?.entity_id ?? tile.entity_id ?? '');
  const domain = $derived(entityId.split('.')[0] ?? 'script');
  const name = $derived(config.name ?? entity?.attributes?.friendly_name ?? 'Button');
  const icon = $derived(config.icon ?? (domain === 'scene' ? 'star' : domain === 'automation' ? 'zap' : domain === 'input_button' ? 'circle-dot' : 'play'));
  const isOn = $derived(
    entity?.state === 'on' || 
    entity?.state === 'active' || 
    (domain === 'scene' && entity?.state !== 'scenery_not_ready')
  );
  const showLabels = $derived(sizePreset !== 'sm');
  const showActionHint = $derived(sizePreset === 'lg' || sizePreset === 'xl');

  function domainLabel() {
    if (domain === 'scene') return 'Scene';
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

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="btn-tile" class:on={isOn} data-size={sizePreset} aria-label={name}>

  <div class="tile-content">
    <div class="icon-circle">
      <Icon name={icon} size={22} />
    </div>
    {#if showLabels}
      <div class="label-group">
        <span class="btn-name">{name}</span>
        <span class="btn-sub">{domainLabel()}</span>
        {#if showActionHint}
          <span class="btn-hint">Tap to run</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .btn-tile {
    display: flex;
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: inherit;
  }

  /* ── Content ─────────────────────────────────────────────────────────── */
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

  .icon-circle {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--accent) 22%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
    transition: background var(--transition);
  }

  .label-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .btn-name {
    font-size: 0.82rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
  }

  .btn-tile.on .btn-name {
    color: var(--control-active-name);
  }

  .btn-sub {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.8;
  }

  .btn-tile.on .btn-sub {
    color: var(--control-active-name);
    opacity: 0.6;
  }

  .btn-hint {
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--fg-subtle);
  }

  .btn-tile[data-size='sm'] .tile-content {
    align-items: center;
    justify-content: center;
  }

  /* ── Small: just icon centered ──────────────────────────────────────── */
  @container tile (max-width: 100px) {
    .tile-content { align-items: center; justify-content: center; gap: 8px; }
    .label-group { align-items: center; text-align: center; }
    .btn-sub { display: none; }
  }

  @container tile (max-height: 80px) {
    .tile-content { flex-direction: row; align-items: center; gap: 12px; }
    .btn-sub { display: none; }
  }

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
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
