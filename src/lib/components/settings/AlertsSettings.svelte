<script lang="ts">
	// ── AlertsSettings ────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName } from '$lib/ha/entities';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { NotificationAlertDomain, NotificationConfig } from '$lib/types/dashboard';

	// ── Derived State ─────────────────────────────────────────────────────────
	const root = $derived($dashboardStore);
	const cfg = $derived(root.notifications);
	const allEntities = $derived(Object.values($entities));
	const SUPPORTED_ALERT_DOMAINS = new Set(['alert', 'update', 'binary_sensor', 'alarm_control_panel']);

	function isSupportedAlertEntityId(entityId: string): boolean {
		const domain = entityId.split('.')[0] ?? '';
		return SUPPORTED_ALERT_DOMAINS.has(domain);
	}

	function isUnsupportedTracked(entityId: string): boolean {
		return !isSupportedAlertEntityId(entityId);
	}

	let search = $state('');
	const hasQuery = $derived(search.trim().length > 0);
	const filtered = $derived.by(() => {
		if (!hasQuery) return [];
		const q = search.trim().toLowerCase();
		return allEntities
			.filter((e) => isSupportedAlertEntityId(e.entity_id))
			.filter((e) => e.entity_id.toLowerCase().includes(q) || getEntityName(e).toLowerCase().includes(q))
			.slice(0, 100);
	});

	// ── Actions ───────────────────────────────────────────────────────────────
	function setNotif(patch: Partial<NotificationConfig>) {
		dashboardStore.setNotifications(patch);
	}

	function formatStateMap(domain: NotificationAlertDomain): string {
		return (cfg.alertStateMap?.[domain] ?? [])
			.join(', ');
	}

	function setStateMap(domain: NotificationAlertDomain, raw: string) {
		const nextStates = raw
			.split(',')
			.map((s) => s.trim().toLowerCase())
			.filter((s, i, arr) => s.length > 0 && arr.indexOf(s) === i);
		setNotif({
			alertStateMap: {
				...cfg.alertStateMap,
				[domain]: nextStates
			}
		});
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
		if (!isSupportedAlertEntityId(entityId)) return;
		setNotif({ alertEntityIds: [...current, entityId] });
	}
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
				<span class="as__toggle-desc">Show alerts from enabled domains and your tracked alert entities</span>
			</div>
			<Toggle checked={cfg.showAlerts} onchange={(v) => setNotif({ showAlerts: v })} label="Real alerts feed" />
		</div>
	</div>

	{#if cfg.showAlerts}
		<div class="as__group">
			<span class="s-label">Alert sources</span>
			<p class="as__section-note">
				Select which domains should auto-populate alerts. Active states for each domain are configured below.
			</p>

			<div class="as__source-grid">
				<div class="as__source-tile">
					<span class="as__source-title">`alert.*`</span>
					<Toggle
						checked={cfg.includeAlertDomainEntities}
						onchange={(v) => setNotif({ includeAlertDomainEntities: v })}
						label="Include alert entities"
					/>
				</div>
				<div class="as__source-tile">
					<span class="as__source-title">`update.*`</span>
					<Toggle
						checked={cfg.includeUpdateDomainEntities}
						onchange={(v) => setNotif({ includeUpdateDomainEntities: v })}
						label="Include update entities"
					/>
				</div>
				<div class="as__source-tile">
					<span class="as__source-title">`binary_sensor.*`</span>
					<Toggle
						checked={cfg.includeBinarySensorDomainEntities}
						onchange={(v) => setNotif({ includeBinarySensorDomainEntities: v })}
						label="Include binary_sensor entities"
					/>
				</div>
				<div class="as__source-tile">
					<span class="as__source-title">`alarm_control_panel.*`</span>
					<Toggle
						checked={cfg.includeAlarmControlPanelDomainEntities}
						onchange={(v) => setNotif({ includeAlarmControlPanelDomainEntities: v })}
						label="Include alarm_control_panel entities"
					/>
				</div>
			</div>

			<div class="as__map-grid">
				<div class="as__map-item">
					<span class="as__map-label">`alert.*` active states</span>
					<input
						class="as__map-input"
						type="text"
						value={formatStateMap('alert')}
						onchange={(e) => setStateMap('alert', (e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="as__map-item">
					<span class="as__map-label">`update.*` active states</span>
					<input
						class="as__map-input"
						type="text"
						value={formatStateMap('update')}
						onchange={(e) => setStateMap('update', (e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="as__map-item">
					<span class="as__map-label">`binary_sensor.*` active states</span>
					<input
						class="as__map-input"
						type="text"
						value={formatStateMap('binary_sensor')}
						onchange={(e) => setStateMap('binary_sensor', (e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="as__map-item">
					<span class="as__map-label">`alarm_control_panel.*` active states</span>
					<input
						class="as__map-input"
						type="text"
						value={formatStateMap('alarm_control_panel')}
						onchange={(e) => setStateMap('alarm_control_panel', (e.target as HTMLInputElement).value)}
					/>
				</div>
				<p class="as__map-help">Comma-separated states. Example: <code>on, pending</code></p>
			</div>

			{#if cfg.alertEntityIds.length > 0}
				<div class="as__chips">
					{#each cfg.alertEntityIds as id}
						<span class="as__chip" class:as__chip--warn={isUnsupportedTracked(id)}>
							{id}
							<button class="as__chip-remove" onclick={() => toggleTracked(id)} aria-label={`Remove ${id}`}>
								<Icon name="x" size={11} />
							</button>
						</span>
					{/each}
				</div>
				{#if cfg.alertEntityIds.some((id) => isUnsupportedTracked(id))}
					<p class="as__warn">
						Unsupported tracked domains are ignored. Supported: <code>alert.*</code>, <code>update.*</code>, <code>binary_sensor.*</code>, <code>alarm_control_panel.*</code>.
					</p>
				{/if}
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
						<span>Type to search supported alert entities.</span>
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

	.as__section-note {
		margin: 0;
		font-size: 0.72rem;
		color: var(--fg-subtle);
		line-height: 1.45;
	}

	.as__source-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 8px;
	}

	.as__source-tile {
		display: flex;
		align-items: center;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		padding: 9px 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.as__source-title {
		font-size: 0.74rem;
		font-weight: 600;
		color: var(--fg);
		min-width: 0;
		white-space: normal;
		overflow-wrap: anywhere;
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
	.as__chip--warn {
		border-color: color-mix(in srgb, #d4a04a 60%, var(--border));
		background: color-mix(in srgb, #d4a04a 14%, var(--hover));
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

	.as__map-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 6px 0 2px;
	}

	.as__map-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.as__map-label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--fg-subtle);
	}

	.as__map-input {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--fg);
		font: inherit;
		font-size: 0.75rem;
		padding: 7px 9px;
	}

	.as__map-help {
		margin: 0;
		font-size: 0.7rem;
		color: var(--fg-subtle);
	}

	.as__map-help code {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	}

	.as__warn {
		margin: 0;
		font-size: 0.72rem;
		color: #d4a04a;
		line-height: 1.4;
	}
</style>
