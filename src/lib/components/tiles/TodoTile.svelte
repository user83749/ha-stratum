<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { todoService } from '$lib/ha/services';
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
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'To-do');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);

  interface TodoItem { uid: string; summary: string; status: 'needs_action' | 'completed'; }
  let items = $state<TodoItem[]>([]);
  let loading = $state(true);
  let newTask = $state('');

  $effect(() => {
    void entity;
    if (!entityId) { loading = false; return; }
    loading = true;
    const attrItems = entity?.attributes?.items as TodoItem[] | undefined;
    if (attrItems) { items = attrItems; loading = false; }
    else { loading = false; }
  });

  function toggleItem(item: TodoItem) {
    if (!entityId) return;
    const newStatus = item.status === 'completed' ? 'needs_action' : 'completed';
    items = items.map(i => i.uid === item.uid ? { ...i, status: newStatus } : i);
    todoService.updateItem(entityId, item.summary, newStatus);
  }

  function addItem() {
    if (!newTask.trim() || !entityId) return;
    const summary = newTask.trim();
    newTask = '';
    todoService.addItem(entityId, summary);
  }

  const pending = $derived(items.filter(i => i.status === 'needs_action'));
  const showDone = $derived(config.show_completed !== false);
  const displayItems = $derived(showDone ? items : pending);
  const visibleItems = $derived(
    sizePreset === 'sm' ? displayItems.slice(0, 2) :
    sizePreset === 'md' ? displayItems.slice(0, 4) :
    displayItems
  );
  const showCount = $derived(sizePreset !== 'sm');
  const showAddRow = $derived(sizePreset === 'lg' || sizePreset === 'xl');
</script>

<div class="todo-tile" data-size={sizePreset}>
  <div class="header">
    <div class="icon-bubble" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
      {#if iconOverride}
        {#if overrideIsCustom}
          <Icon name={iconOverride} entity={entity} />
        {:else}
          <Icon name={iconOverride} entity={entity} size={16} />
        {/if}
      {:else}
        <Icon name="check-square" size={16} />
      {/if}
    </div>
    <span class="title">{name}</span>
    {#if showCount}
      <span class="count">{pending.length} left</span>
    {/if}
  </div>

  {#if loading}
    <div class="empty">Loading…</div>
  {:else if visibleItems.length === 0}
    <div class="empty">Nothing to do!</div>
  {:else}
    <div class="items">
      {#each visibleItems as item (item.uid)}
        <button class="todo-item" class:done={item.status === 'completed'} onclick={() => toggleItem(item)} aria-label={item.summary}>
          <span class="checkbox" class:checked={item.status === 'completed'}>
            {#if item.status === 'completed'}<Icon name="check" size={10} />{/if}
          </span>
          <span class="summary">{item.summary}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if showAddRow}
    <div class="add-row">
      <input type="text" placeholder="Add task…" bind:value={newTask}
        onkeydown={e => { if (e.key === 'Enter') addItem(); }} class="add-input" />
      <button class="add-btn" onclick={addItem} disabled={!newTask.trim()} aria-label="Add">
        <Icon name="plus" size={16} />
      </button>
    </div>
  {/if}
</div>

<style>
  .todo-tile {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    gap: 8px;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .icon-bubble {
    width: var(--control-chip-size);
    height: var(--control-chip-size);
    border-radius: var(--control-chip-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }

  .icon-bubble.is-custom {
    display: block;
    line-height: 0;
    overflow: visible;
  }

  /* If the user explicitly overrides the icon, remove the badge/chip behind it. */
  .icon-bubble.override {
    background: transparent;
  }

  .title {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg);
    flex: 1;
  }

  .count {
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
    opacity: 0.8;
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--secondary-label-size);
    color: var(--fg-subtle);
  }

  .items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    overflow-y: auto;
  }

  .todo-item {
    all: unset;
    display: flex; align-items: center; gap: 8px; padding: 5px 4px; border-radius: var(--radius-sm);
    cursor: pointer; transition: background var(--transition); width: 100%; box-sizing: border-box;
  }
  .todo-item:hover { background: var(--hover); }
  .todo-item.done { opacity: 0.5; }

  .checkbox {
    flex-shrink: 0; width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid var(--border-strong);
    display: flex; align-items: center; justify-content: center; transition: all var(--transition); color: var(--accent-fg);
  }
  .checkbox.checked { background: var(--accent); border-color: var(--accent); }

  .summary { flex: 1; font-size: var(--secondary-label-size); color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .done .summary { text-decoration: line-through; color: var(--fg-muted); }

  .add-row { display: flex; gap: 6px; flex-shrink: 0; }
  .add-input {
    flex: 1; height: 32px; padding: 0 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
    background: var(--hover); color: var(--fg); font-size: var(--secondary-label-size); outline: none;
  }
  .add-btn {
    all: unset; width: 32px; height: 32px; border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--accent) 18%, var(--hover));
    color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
  }

</style>
