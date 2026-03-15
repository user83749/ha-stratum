<script lang="ts">
	// ── MobileNav ─────────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId, isMobileNavOpen, isNotificationsOpen } from '$lib/stores/ui';
	import { notificationBadgeCount } from '$lib/stores/notificationBadge';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { haptic } from '$lib/utils/haptics';

	// ── Derived State ─────────────────────────────────────────────────────────
	const nav   = $derived($dashboardStore.nav);
	const pages = $derived($dashboardStore.pages);

	const currentPageId  = $derived($activePageId);
	const drawerOpen     = $derived($isMobileNavOpen);
	const notificationsOpen = $derived($isNotificationsOpen);
	const alertCount = $derived($notificationBadgeCount);

	// Visible pages only (sm breakpoint)
	const visiblePages = $derived(pages.filter((p) => p.navVisibility.sm));

	// For bottom-bar: show at most 6 tabs; overflow goes into drawer
	const MAX_TABS = 6;
	const tabPages    = $derived(visiblePages.slice(0, MAX_TABS));
	const hasOverflow = $derived(visiblePages.length > MAX_TABS);

	// ── Actions ───────────────────────────────────────────────────────────────
	function navigate(pageId: string) {
		haptic('selection');
		uiStore.navigateTo(pageId);
		uiStore.closeMobileNav();
	}

	function openAlerts() {
		haptic('selection');
		uiStore.openNotifications();
	}

	const iconSizeMap = { sm: 20, md: 24, lg: 28 } as const;
	const iconSize    = $derived(iconSizeMap[nav.iconSize]);
</script>

