<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import BaseTile from '$lib/components/tiles/BaseTile.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { callService } from '$lib/ha/services';
  import { isCustomIcon } from '$lib/icons/customIcons';

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
  const entityDomain = $derived(entityId ? entityId.split('.')[0] : '');
  const isUnavail = $derived(!entity || entityState === 'unavailable' || entityState === 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Update');
  const showName = $derived(config.show_name !== false);
  const showState = $derived(config.show_state !== false);
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const updateCount = $derived.by(() => {
    if (isUnavail) return 0;

    // HA update entities: state === 'on' means update available (single item)
    if (entityDomain === 'update') return entityState === 'on' ? 1 : 0;

    // Some dashboards use a summary sensor (e.g. sensor.hassio_updates_available)
    const n = Number(entityState);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);

    const candidates = [
      attrs.update_entities,
      attrs.total,
      attrs.home_assistant
    ];
    const nums = candidates
      .map((v) => (typeof v === 'number' ? v : Number(v)))
      .filter((v) => Number.isFinite(v) && v > 0) as number[];
    return nums.length ? Math.floor(Math.max(...nums)) : 0;
  });
  const hasUpdate = $derived(updateCount > 0);
  const installedVersion = $derived(attrs.installed_version as string ?? '');
  const latestVersion = $derived(attrs.latest_version as string ?? '');
  const inProgress = $derived(attrs.in_progress as boolean ?? false);
  const autoUpdate = $derived(attrs.auto_update as boolean ?? false);
  const skippedVersion = $derived(attrs.skipped_version as string ?? '');
  const updateColor = $derived(
    isUnavail ? 'var(--fg-subtle)' :
    hasUpdate ? 'var(--color-info)' :
    'var(--fg-subtle)'
  );

  let installing = $state(false);
  const showVersionInfo = $derived(sizePreset !== 'sm');
  const showActions = $derived((sizePreset === 'lg' || sizePreset === 'xl') && hasUpdate && !inProgress && !installing);
  const stateText = $derived(
    isUnavail ? 'Unavailable' :
    hasUpdate ? (updateCount > 1 ? `${updateCount} updates available` : 'Update available') :
    'Up to date'
  );

  async function install() {
    if (!entityId || !hasUpdate) return;
    installing = true;
    try { await callService('update', 'install', {}, { entity_id: entityId }); } catch { /* ignore */ }
    finally { installing = false; }
  }
  function skip() { if (entityId) callService('update', 'skip', {}, { entity_id: entityId }); }
</script>

<BaseTile name={name} state={stateText} isOn={hasUpdate} {showName} {showState} style={`--uc:${updateColor};`}>
  {#snippet icon()}
    <div class="icon-wrap" class:is-custom={overrideIsCustom}>
      {#if inProgress || installing}
        <span class="spinner"><Icon name="loader" size="100%" /></span>
      {:else if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <Icon name={iconOverride} entity={entity} size="100%" />
        {/if}
      {:else}
        <Icon name={hasUpdate ? 'circle-arrow-up' : 'circle-check'} size="100%" />
      {/if}
    </div>
  {/snippet}

  {#snippet circle()}{/snippet}

  {#snippet below()}
    {#if showVersionInfo}
      <div class="meta">
        {#if hasUpdate}
          <div class="version-line">
            <span class="old-ver">{installedVersion}</span>
            <Icon name="arrow-right" size={10} />
            <span class="new-ver">{latestVersion}</span>
          </div>
        {:else if installedVersion}
          <div class="version-label">{installedVersion}</div>
        {/if}
        {#if autoUpdate}<span class="auto-badge">Auto</span>{/if}
      </div>
    {/if}

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
  {/snippet}
</BaseTile>

<style>
  .icon-wrap {
    width: 100%;
    height: 100%;
    display: block;
    line-height: 0;
    color: var(--uc);
  }
  .icon-wrap.is-custom {
    overflow: visible;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .version-line { display: flex; align-items: center; gap: 4px; font-size: var(--secondary-label-size); }
  .old-ver { color: var(--fg-subtle); }
  .new-ver { font-weight: 500; color: var(--uc); }
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
</style>
