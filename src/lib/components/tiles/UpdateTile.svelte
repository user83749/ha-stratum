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
    width: var(--control-chip-size); height: var(--control-chip-size); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: color-mix(in srgb, var(--uc) 14%, transparent);
    color: var(--uc); transition: background var(--transition), color var(--transition);
  }

  .info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; margin-top: auto; }
  .name { font-size: var(--control-label-size); font-weight: 500; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.15; }

  .version-line { display: flex; align-items: center; gap: 4px; font-size: var(--secondary-label-size); }
  .old-ver { color: var(--fg-subtle); }
  .new-ver { font-weight: 500; color: var(--uc); }
  .up-to-date { font-size: var(--secondary-label-size); font-weight: 500; color: var(--uc); }
  .version-label { font-size: var(--secondary-label-size); color: var(--fg-subtle); }

  .auto-badge {
    display: inline-block; font-size: var(--secondary-label-size); font-weight: 500;
    background: var(--hover); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px; color: var(--fg-muted);
    align-self: flex-start; letter-spacing: 0.04em;
  }

  .actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }

  .install-btn {
    all: unset; display: flex; align-items: center; gap: 5px;
    height: var(--action-icon-size); padding: 0 12px; border-radius: 20px;
    background: color-mix(in srgb, var(--color-info) 18%, var(--hover));
    color: var(--color-info); border: 1px solid color-mix(in srgb, var(--color-info) 30%, var(--border));
    font-size: var(--secondary-label-size); font-weight: 500; cursor: pointer; transition: background var(--transition);
  }

  .skip-btn {
    all: unset; width: var(--action-icon-size); height: var(--action-icon-size); border-radius: 50%;
    border: 1px solid var(--border); background: var(--hover);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--fg-muted); transition: background var(--transition), color var(--transition);
  }
  .skip-btn:hover { background: var(--active); color: var(--fg); }

  /* Compact: just icon + name, no version/actions */
    .actions { display: none; }

  .update-tile[data-size='sm'] .version-line,
  .update-tile[data-size='sm'] .version-label,
  .update-tile[data-size='sm'] .auto-badge,
  .update-tile[data-size='sm'] .actions { display: none; }
</style>