<!-- ── Bottom tab bar ──────────────────────────────────────────────────────── -->
{#if nav.mobileStyle === 'bottom-bar'}
	<nav class="mob-bar" aria-label="Mobile navigation">
		{#each tabPages as page (page.id)}
			{@const isActive = currentPageId === page.id}
			<button
				class="mob-bar__tab"
				class:mob-bar__tab--active={isActive}
				onclick={() => navigate(page.id)}
				aria-current={isActive ? 'page' : undefined}
			>
				<Icon name={page.icon} size={iconSize} />
				{#if nav.showLabelsOnMobile}
					<span class="mob-bar__label">{page.name}</span>
				{/if}
			</button>
		{/each}

		{#if hasOverflow}
			<button
				class="mob-bar__tab"
				class:mob-bar__tab--active={drawerOpen}
				onclick={() => { haptic('selection'); uiStore.toggleMobileNav(); }}
				aria-label="More pages"
			>
				<Icon name="menu" size={iconSize} />
				{#if nav.showLabelsOnMobile}
					<span class="mob-bar__label">More</span>
				{/if}
			</button>
		{/if}

		{#if nav.showMobileAlertsButton}
			<button
				class="mob-bar__tab mob-bar__tab--alerts"
				class:mob-bar__tab--active={notificationsOpen}
				onclick={openAlerts}
				aria-label="Alerts"
			>
				<Icon name="bell" size={iconSize} />
				{#if alertCount > 0}
					<span class="mob-bar__badge" aria-label={`${alertCount} alerts`}>
						{alertCount > 99 ? '99+' : alertCount}
					</span>
				{/if}
				{#if nav.showLabelsOnMobile}
					<span class="mob-bar__label">Alerts</span>
				{/if}
			</button>
		{/if}

		<button
			class="mob-bar__tab"
			onclick={() => { uiStore.openSettings(); }}
			aria-label="Settings"
		>
			<Icon name="settings" size={iconSize} />
			{#if nav.showLabelsOnMobile}
				<span class="mob-bar__label">Settings</span>
			{/if}
		</button>
	</nav>
{/if}

<!-- ── Drawer launcher (drawer mode) ─────────────────────────────────────── -->
{#if nav.mobileStyle === 'drawer'}
	<div class="mob-dock" aria-label="Mobile navigation controls">
		<button
			class="mob-dock__btn"
			class:mob-dock__btn--active={drawerOpen}
			onclick={() => { haptic('selection'); uiStore.toggleMobileNav(); }}
			aria-label="Open navigation"
		>
			<Icon name="menu" size={22} />
		</button>
		{#if nav.showMobileAlertsButton}
			<button
				class="mob-dock__btn mob-dock__btn--alerts"
				class:mob-dock__btn--active={notificationsOpen}
				onclick={openAlerts}
				aria-label="Alerts"
			>
				<Icon name="bell" size={20} />
				{#if alertCount > 0}
					<span class="mob-dock__badge" aria-label={`${alertCount} alerts`}>
						{alertCount > 99 ? '99+' : alertCount}
					</span>
				{/if}
			</button>
		{/if}
		<button
			class="mob-dock__btn"
			onclick={() => { uiStore.openSettings(); }}
			aria-label="Settings"
		>
			<Icon name="settings" size={20} />
		</button>
	</div>
{/if}

<!-- ── Drawer overlay ──────────────────────────────────────────────────────── -->
{#if drawerOpen}
	<!-- Backdrop -->
	<div
		class="mob-drawer__backdrop"
		onclick={() => { haptic('selection'); uiStore.closeMobileNav(); }}
		aria-hidden="true"
	></div>

	<!-- Drawer panel -->
	<div class="mob-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
		<div class="mob-drawer__header">
			<button
				class="mob-drawer__close"
				onclick={() => { haptic('selection'); uiStore.closeMobileNav(); }}
				aria-label="Close navigation"
			>
				<Icon name="x" size={20} />
			</button>
			{#if nav.headerTitle}
				<span class="mob-drawer__title">{nav.headerTitle}</span>
			{/if}
		</div>

		<ul class="mob-drawer__list" role="list">
			{#each visiblePages as page (page.id)}
				{@const isActive = currentPageId === page.id}
				<li>
					<button
						class="mob-drawer__link"
						class:mob-drawer__link--active={isActive}
						onclick={() => navigate(page.id)}
						aria-current={isActive ? 'page' : undefined}
						aria-label={page.name}
					>
						<Icon name={page.icon} size={20} />
						{#if nav.showLabelsOnMobile}
							<span>{page.name}</span>
						{/if}
					</button>
				</li>
			{/each}

			{#each nav.extras as extra (extra.id)}
				{#if extra.type === 'divider'}
					<li class="mob-drawer__divider" role="separator"></li>
				{:else if extra.type === 'label'}
					<li class="mob-drawer__section-label">{extra.text}</li>
				{:else if extra.type === 'url' && extra.visibility.sm}
					<li>
						<a
							class="mob-drawer__link"
							href={extra.url}
							target={extra.newTab ? '_blank' : undefined}
							rel={extra.newTab ? 'noopener noreferrer' : undefined}
							onclick={() => { haptic('selection'); uiStore.closeMobileNav(); }}
							aria-label={extra.label}
						>
							<Icon name={extra.icon} size={20} />
							{#if nav.showLabelsOnMobile}
								<span>{extra.label}</span>
							{/if}
						</a>
					</li>
				{/if}
			{/each}
		</ul>
	</div>
{/if}

<style>
	/* ── Bottom tab bar ────────────────────────────────────────────────────── */
	.mob-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: stretch;
		height: calc(48px + env(safe-area-inset-bottom));
		background-color: var(--surface);
		backdrop-filter: blur(var(--blur-amount));
		-webkit-backdrop-filter: blur(var(--blur-amount));
		border-top: 1px solid var(--border);
		padding: 0 4px;
		padding-bottom: env(safe-area-inset-bottom);
		z-index: 30;
	}

	.mob-bar__tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		color: var(--fg-subtle);
		transition: color var(--transition);
		min-width: 0;
		padding: 6px 4px;
	}
	.mob-bar__tab--alerts {
		position: relative;
	}
	.mob-bar__tab:hover     { color: var(--fg-muted); }
	.mob-bar__tab--active   { color: var(--accent); }
	.mob-bar__badge {
		position: absolute;
		top: 4px;
		right: calc(50% - 16px);
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: #8b3333;
		color: #d6d6d6;
		font-size: 0.62rem;
		font-weight: 700;
		line-height: 16px;
		text-align: center;
	}

	.mob-bar__label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* ── Drawer launcher ─────────────────────────────────────────────────── */
	.mob-dock {
		position: fixed;
		left: 12px;
		bottom: calc(10px + env(safe-area-inset-bottom));
		display: inline-flex;
		align-items: center;
		gap: 8px;
		z-index: 31;
	}

	.mob-dock__btn {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg-muted);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(var(--blur-amount));
		-webkit-backdrop-filter: blur(var(--blur-amount));
		box-shadow: var(--shadow-md);
	}
	.mob-dock__btn--alerts {
		position: relative;
	}
	.mob-dock__badge {
		position: absolute;
		top: -5px;
		right: -5px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 999px;
		background: #8b3333;
		color: #d6d6d6;
		font-size: 0.62rem;
		font-weight: 700;
		line-height: 16px;
		text-align: center;
		border: 1px solid color-mix(in srgb, var(--surface) 90%, transparent);
	}

	.mob-dock__btn--active {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
	}

	/* ── Drawer backdrop ───────────────────────────────────────────────────── */
	.mob-drawer__backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		z-index: 40;
		backdrop-filter: blur(2px);
	}

	/* ── Drawer panel ──────────────────────────────────────────────────────── */
	.mob-drawer {
		position: fixed;
		inset-block: 0;
		left: 0;
		width: min(320px, 85vw);
		background-color: var(--bg-elevated);
		border-right: 1px solid var(--border);
		z-index: 50;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideIn 200ms ease;
	}

	@keyframes slideIn {
		from { transform: translateX(-100%); }
		to   { transform: translateX(0); }
	}

	.mob-drawer__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 16px 12px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.mob-drawer__title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--fg);
	}

	.mob-drawer__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		transition: background-color var(--transition), color var(--transition);
	}
	.mob-drawer__close:hover {
		background-color: var(--hover);
		color: var(--fg);
	}

	.mob-drawer__list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.mob-drawer__link {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px 12px;
		border-radius: var(--radius);
		color: var(--fg-muted);
		font-size: 0.9375rem;
		font-weight: 500;
		text-decoration: none;
		transition: background-color var(--transition), color var(--transition);
	}
	.mob-drawer__link:hover       { background-color: var(--hover); color: var(--fg); }
	.mob-drawer__link--active     {
		background-color: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
	}

	.mob-drawer__divider {
		height: 1px;
		background-color: var(--border);
		margin: 6px 8px;
	}

	.mob-drawer__section-label {
		padding: 8px 12px 2px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}
</style>
