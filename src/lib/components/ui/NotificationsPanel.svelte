<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — NotificationsPanel.svelte
	// Right-side drawer showing HA persistent_notifications and entity alerts.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName } from '$lib/ha/entities';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	const cfg           = $derived($dashboardStore);
	const notifCfg      = $derived(cfg.notifications);

	// Gather persistent_notification entities (HA creates these as entities)
	const persistentNotifs = $derived(
		notifCfg.showPersistent
			? Object.values($entities).filter((e) => e.entity_id.startsWith('persistent_notification.'))
			: []
	);

	// Entity-based alerts: entities in certain states (low battery, unavailable, etc.)
	const alertEntities = $derived(
		notifCfg.showAlerts
			? Object.values($entities).filter((e) =>
				e.state === 'unavailable' || e.state === 'unknown' ||
				(e.entity_id.startsWith('sensor.') && e.attributes.device_class === 'battery' &&
				 parseFloat(e.state) < 20 && !isNaN(parseFloat(e.state)))
			)
			: []
	);

	const totalCount = $derived(persistentNotifs.length + alertEntities.length);

	function dismissNotif(entityId: string) {
		// In real HA, you'd call persistent_notification.dismiss
		// Here we just show the info dialog
		uiStore.openDialog(entityId);
	}

	function formatState(e: { state: string; entity_id: string; attributes: Record<string, unknown> }): string {
		if (e.state === 'unavailable') return 'Unavailable';
		if (e.state === 'unknown') return 'Unknown state';
		const batt = e.attributes.device_class === 'battery';
		if (batt) return `Battery: ${e.state}%`;
		return e.state;
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
			<Icon name="bell" size={16} />
			<span>Notifications</span>
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
				<button class="np-link" onclick={() => uiStore.openSettings()}>Open settings</button>
			</div>

		{:else if totalCount === 0}
			<div class="np-empty">
				<Icon name="circle-check" size={20} />
				<span>No notifications</span>
			</div>

		{:else}
			<!-- Persistent HA notifications -->
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
							onclick={() => dismissNotif(entity.entity_id)}
							title="View details"
						>
							<Icon name="arrow-right" size={13} />
						</button>
					</div>
				{/each}
			{/if}

			<!-- Entity alerts -->
			{#if alertEntities.length > 0}
				<div class="np-section-label">Entity Alerts</div>
				{#each alertEntities as entity (entity.entity_id)}
					{@const name  = getEntityName(entity)}
					{@const state = formatState(entity)}
					{@const isBatt = entity.attributes.device_class === 'battery'}
					<button
						class="np-item np-item--clickable"
						class:np-item--warning={isBatt}
						class:np-item--danger={entity.state === 'unavailable' || entity.state === 'unknown'}
						onclick={() => { uiStore.openDialog(entity.entity_id); onclose(); }}
					>
						<span class="np-item__icon">
							<Icon name={isBatt ? 'battery-low' : 'triangle-alert'} size={14} />
						</span>
						<div class="np-item__body">
							<span class="np-item__title">{name}</span>
							<span class="np-item__desc">{state}</span>
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
		justify-content: space-between;
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

	.np-item--clickable { cursor: pointer; transition: background-color var(--transition); }
	.np-item--clickable:hover { background: var(--hover); }

	.np-item--info .np-item__icon    { color: var(--color-info); }
	.np-item--warning .np-item__icon { color: var(--color-warning); }
	.np-item--danger .np-item__icon  { color: var(--color-danger); }

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
