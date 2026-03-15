<script lang="ts">
	// ── AlertsSettings ────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName } from '$lib/ha/entities';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { NotificationConfig } from '$lib/types/dashboard';

	// ── Derived State ─────────────────────────────────────────────────────────
	const root = $derived($dashboardStore);
	const cfg = $derived(root.notifications);
	const allEntities = $derived(Object.values($entities));
	const knownEntityIds = $derived(new Set(Object.keys($entities)));

	let search = $state('');
	const hasQuery = $derived(search.trim().length > 0);
	const filtered = $derived.by(() => {
		if (!hasQuery) return [];
		const q = search.trim().toLowerCase();
		return allEntities
			.filter((e) => e.entity_id.toLowerCase().includes(q) || getEntityName(e).toLowerCase().includes(q))
			.slice(0, 100);
	});

	// ── Actions ───────────────────────────────────────────────────────────────
	function setNotif(patch: Partial<NotificationConfig>) {
		dashboardStore.setNotifications(patch);
	}

	function isTracked(entityId: string): boolean {
		return cfg.alertEntityIds.includes(entityId);
	}

	function toggleTracked(entityId: string) {
		const current = cfg.alertEntityIds ?? [];
		if (current.includes(entityId)) {
			setNotif({ alertEntityIds: current.filter((id) => id !== entityId) });
			return;
		}
		setNotif({ alertEntityIds: [...current, entityId] });
	}

	// ── Cleanup ───────────────────────────────────────────────────────────────
	$effect(() => {
		const tracked = cfg.alertEntityIds ?? [];
		if (tracked.length === 0) return;
		if (knownEntityIds.size === 0) return;
		const filtered = tracked.filter((id) => knownEntityIds.has(id));
		if (filtered.length !== tracked.length) {
			setNotif({ alertEntityIds: filtered });
		}
	});
</script>

<div class="as">
	<div class="as__group">
		<span class="s-label">Notifications</span>

		<div class="as__toggle-row">
			<div class="as__toggle-info">
				<span class="as__toggle-label">Enable notifications panel</span>
				<span class="as__toggle-desc">Master switch for notifications drawer content</span>
			</div>
			<Toggle checked={cfg.enabled} onchange={(v) => setNotif({ enabled: v })} label="Enable notifications panel" />
		</div>

		<div class="as__toggle-row">
			<div class="as__toggle-info">
				<span class="as__toggle-label">Home Assistant notifications</span>
				<span class="as__toggle-desc">Show real `persistent_notification.*` items from Home Assistant</span>
			</div>
			<Toggle checked={cfg.showPersistent} onchange={(v) => setNotif({ showPersistent: v })} label="Home Assistant notifications" />
		</div>

		<div class="as__toggle-row">
			<div class="as__toggle-info">
				<span class="as__toggle-label">Real alerts feed</span>
				<span class="as__toggle-desc">Show alerts from `alert.*` entities and your tracked alert entities</span>
			</div>
			<Toggle checked={cfg.showAlerts} onchange={(v) => setNotif({ showAlerts: v })} label="Real alerts feed" />
		</div>
	</div>

	{#if cfg.showAlerts}
		<div class="as__group">
			<span class="s-label">Alert sources</span>

			<div class="as__toggle-row">
				<div class="as__toggle-info">
					<span class="as__toggle-label">Include `alert.*` entities</span>
					<span class="as__toggle-desc">Automatically include active entities from the Home Assistant Alert integration</span>
				</div>
				<Toggle
					checked={cfg.includeAlertDomainEntities}
					onchange={(v) => setNotif({ includeAlertDomainEntities: v })}
					label="Include alert entities"
				/>
			</div>

			{#if cfg.alertEntityIds.length > 0}
				<div class="as__chips">
					{#each cfg.alertEntityIds as id}
						<span class="as__chip">
							{id}
							<button class="as__chip-remove" onclick={() => toggleTracked(id)} aria-label={`Remove ${id}`}>
								<Icon name="x" size={11} />
							</button>
						</span>
					{/each}
				</div>
			{/if}

			<div class="as__search-wrap">
				<Icon name="search" size={14} />
				<input
					class="as__search"
					type="text"
					placeholder="Add tracked alert entities…"
					bind:value={search}
				/>
				{#if search}
					<button class="as__search-clear" onclick={() => (search = '')} aria-label="Clear search">
						<Icon name="x" size={13} />
					</button>
				{/if}
			</div>

			<div class="as__list">
				{#if !hasQuery}
					<div class="as__empty">
						<Icon name="search" size={18} />
						<span>Type to search entities.</span>
					</div>
				{:else if allEntities.length === 0}
					<div class="as__empty">
						<Icon name="wifi-off" size={18} />
						<span>No entities available. Connect to Home Assistant first.</span>
					</div>
				{:else if filtered.length === 0}
					<div class="as__empty">
						<Icon name="search" size={18} />
						<span>No entities match your search.</span>
					</div>
				{:else}
					{#each filtered as entity (entity.entity_id)}
						{@const tracked = isTracked(entity.entity_id)}
						<div class="as__item" class:as__item--active={tracked}>
							<div class="as__item-info">
								<span class="as__item-name">{getEntityName(entity)}</span>
								<span class="as__item-id">{entity.entity_id}</span>
							</div>
							<button
								class="as__item-toggle"
								class:as__item-toggle--active={tracked}
								onclick={() => toggleTracked(entity.entity_id)}
								aria-label={tracked ? 'Remove tracked alert entity' : 'Add tracked alert entity'}
							>
								<Icon name={tracked ? 'check' : 'plus'} size={14} />
							</button>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.as {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.as__group {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.as__toggle-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
	}

	.as__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.as__toggle-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--fg);
	}

	.as__toggle-desc {
		font-size: 0.72rem;
		color: var(--fg-subtle);
		line-height: 1.4;
	}

	.as__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.as__chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 7px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--hover);
		font-size: 0.7rem;
		color: var(--fg-muted);
		max-width: 100%;
	}

	.as__chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
	}

	.as__chip-remove:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
	}

	.as__search-wrap {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--fg-subtle);
	}

	.as__search {
		border: none;
		background: transparent;
		color: var(--fg);
		font: inherit;
		outline: none;
		min-width: 0;
	}

	.as__search-clear {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
	}

	.as__search-clear:hover {
		background: var(--hover);
		color: var(--fg);
	}

	.as__list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 320px;
		overflow-y: auto;
		padding-right: 2px;
	}

	.as__empty {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 10px;
		border-radius: var(--radius-sm);
		border: 1px dashed var(--border);
		color: var(--fg-subtle);
		font-size: 0.75rem;
	}

	.as__item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.as__item--active {
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.as__item-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.as__item-name {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--fg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.as__item-id {
		font-size: 0.68rem;
		color: var(--fg-subtle);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.as__item-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
	}

	.as__item-toggle--active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}
</style>
