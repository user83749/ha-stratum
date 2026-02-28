<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { callService } from '$lib/ha/services';

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
  const entityState = $derived(entity?.state ?? 'off');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Update');
  const hasUpdate = $derived(entityState === 'on');
  const installedVersion = $derived(attrs.installed_version as string ?? '');
  const latestVersion = $derived(attrs.latest_version as string ?? '');
  const inProgress = $derived(attrs.in_progress as boolean ?? false);
  const autoUpdate = $derived(attrs.auto_update as boolean ?? false);
  const skippedVersion = $derived(attrs.skipped_version as string ?? '');
  const updateColor = $derived(hasUpdate ? 'var(--color-info)' : 'var(--color-on)');

  let installing = $state(false);
  const showVersionInfo = $derived(sizePreset !== 'sm');
  const showActions = $derived((sizePreset === 'lg' || sizePreset === 'xl') && hasUpdate && !inProgress && !installing);

  async function install() {
    if (!entityId || !hasUpdate) return;
    installing = true;
    try { await callService('update', 'install', {}, { entity_id: entityId }); } catch { /* ignore */ }
    finally { installing = false; }
  }
  function skip() { if (entityId) callService('update', 'skip', {}, { entity_id: entityId }); }
</script>

<div class="update-tile" data-size={sizePreset} style="--uc: {updateColor};">
  <div class="icon-wrap">
    {#if inProgress || installing}
      <span class="spinner"><Icon name="loader" /></span>
    {:else}
      <Icon name={hasUpdate ? 'arrow-up-circle' : 'check-circle'} />
    {/if}
  </div>
  <div class="info">
    <span class="name">{name}</span>
    {#if hasUpdate && showVersionInfo}
      <span class="version-line">
        <span class="old-ver">{installedVersion}</span>
        <Icon name="arrow-right" size={10} />
        <span class="new-ver">{latestVersion}</span>
      </span>
    {:else}
      <span class="up-to-date">Up to date</span>
      {#if showVersionInfo && installedVersion}<span class="version-label">{installedVersion}</span>{/if}
    {/if}
    {#if autoUpdate}<span class="auto-badge">Auto</span>{/if}
  </div>
  {#if showActions}
    <div class="actions">
      <button class="install-btn" onclick={install} aria-label="Install update">
        <Icon name="download" /><span>Install</span>
      </button>
      {#if skippedVersion !== latestVersion}
        <button class="skip-btn" onclick={skip} aria-label="Skip version"><Icon name="skip-forward" /></button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .update-tile {
    display: flex; align-items: center; gap: 12px;
    width: 100%; height: 100%; overflow: hidden;
  }

  .icon-wrap {
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: color-mix(in srgb, var(--uc) 14%, transparent);
    color: var(--uc); transition: background var(--transition), color var(--transition);
  }

  .spinner { animation: spin 1s linear infinite; display: flex; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .name { font-size: 0.82rem; font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .version-line { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; }
  .old-ver { color: var(--fg-subtle); }
  .new-ver { font-weight: 700; color: var(--uc); }
  .up-to-date { font-size: 0.75rem; font-weight: 600; color: var(--uc); }
  .version-label { font-size: 0.68rem; color: var(--fg-subtle); }

  .auto-badge {
    display: inline-block; font-size: 0.6rem; font-weight: 700;
    background: var(--hover); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px; color: var(--fg-muted);
    align-self: flex-start; letter-spacing: 0.04em;
  }

  .actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }

  .install-btn {
    all: unset; display: flex; align-items: center; gap: 5px;
    padding: 6px 12px; border-radius: 20px;
    background: color-mix(in srgb, var(--color-info) 18%, var(--hover));
    color: var(--color-info); border: 1px solid color-mix(in srgb, var(--color-info) 30%, var(--border));
    font-size: 0.75rem; font-weight: 700; cursor: pointer; transition: background var(--transition);
  }
  

  .skip-btn {
    all: unset; width: 30px; height: 30px; border-radius: 50%;
    border: 1px solid var(--border); background: var(--hover);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--fg-muted); transition: background var(--transition), color var(--transition);
  }
  .skip-btn:hover { background: var(--active); color: var(--fg); }

  /* Compact: just icon + name, no version/actions */
  @container tile (max-width: 160px) {
    .actions { display: none; }
    .update-tile { flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
    .info { align-items: center; text-align: center; }
  }
  @container tile (max-height: 80px) { .auto-badge { display: none; } }
  @container tile (max-height: 60px) { .version-line, .version-label, .up-to-date { display: none; } }

  .update-tile[data-size='sm'] .version-line,
  .update-tile[data-size='sm'] .version-label,
  .update-tile[data-size='sm'] .auto-badge,
  .update-tile[data-size='sm'] .actions { display: none; }

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
