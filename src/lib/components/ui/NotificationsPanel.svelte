<script lang="ts">
	// ── NotificationsPanel ────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { browser } from '$app/environment';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import { callService, persistentNotificationService } from '$lib/ha/services';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { entities } from '$lib/ha/websocket';
	import { getDomain } from '$lib/ha/entities';
	import type { NotificationAlertDomain } from '$lib/types/dashboard';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	// ── Props / Local State ───────────────────────────────────────────────────
	let { open, onclose }: Props = $props();

	const cfg           = $derived($dashboardStore);
	const notifCfg      = $derived(cfg.notifications);
	const navCfg        = $derived(cfg.nav);
	let clearingAll = $state(false);
	let dismissedAlertEntityIds = $state<string[]>([]);
	let clearInfoMessage = $state('');
	let windowWidth = $state(1280);

	$effect(() => {
		if (!browser) return;
		windowWidth = window.innerWidth;
		const onResize = () => { windowWidth = window.innerWidth; };
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});
	const mobileNavContext = $derived(
		windowWidth <= navCfg.mobileBreakpoint && navCfg.mobileStyle !== 'hidden'
	);

	// ── Derived State ─────────────────────────────────────────────────────────
	// Gather persistent_notification entities.
	const persistentNotifs = $derived(
		open && notifCfg.showPersistent
			? Object.values($entities).filter((e) => e.entity_id.startsWith('persistent_notification.'))
			: []
	);

	type AlertSource =
		| 'alert-domain'
		| 'update-domain'
		| 'binary-sensor-domain'
		| 'alarm-panel-domain'
		| 'tracked';

	interface AlertItem {
		entity: { entity_id: string; state: string; attributes: Record<string, unknown> };
		source: AlertSource;
	}

	function normalizedDomainStates(domain: NotificationAlertDomain): string[] {
		const raw = notifCfg.alertStateMap?.[domain] ?? [];
		return raw
			.map((value) => String(value).trim().toLowerCase())
			.filter((value, idx, arr) => value.length > 0 && arr.indexOf(value) === idx);
	}

	function resolveAlertDomain(entityId: string): NotificationAlertDomain | null {
		if (entityId.startsWith('alert.')) return 'alert';
		if (entityId.startsWith('update.')) return 'update';
		if (entityId.startsWith('binary_sensor.')) return 'binary_sensor';
		if (entityId.startsWith('alarm_control_panel.')) return 'alarm_control_panel';
		return null;
	}

	function isEntityActiveForDomain(
		entity: { entity_id: string; state: string; attributes: Record<string, unknown> },
		domain: NotificationAlertDomain
	): boolean {
		const value = String(entity.state ?? '').trim().toLowerCase();
		if (!value || value === 'unavailable' || value === 'unknown') return false;
		return normalizedDomainStates(domain).includes(value);
	}

	const domainAlertItems = $derived.by(() => {
		if (!open || !notifCfg.showAlerts) return [] as AlertItem[];
		const all = Object.values($entities);
		const items: AlertItem[] = [];
		if (notifCfg.includeAlertDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('alert.')) continue;
				if (isEntityActiveForDomain(entity, 'alert')) items.push({ entity, source: 'alert-domain' });
			}
		}
		if (notifCfg.includeUpdateDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('update.')) continue;
				if (isEntityActiveForDomain(entity, 'update')) items.push({ entity, source: 'update-domain' });
			}
		}
		if (notifCfg.includeBinarySensorDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('binary_sensor.')) continue;
				if (isEntityActiveForDomain(entity, 'binary_sensor')) items.push({ entity, source: 'binary-sensor-domain' });
			}
		}
		if (notifCfg.includeAlarmControlPanelDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('alarm_control_panel.')) continue;
				if (isEntityActiveForDomain(entity, 'alarm_control_panel')) items.push({ entity, source: 'alarm-panel-domain' });
			}
		}
		return items;
	});

	const trackedAlertItems = $derived.by(() => {
		if (!open || !notifCfg.showAlerts) return [];
		const ids = notifCfg.alertEntityIds ?? [];
		return ids
			.map((id) => $entities[id])
			.filter((entity): entity is NonNullable<typeof entity> => !!entity)
			.filter((entity) => {
				const domain = resolveAlertDomain(entity.entity_id);
				return domain ? isEntityActiveForDomain(entity, domain) : false;
			})
			.map((entity) => ({ entity, source: 'tracked' as const }));
	});

	const alertItems = $derived.by(() => {
		const merged = new Map<string, AlertItem>();
		for (const item of domainAlertItems) merged.set(item.entity.entity_id, item);
		for (const item of trackedAlertItems) {
			if (!merged.has(item.entity.entity_id)) merged.set(item.entity.entity_id, item);
		}
		return [...merged.values()];
	});
	const activeAlertEntityIds = $derived(
		new Set(alertItems.map((item) => item.entity.entity_id))
	);
	const visibleAlertItems = $derived(
		alertItems.filter((item) => !dismissedAlertEntityIds.includes(item.entity.entity_id))
	);
	const clearableAlertEntities = $derived(
		visibleAlertItems
			.map((item) => item.entity)
			.filter((entity) => getDomain(entity.entity_id) === 'alert')
	);
	const nonClearableAlertCount = $derived(visibleAlertItems.length - clearableAlertEntities.length);

	const totalCount = $derived(persistentNotifs.length + visibleAlertItems.length);

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

	function alertEntityLabel(entity: { entity_id: string; attributes: Record<string, unknown> }): string {
		const friendly = entity.attributes?.friendly_name;
		if (typeof friendly === 'string' && friendly.trim()) return friendly.trim();
		return entity.entity_id;
	}

	function alertSourceLabel(source: AlertSource): string {
		if (source === 'alert-domain') return 'alert.*';
		if (source === 'update-domain') return 'update.*';
		if (source === 'binary-sensor-domain') return 'binary_sensor.*';
		if (source === 'alarm-panel-domain') return 'alarm_control_panel.*';
		return 'tracked';
	}

	async function clearNotifications() {
		if (clearingAll) return;
		if (persistentNotifs.length === 0 && visibleAlertItems.length === 0) return;
		clearInfoMessage = '';
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
			// Keep non-service-clearable items from persisting in panel state.
			dismissedAlertEntityIds = Array.from(
				new Set([...dismissedAlertEntityIds, ...visibleAlertItems.map((item) => item.entity.entity_id)])
			);
			if (nonClearableAlertCount > 0) {
				clearInfoMessage = `${nonClearableAlertCount} non-clearable alerts were dismissed from view.`;
			}
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
	class:np-panel--mobile-nav={mobileNavContext}
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
					disabled={clearingAll || (persistentNotifs.length === 0 && visibleAlertItems.length === 0)}
					aria-label="Clear notifications"
					title={persistentNotifs.length === 0 && visibleAlertItems.length === 0 ? 'No notifications to clear' : 'Clear notifications'}
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

				{#if visibleAlertItems.length > 0}
					<div class="np-section-label">Alerts</div>
					{#each visibleAlertItems as item (item.entity.entity_id)}
						<button class="np-item np-item--clickable np-item--warning" onclick={() => { openNotifDetails(item.entity.entity_id); onclose(); }}>
							<span class="np-item__icon"><Icon name="triangle-alert" size={14} /></span>
							<div class="np-item__body">
								<span class="np-item__title">
									{alertEntityLabel(item.entity)}
									<span class="np-item__source">{alertSourceLabel(item.source)}</span>
								</span>
								<span class="np-item__desc">{alertDescription(item.entity)}</span>
							</div>
							<span class="np-item__action">
								<Icon name="chevron-right" size={13} />
							</span>
						</button>
					{/each}
				{/if}

				{#if clearInfoMessage}
					<div class="np-note">{clearInfoMessage}</div>
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
	.np-panel--mobile-nav {
		width: min(380px, 96vw);
	}

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
		display: flex;
		align-items: center;
		gap: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.np-item__source {
		font-size: 0.625rem;
		font-weight: 600;
		color: var(--fg-subtle);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 1px 6px;
		flex-shrink: 0;
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

	.np-note {
		margin: 6px 4px 2px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		font-size: 0.72rem;
		color: var(--fg-subtle);
		background: var(--surface);
	}
</style>
