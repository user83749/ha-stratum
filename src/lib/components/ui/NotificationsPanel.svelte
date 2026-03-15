<script lang="ts">
	// ── NotificationsPanel ────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import { callService, persistentNotificationService } from '$lib/ha/services';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName, getDomain } from '$lib/ha/entities';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	// ── Props / Local State ───────────────────────────────────────────────────
	let { open, onclose }: Props = $props();

	const cfg           = $derived($dashboardStore);
	const notifCfg      = $derived(cfg.notifications);
	let clearingAll = $state(false);
	let dismissedAlertEntityIds = $state<string[]>([]);

	// ── Derived State ─────────────────────────────────────────────────────────
	// Gather persistent_notification entities.
	const persistentNotifs = $derived(
		open && notifCfg.showPersistent
			? Object.values($entities).filter((e) => e.entity_id.startsWith('persistent_notification.'))
			: []
	);

	function isAlertEntityActive(entity: { entity_id: string; state: string; attributes: Record<string, unknown> }): boolean {
		const domain = getDomain(entity.entity_id);
		const value = String(entity.state ?? '').trim().toLowerCase();
		if (!value) return false;

		if (value === 'unavailable' || value === 'unknown') return false;

		if (domain === 'alert') {
			// Alert entities are active when "on" (firing).
			return value === 'on';
		}

		if (domain === 'binary_sensor') {
			return value === 'on';
		}

		if (domain === 'alarm_control_panel') {
			// Treat truly alarming/transitional states as active alerts.
			return ['triggered', 'pending', 'arming', 'disarming'].includes(value);
		}

		if (domain === 'update') {
			// update.* commonly uses "on" when an update is available.
			return value === 'on';
		}
		// No generic fallback: avoid heuristic "made up" alerts from arbitrary entities.
		return false;
	}

	const domainAlertEntities = $derived(
		open && notifCfg.showAlerts && notifCfg.includeAlertDomainEntities
			? Object.values($entities).filter((e) => e.entity_id.startsWith('alert.') && isAlertEntityActive(e))
			: []
	);

	const trackedAlertEntities = $derived.by(() => {
		if (!open || !notifCfg.showAlerts) return [];
		const ids = notifCfg.alertEntityIds ?? [];
		return ids
			.map((id) => $entities[id])
			.filter((entity): entity is NonNullable<typeof entity> => !!entity)
			.filter((entity) => isAlertEntityActive(entity));
	});

	const alertEntities = $derived.by(() => {
		const merged = new Map<string, (typeof domainAlertEntities)[number]>();
		for (const entity of domainAlertEntities) merged.set(entity.entity_id, entity);
		for (const entity of trackedAlertEntities) merged.set(entity.entity_id, entity);
		return [...merged.values()];
	});
	const activeAlertEntityIds = $derived(
		new Set(alertEntities.map((entity) => entity.entity_id))
	);
	const visibleAlertEntities = $derived(
		alertEntities.filter((entity) => !dismissedAlertEntityIds.includes(entity.entity_id))
	);
	const clearableAlertEntities = $derived(
		visibleAlertEntities.filter((entity) => getDomain(entity.entity_id) === 'alert')
	);

	const totalCount = $derived(persistentNotifs.length + visibleAlertEntities.length);

	$effect(() => {
		// Keep dismissals only for currently-active alerts.
		const filtered = dismissedAlertEntityIds.filter((id) => activeAlertEntityIds.has(id));
		if (filtered.length !== dismissedAlertEntityIds.length) {
			dismissedAlertEntityIds = filtered;
		}
	});

	function openNotifDetails(entityId: string) {
		// Open the details view for this notification entity.
		uiStore.openDialog(entityId);
	}

	function alertDescription(entity: { state: string; attributes: Record<string, unknown> }): string {
		const message = entity.attributes?.message;
		if (typeof message === 'string' && message.trim()) return message.trim();
		return entity.state;
	}

	async function clearNotifications() {
		if (clearingAll) return;
		if (persistentNotifs.length === 0 && visibleAlertEntities.length === 0) return;
		clearingAll = true;
		try {
			const ops: Promise<unknown>[] = [];
			if (persistentNotifs.length > 0) {
				ops.push(persistentNotificationService.dismissAll());
			}
			for (const entity of clearableAlertEntities) {
				ops.push(callService('alert', 'turn_off', {}, { entity_id: entity.entity_id }));
			}
			await Promise.allSettled(ops);
			// Also clear non-service-clearable tracked alerts from panel view.
			dismissedAlertEntityIds = Array.from(
				new Set([...dismissedAlertEntityIds, ...visibleAlertEntities.map((entity) => entity.entity_id)])
			);
		} catch (error) {
			console.error('[notifications] Failed to clear notifications:', error);
		} finally {
			clearingAll = false;
		}
	}
</script>

