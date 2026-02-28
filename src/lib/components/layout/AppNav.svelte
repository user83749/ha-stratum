<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId } from '$lib/stores/ui';
	import { connectionStatus, entities } from '$lib/ha/websocket';
	import { isEditing, editMode } from '$lib/stores/editMode';
	import { undoStore } from '$lib/stores/undoStore';
	import { get } from 'svelte/store';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getDomain, getEntityName, isActive } from '$lib/ha/entities';
	import { callService } from '$lib/ha/services';
	import type { Page } from '$lib/types/dashboard';
	import { VISIBLE_ALL } from '$lib/types/dashboard';

	const DOMAIN_ICONS: Record<string, string> = {
		light: 'lightbulb', switch: 'toggle-right', sensor: 'activity',
		binary_sensor: 'radio', climate: 'thermometer', media_player: 'music',
		cover: 'chevrons-up-down', lock: 'lock', fan: 'wind', camera: 'video',
		scene: 'sparkles', script: 'play', automation: 'zap', person: 'user',
		input_boolean: 'toggle-right', input_number: 'sliders-horizontal',
		input_select: 'list', timer: 'timer', vacuum: 'circle-dot',
		weather: 'cloud-sun', alarm_control_panel: 'shield', update: 'download',
	};

	const cfg       = $derived($dashboardStore);
	const nav       = $derived(cfg.nav);
	const pages     = $derived(cfg.pages);
	const favorites = $derived(cfg.favorites);

	const favoriteEntities = $derived(
		favorites.entityIds.map((id) => ({
			id,
			entity: $entities[id] ?? null
		}))
	);

	// Build the ordered list of items to render
	const orderedItems = $derived(() => {
		if (nav.order.length === 0) {
			// No custom order — pages in array order, extras appended
			return [
				...pages.map((p) => ({ type: 'page' as const, id: p.id })),
				...nav.extras.map((e) => ({ type: 'extra' as const, id: e.id }))
			];
		}
		return nav.order;
	});

	const pageMap  = $derived(new Map(pages.map((p) => [p.id, p])));
	const extraMap = $derived(new Map(nav.extras.map((e) => [e.id, e])));

	// Badge map: pageId → entity state (resolved separately in a real impl via entities store)
	// For now just expose the config so the template can render the badge dot
	const badgeMap = $derived(new Map(nav.badges.map((b) => [b.pageId, b])));

	const currentPageId = $derived($activePageId);

	function navigate(pageId: string) {
		uiStore.navigateTo(pageId);
	}

	// Connection status dot
	const connStatus = $derived($connectionStatus);

	const iconSizeMap = { sm: 16, md: 20, lg: 24 } as const;
	const iconSize    = $derived(iconSizeMap[nav.iconSize]);
	const editing     = $derived($isEditing);

	function unpinEntity(entityId: string) {
		dashboardStore.toggleFavorite(entityId);
	}

	function addPage() {
		const current = get(dashboardStore);
		undoStore.push(current);
		const newId = crypto.randomUUID();
		const newPage: Page = {
			id:            newId,
			name:          'New Page',
			icon:          'file',
			layout:        'default',
			background:    { type: 'none' },
			navVisibility: { ...VISIBLE_ALL },
			adminOnly:     false,
			sections:      [],
			transition:    'fade',
		};
		dashboardStore.addPage(newPage);
		uiStore.navigateTo(newId);
		editMode.openPageEditor(newId);
	}

	// ── Clock ────────────────────────────────────────────────────────────
	let clockTime = $state('');
	let clockDate = $state('');
	let clockTimer: ReturnType<typeof setInterval> | null = null;

	function updateClock() {
		const now = new Date();
		clockTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M/i, '');
		clockDate = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
	}

	const weatherEntity = $derived($entities['weather.forecast_home']);
	const weatherStr = $derived(() => {
		if (!weatherEntity || weatherEntity.state === 'unknown' || weatherEntity.state === 'unavailable') return null;
		const temp = Math.round(Number(weatherEntity.attributes?.temperature || 0));
		const condition = weatherEntity.state.replace(/-/g, ' ');
		
		// Capitalize first letter of condition
		const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
		
		return `Feels like ${temp}° — ${capitalizedCondition}`;
	});

	onMount(() => { updateClock(); clockTimer = setInterval(updateClock, 1000); });
	onDestroy(() => { if (clockTimer) clearInterval(clockTimer); });
</script>

<nav
	class="ha-nav"
	aria-label="Dashboard navigation"
