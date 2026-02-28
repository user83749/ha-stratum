<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId, isMobileNavOpen } from '$lib/stores/ui';
	import Icon from '$lib/components/ui/Icon.svelte';

	const nav   = $derived($dashboardStore.nav);
	const pages = $derived($dashboardStore.pages);

	const currentPageId  = $derived($activePageId);
	const drawerOpen     = $derived($isMobileNavOpen);

	// Visible pages only (sm breakpoint)
	const visiblePages = $derived(pages.filter((p) => p.navVisibility.sm));

	// For bottom-bar: show at most 5 tabs; overflow goes into drawer
	const MAX_TABS = 5;
	const tabPages    = $derived(visiblePages.slice(0, MAX_TABS));
	const hasOverflow = $derived(visiblePages.length > MAX_TABS);

	function navigate(pageId: string) {
		uiStore.navigateTo(pageId);
		uiStore.closeMobileNav();
	}

	const iconSizeMap = { sm: 16, md: 20, lg: 24 } as const;
	const iconSize    = $derived(iconSizeMap[nav.iconSize]);
</script>

<!-- ── Bottom tab bar ──────────────────────────────────────────────────────── -->
{#if nav.mobileStyle === 'bottom-bar' || nav.mobileStyle === 'drawer'}
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

		{#if hasOverflow || nav.mobileStyle === 'drawer'}
			<button
				class="mob-bar__tab"
				class:mob-bar__tab--active={drawerOpen}
				onclick={() => uiStore.toggleMobileNav()}
				aria-label="More pages"
			>
				<Icon name="menu" size={iconSize} />
				{#if nav.showLabelsOnMobile}
					<span class="mob-bar__label">More</span>
				{/if}
			</button>
		{/if}

		<button
			class="mob-bar__tab"
			onclick={() => uiStore.openSettings()}
			aria-label="Settings"
		>
			<Icon name="settings" size={iconSize} />
			{#if nav.showLabelsOnMobile}
				<span class="mob-bar__label">Settings</span>
			{/if}
		</button>
	</nav>
{/if}

<!-- ── Drawer overlay ──────────────────────────────────────────────────────── -->
{#if drawerOpen}
	<!-- Backdrop -->
	<div
		class="mob-drawer__backdrop"
		onclick={() => uiStore.closeMobileNav()}
		aria-hidden="true"
	></div>

	<!-- Drawer panel -->
	<div class="mob-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
		<div class="mob-drawer__header">
			<button
				class="mob-drawer__close"
				onclick={() => uiStore.closeMobileNav()}
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
					>
						<Icon name={page.icon} size={20} />
						<span>{page.name}</span>
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
							onclick={() => uiStore.closeMobileNav()}
						>
							<Icon name={extra.icon} size={20} />
							<span>{extra.label}</span>
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
		height: 56px;
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
	.mob-bar__tab:hover     { color: var(--fg-muted); }
	.mob-bar__tab--active   { color: var(--accent); }

	.mob-bar__label {
		font-size: 0.625rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
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