<!-- Backdrop -->
{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="np-backdrop"
		onclick={onclose}
		onkeydown={(e) => { if (e.key === 'Escape') onclose(); }}
	></div>
{/if}

<!-- Panel -->
<aside
	class="np-panel"
	class:np-panel--open={open}
	aria-label="Notifications"
	aria-hidden={!open}
>
	<!-- Header -->
		<div class="np-header">
			<button class="np-close" onclick={onclose} aria-label="Close notifications">
				<Icon name="x" size={16} />
			</button>
			<div class="np-header__title">
				<span>Notifications</span>
				<button
					class="np-clear"
					type="button"
					onclick={clearNotifications}
					disabled={clearingAll || (persistentNotifs.length === 0 && visibleAlertEntities.length === 0)}
					aria-label="Clear notifications"
					title={persistentNotifs.length === 0 && visibleAlertEntities.length === 0 ? 'No notifications to clear' : 'Clear notifications'}
				>
					Clear
				</button>
				{#if totalCount > 0}
					<span class="np-badge">{totalCount}</span>
				{/if}
			</div>
		</div>

	<!-- Content -->
	<div class="np-content">
		{#if !notifCfg.enabled}
			<div class="np-empty">
				<Icon name="bell-off" size={20} />
				<span>Notifications are disabled</span>
					<button class="np-link" onclick={() => uiStore.openSettingsAt('alerts')}>Open settings</button>
				</div>

		{:else if totalCount === 0}
			<div class="np-empty">
				<Icon name="circle-check" size={20} />
				<span>No notifications</span>
			</div>

			{:else}
				{#if persistentNotifs.length > 0}
					<div class="np-section-label">From Home Assistant</div>
					{#each persistentNotifs as entity (entity.entity_id)}
						{@const title   = (entity.attributes.title as string | undefined) ?? 'Notification'}
						{@const message = (entity.attributes.message as string | undefined) ?? entity.state}
						<div class="np-item np-item--info">
							<span class="np-item__icon"><Icon name="info" size={14} /></span>
							<div class="np-item__body">
								<span class="np-item__title">{title}</span>
								<span class="np-item__desc">{message}</span>
							</div>
							<button
								class="np-item__action"
								onclick={() => openNotifDetails(entity.entity_id)}
								title="View details"
							>
								<Icon name="arrow-right" size={13} />
							</button>
						</div>
					{/each}
				{/if}

				{#if visibleAlertEntities.length > 0}
					<div class="np-section-label">Alerts</div>
					{#each visibleAlertEntities as entity (entity.entity_id)}
						<button class="np-item np-item--clickable np-item--warning" onclick={() => { openNotifDetails(entity.entity_id); onclose(); }}>
							<span class="np-item__icon"><Icon name="triangle-alert" size={14} /></span>
							<div class="np-item__body">
								<span class="np-item__title">{getEntityName(entity)}</span>
								<span class="np-item__desc">{alertDescription(entity)}</span>
							</div>
							<span class="np-item__action">
								<Icon name="chevron-right" size={13} />
							</span>
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	</aside>

<style>
	.np-backdrop {
		position: fixed;
		inset: 0;
		z-index: 599;
		background: transparent;
	}

	.np-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 600;
		width: 320px;
		max-width: 90vw;
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		transform: translateX(100%);
		transition: transform var(--transition-slow);
	}

	.np-panel--open { transform: translateX(0); }

	/* ── Header ──────────────────────────────────────────────────────────── */
	.np-header {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 10px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.np-header__title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--fg);
	}

	.np-clear {
		height: 22px;
		padding: 0 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		font-size: 0.6875rem;
		font-weight: 600;
		cursor: pointer;
	}
	.np-clear:hover:not(:disabled) { background: var(--hover); color: var(--fg); }
	.np-clear:disabled { opacity: 0.45; cursor: default; }

	.np-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		background: var(--accent);
		color: var(--accent-fg);
	}

	.np-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		color: var(--fg-muted);
	}
	.np-close:hover { background: var(--hover); color: var(--fg); }

	/* ── Content ─────────────────────────────────────────────────────────── */
	.np-content {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.np-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 40px 16px;
		color: var(--fg-subtle);
		font-size: 0.875rem;
		text-align: center;
	}

	.np-link {
		font-size: 0.8125rem;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
	}

	.np-section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-subtle);
		padding: 8px 8px 4px;
	}

	/* ── Item ────────────────────────────────────────────────────────────── */
	.np-item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
		margin-bottom: 5px;
		width: 100%;
		text-align: left;
	}

	.np-item--clickable {
		cursor: pointer;
		transition: background-color var(--transition);
	}

	.np-item--clickable:hover {
		background: var(--hover);
	}

	.np-item--info .np-item__icon    { color: var(--color-info); }
	.np-item--warning .np-item__icon { color: var(--color-warning); }

	.np-item__icon {
		display: flex;
		align-items: center;
		padding-top: 2px;
		flex-shrink: 0;
	}

	.np-item__body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.np-item__title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.np-item__desc {
		font-size: 0.75rem;
		color: var(--fg-muted);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.np-item__action {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		flex-shrink: 0;
		cursor: pointer;
	}
	.np-item__action:hover { background: var(--hover); color: var(--fg); }
</style>