>
	<!-- ── Clock + collapse button ──────────────────────────────────────── -->
	<div class="ha-nav__clock" aria-live="off">
		<span class="ha-nav__clock-time">{clockTime}</span>
		<div class="ha-nav__clock-sub">
			<span class="ha-nav__clock-date">{clockDate}</span>
			{#if weatherStr()}
				<span class="ha-nav__clock-weather"> • {weatherStr()}</span>
			{/if}
		</div>
	</div>

	<!-- ── Page / extra items ──────────────────────────────────────────── -->
	<ul class="ha-nav__list" role="list">
		{#each orderedItems() as entry (entry.id)}
			{#if entry.type === 'page'}
				{@const page = pageMap.get(entry.id)}
				{#if page}
					{@const isActive = currentPageId === page.id}
					{@const badge   = badgeMap.get(page.id)}
					<li class="ha-nav__item" class:ha-nav__item--editing={editing}>
						<button
							class="ha-nav__link"
							class:ha-nav__link--active={isActive}
							onclick={() => navigate(page.id)}
							aria-current={isActive ? 'page' : undefined}
						>
							<span class="ha-nav__icon-wrap">
								<Icon name={page.icon} size={iconSize} />
								{#if badge}
									<span class="ha-nav__badge" aria-hidden="true"></span>
								{/if}
							</span>
							{#if nav.showLabels}
								<span class="ha-nav__label">{page.name}</span>
							{/if}
						</button>
						{#if editing}
							<button
								class="ha-nav__page-edit"
								onclick={(e) => { e.stopPropagation(); editMode.openPageEditor(page.id); }}
								title="Edit page"
								aria-label="Edit page {page.name}"
							>
								<Icon name="pencil" size={11} strokeWidth={2} />
							</button>
						{/if}
					</li>
				{/if}

			{:else if entry.type === 'extra'}
				{@const extra = extraMap.get(entry.id)}
				{#if extra}
					{#if extra.type === 'divider'}
						<li class="ha-nav__divider" role="separator"></li>

					{:else if extra.type === 'label'}
						<li class="ha-nav__section-label">{extra.text}</li>

					{:else if extra.type === 'url'}
						<li class="ha-nav__item">
							<a
								class="ha-nav__link"
								href={extra.url}
								target={extra.newTab ? '_blank' : undefined}
								rel={extra.newTab ? 'noopener noreferrer' : undefined}
							>
								<span class="ha-nav__icon-wrap">
									<Icon name={extra.icon} size={iconSize} />
								</span>
								{#if nav.showLabels}
									<span class="ha-nav__label">{extra.label}</span>
								{/if}
							</a>
						</li>
					{/if}
				{/if}
			{/if}
		{/each}
		<!-- Pinned entities (inline with pages) -->
		{#if favorites.showInNav && favoriteEntities.length > 0}
			<li class="ha-nav__divider" role="separator"></li>
			{#each favoriteEntities as fav (fav.id)}
				{@const entity = fav.entity}
				{@const active = entity ? isActive(entity) : false}
				{@const name   = entity ? getEntityName(entity) : fav.id.split('.')[1].replace(/_/g, ' ')}
				{@const domain = getDomain(fav.id)}
				{@const icon   = DOMAIN_ICONS[domain] ?? 'cpu'}
				<li class="ha-nav__item" class:ha-nav__item--fav={editing} class:ha-nav__item--editing={editing}>
					<button
						class="ha-nav__link ha-nav__link--fav"
						class:ha-nav__link--fav-active={active}
						onclick={() => callService(domain, 'toggle', {}, { entity_id: fav.id })}
					>
						<span class="ha-nav__icon-wrap">
							<Icon name={icon} size={iconSize} />
						</span>
						{#if nav.showLabels}
							<span class="ha-nav__label">{name}</span>
							{#if entity}
								<span class="ha-nav__fav-state">{entity.state}</span>
							{/if}
						{/if}
					</button>
					{#if editing}
						<button
							class="ha-nav__page-edit ha-nav__page-edit--remove"
							onclick={(e) => { e.stopPropagation(); unpinEntity(fav.id); }}
							title="Remove from sidebar"
						>
							<Icon name="x" size={12} strokeWidth={2.5} />
						</button>
					{/if}
				</li>
			{/each}
		{/if}

		<!-- Add page button (edit mode only) -->
		{#if editing}
			<li class="ha-nav__item">
				<button
					class="ha-nav__link ha-nav__link--add"
					onclick={addPage}
					title="Add new page"
				>
					<span class="ha-nav__icon-wrap">
						<Icon name="plus" size={iconSize} />
					</span>
					{#if nav.showLabels}
						<span class="ha-nav__label">Add page</span>
					{/if}
				</button>
			</li>
		{/if}
	</ul>
	<!-- ── Footer: connection status ───────────────────────────────────── -->
	{#if nav.showConnectionStatus}
		<div class="ha-nav__footer">
			<span
				class="ha-nav__conn-dot"
				class:ha-nav__conn-dot--connected={connStatus === 'connected'}
				class:ha-nav__conn-dot--connecting={connStatus === 'connecting'}
				class:ha-nav__conn-dot--error={connStatus === 'error'}
				aria-label="Connection: {connStatus}"
			></span>
			<span class="ha-nav__conn-label">{connStatus}</span>
		</div>
	{/if}
</nav>

<style>
	.ha-nav {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		transition: width var(--transition);
	}

	/* ── Clock ───────────────────────────────────────────────────────────── */
	.ha-nav__clock {
		position: relative;
		padding: 24px 16px 16px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.ha-nav__clock-time {
		font-size: 4rem;
		font-weight: 500;
		letter-spacing: -0.06em;
		line-height: 1;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
	}

	.ha-nav__clock-sub {
		display: flex;
		align-items: center;
		padding-left: 2px;
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ha-nav__clock-date {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	.ha-nav__clock-weather {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	/* ── Item list ───────────────────────────────────────────────────────── */
	.ha-nav__list {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 8px 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.ha-nav__item {
		list-style: none;
	}

	.ha-nav__link {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px 8px;
		border-radius: var(--radius);
		color: var(--fg-muted);
		font-size: 0.875rem;
		font-weight: 500;
		transition: background-color var(--transition), color var(--transition);
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
	}
	.ha-nav__link:hover {
		background-color: var(--hover);
		color: var(--fg);
	}
	.ha-nav__link--active {
		background-color: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
	}
	.ha-nav__link--active:hover {
		background-color: color-mix(in srgb, var(--accent) 18%, transparent);
	}

	/* ── Icon + badge ────────────────────────────────────────────────────── */
	.ha-nav__icon-wrap {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.ha-nav__badge {
		position: absolute;
		top: -3px;
		right: -3px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background-color: var(--accent);
		border: 1.5px solid var(--bg-elevated);
	}

	.ha-nav__label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Divider / label ─────────────────────────────────────────────────── */
	.ha-nav__divider {
		height: 1px;
		background-color: var(--border);
		margin: 6px 8px;
	}

	.ha-nav__section-label {
		padding: 8px 10px 2px;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Add page nav item ───────────────────────────────────────────────── */
	.ha-nav__link--add {
		border: 1px dashed color-mix(in srgb, var(--accent) 40%, transparent);
		color: var(--accent);
		margin-top: 4px;
	}

	.ha-nav__link--add:hover {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border-color: var(--accent);
	}

	/* ── Edit mode: per-page edit button ─────────────────────────────────── */
	.ha-nav__item--editing {
		position: relative;
		display: flex;
		align-items: center;
	}

	.ha-nav__item--editing .ha-nav__link {
		flex: 1;
		padding-right: 28px; /* room for edit btn */
	}

	.ha-nav__page-edit {
		position: absolute;
		right: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		opacity: 0;
		transition: opacity var(--transition), background-color var(--transition), color var(--transition);
		flex-shrink: 0;
	}

	.ha-nav__item--editing:hover .ha-nav__page-edit {
		opacity: 1;
	}

	.ha-nav__page-edit:hover {
		background: var(--hover);
		color: var(--accent);
	}


	/* ── Footer ──────────────────────────────────────────────────────────── */
	.ha-nav__footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-top: 1px solid var(--border);
	}

	.ha-nav__conn-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
		background-color: var(--fg-subtle);
		transition: background-color var(--transition);
	}
	.ha-nav__conn-dot--connected  { background-color: var(--color-on); }
	.ha-nav__conn-dot--connecting { background-color: var(--color-warning); animation: pulse 1.5s ease-in-out infinite; }
	.ha-nav__conn-dot--error      { background-color: var(--color-danger); }

	.ha-nav__conn-label {
		font-size: 0.75rem;
		color: var(--fg-subtle);
		text-transform: capitalize;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50%       { opacity: 0.4; }
	}

	/* ── Pinned entity items ──────────────────────────────────────────────── */
	.ha-nav__link--fav { color: var(--fg-muted); }
	.ha-nav__link--fav:hover { background-color: var(--hover); color: var(--fg); }
	.ha-nav__link--fav-active {
		color: var(--color-on);
		background-color: color-mix(in srgb, var(--color-on) 10%, transparent);
	}
	.ha-nav__link--fav-active:hover {
		background-color: color-mix(in srgb, var(--color-on) 16%, transparent);
	}

	.ha-nav__fav-state {
		font-size: 0.6875rem;
		color: var(--fg-subtle);
		margin-left: auto;
		flex-shrink: 0;
		white-space: nowrap;
	}

	/* Remove button on pinned entities — always shown, fades unless hovered */
	.ha-nav__item--fav {
		position: relative;
		display: flex;
		align-items: center;
	}
	.ha-nav__item--fav .ha-nav__link {
		flex: 1;
		padding-right: 28px;
	}
	.ha-nav__item--fav .ha-nav__page-edit--remove {
		position: absolute;
		right: 4px;
		opacity: 0;
		transition: opacity var(--transition), background-color var(--transition), color var(--transition);
	}
	.ha-nav__item--fav:hover .ha-nav__page-edit--remove {
		opacity: 1;
	}
	.ha-nav__page-edit--remove {
		color: var(--fg-subtle);
	}
	.ha-nav__page-edit--remove:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
	}

</style>
