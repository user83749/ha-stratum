<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId } from '$lib/stores/ui';
	import { editMode, isEditing } from '$lib/stores/editMode';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { deactivateDemo, isDemoMode } from '$lib/demo/index';
	import { entities } from '$lib/ha/websocket';
	import { getDomain, getEntityName, isActive } from '$lib/ha/entities';

	const isDemo = $derived(browser ? isDemoMode() : false);

	function exitDemo() {
		deactivateDemo();
	}

	onMount(() => {
		isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
	});

	const cfg       = $derived($dashboardStore);
	const header    = $derived(cfg.header);
	const pages     = $derived(cfg.pages);
	const search    = $derived(cfg.search);
	const favorites = $derived(cfg.favorites);

	const DOMAIN_ICONS: Record<string, string> = {
		light: 'lightbulb', switch: 'toggle-right', sensor: 'activity',
		binary_sensor: 'radio', climate: 'thermometer', media_player: 'music',
		cover: 'chevrons-up-down', lock: 'lock', fan: 'wind', camera: 'video',
		scene: 'sparkles', script: 'play', automation: 'zap', person: 'user',
		input_boolean: 'toggle-right', input_number: 'sliders-horizontal',
		input_select: 'list', timer: 'timer', vacuum: 'circle-dot',
		weather: 'cloud-sun', alarm_control_panel: 'shield', update: 'download',
	};

	const favoriteEntities = $derived(
		favorites.entityIds.map((id) => ({
			id,
			entity: $entities[id] ?? null
		}))
	);

	const currentPageId = $derived($activePageId);
	const editing       = $derived($isEditing);
	let isMac = $state(false);

	const activePage = $derived(
		pages.find((p) => p.id === currentPageId) ?? pages[0] ?? null
	);

	function handleSearchClick() {
		uiStore.openSearch();
	}

	function handleSettingsClick() {
		uiStore.openSettings();
	}

	function handleEditClick() {
		editMode.toggle();
	}

	function handleNotificationsClick() {
		uiStore.toggleNotifications();
	}

	// Keyboard shortcut for search
	function handleKeydown(e: KeyboardEvent) {
		if (!search.enabled) return;
		if ((e.metaKey || e.ctrlKey) && e.key === search.hotkey) {
			e.preventDefault();
			uiStore.toggleSearch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<header
	class="ha-header"
	class:ha-header--editing={editing}
	class:ha-header--has-favorites={favorites.showInHeader && favoriteEntities.length > 0}
>
	<!-- ── Main row ─────────────────────────────────────────────────────────── -->
	<div class="ha-header__row" style="height: {header.height}px;">
		<div class="ha-header__spacer"></div>

		<!-- Demo badge -->
		{#if isDemo}
			<button class="demo-badge" onclick={exitDemo} title="Exit demo mode">
				<span class="demo-dot"></span>
				Demo
			</button>
		{/if}

		<!-- Right actions -->
		<div class="ha-header__actions">
			{#each header.quickActions as action (action.id)}
				{#if action.visibility.lg}
					<button class="ha-header__btn" aria-label={action.label} title={action.label}>
						<Icon name={action.icon} size={18} />
					</button>
				{/if}
			{/each}

			{#if header.showSearch && search.enabled}
				<button
					class="ha-header__search"
					onclick={handleSearchClick}
					aria-label="Search"
					title="Search"
				>
					<Icon name="search" size={16} />
					<span class="ha-header__search-label">Search…</span>
					<kbd class="ha-header__search-kbd">
						<span class="ha-header__search-kbd-meta">{isMac ? '⌘' : '⌃'}</span>{search.hotkey.toUpperCase()}
					</kbd>
				</button>
			{/if}

			{#if header.showNotifications}
				<button class="ha-header__btn" onclick={handleNotificationsClick} aria-label="Notifications" title="Notifications">
					<Icon name="bell" size={18} />
				</button>
			{/if}

			{#if header.showEditButton}
				<button
					class="ha-header__btn"
					class:ha-header__btn--active={editing}
					onclick={handleEditClick}
					aria-label={editing ? 'Exit edit mode' : 'Edit dashboard'}
					title={editing ? 'Exit edit mode' : 'Edit dashboard'}
				>
					<Icon name={editing ? 'check' : 'pencil'} size={18} />
				</button>
			{/if}

			{#if header.showSettingsButton}
				<button class="ha-header__btn" onclick={handleSettingsClick} aria-label="Settings" title="Settings">
					<Icon name="settings" size={18} />
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Favorites row ─────────────────────────────────────────────────────── -->
	{#if favorites.showInHeader && favoriteEntities.length > 0}
		<div class="ha-header__favorites" role="list" aria-label="Favorites">
			{#each favoriteEntities as fav (fav.id)}
				{@const entity = fav.entity}
				{@const active = entity ? isActive(entity) : false}
				{@const name   = entity ? getEntityName(entity) : fav.id}
				{@const domain = getDomain(fav.id)}
				{@const icon   = DOMAIN_ICONS[domain] ?? 'cpu'}
				<button
					class="ha-fav-chip"
					class:ha-fav-chip--active={active}
					onclick={() => uiStore.openDialog(fav.id)}
					title={name}
				>
					<span class="ha-fav-chip__icon"><Icon name={icon} size={13} /></span>
					<span class="ha-fav-chip__name">{name}</span>
					{#if entity}
						<span class="ha-fav-chip__state">{entity.state}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</header>

<style>
	.ha-header {
		display: flex;
		flex-direction: column;
		transition: background-color var(--transition);
	}

	.ha-header__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		gap: 12px;
	}

	.ha-header--editing {
		background-color: color-mix(in srgb, var(--accent) 6%, var(--bg-elevated));
		border-bottom-color: color-mix(in srgb, var(--accent) 30%, transparent);
	}


	.ha-header__spacer { flex: 1; }

	/* ── Right actions ───────────────────────────────────────────────────── */
	.ha-header__actions {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.ha-header__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius);
		border: none;
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}
	.ha-header__btn:hover    { background-color: var(--hover); color: var(--fg); }
	.ha-header__btn--active  { color: var(--accent); background-color: color-mix(in srgb, var(--accent) 12%, transparent); }

	/* ── Search pill ─────────────────────────────────────────────────────── */
	.ha-header__search {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 10px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background-color: var(--hover);
		color: var(--fg-subtle);
		font-size: 0.8125rem;
		transition: border-color var(--transition), background-color var(--transition), color var(--transition);
	}
	.ha-header__search:hover {
		border-color: var(--border-strong);
		background-color: var(--active);
		color: var(--fg-muted);
	}

	.ha-header__search-label {
		/* Hide on narrow screens */
		display: none;
	}
	@media (min-width: 640px) {
		.ha-header__search-label { display: inline; }
	}

	.ha-header__search-kbd {
		display: none;
		align-items: center;
		gap: 1px;
		font-size: 0.6875rem;
		font-family: var(--font-family);
		color: var(--fg-subtle);
		background-color: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 1px 5px;
		white-space: nowrap;
	}
	@media (min-width: 768px) {
		.ha-header__search-kbd { display: flex; }
	}

	.ha-header__search-kbd-meta {
		font-size: 0.75rem;
	}

	/* ── Demo badge ──────────────────────────────────────────────────────── */
	.demo-badge {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 26px;
		padding: 0 10px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		color: var(--color-warning);
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background-color var(--transition), border-color var(--transition);
	}
	.demo-badge:hover {
		background: color-mix(in srgb, var(--color-warning) 20%, transparent);
		border-color: var(--color-warning);
	}
	.demo-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-warning);
		animation: pulse-demo 2s ease-in-out infinite;
		flex-shrink: 0;
	}
	@keyframes pulse-demo {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.4; }
	}

	/* ── Favorites row ────────────────────────────────────────────────────── */
	.ha-header__favorites {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 0 16px 8px;
		overflow-x: auto;
		scrollbar-width: none;
		flex-wrap: nowrap;
	}
	.ha-header__favorites::-webkit-scrollbar { display: none; }

	.ha-fav-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 10px 3px 7px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		flex-shrink: 0;
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition), border-color var(--transition);
	}
	.ha-fav-chip:hover { background: var(--active); color: var(--fg); border-color: var(--border-strong); }
	.ha-fav-chip--active {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-on) 30%, transparent);
		color: var(--color-on);
	}
	.ha-fav-chip--active:hover {
		background: color-mix(in srgb, var(--color-on) 18%, transparent);
	}

	.ha-fav-chip__icon { display: flex; align-items: center; }

	.ha-fav-chip__name {
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ha-fav-chip__state {
		font-size: 0.6875rem;
		color: inherit;
		opacity: 0.7;
	}
</style>
