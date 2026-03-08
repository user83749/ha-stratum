<script lang="ts">
	import { generateId } from '$lib/utils/uuid';
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId } from '$lib/stores/ui';
	import { connectionStatus, entities } from '$lib/ha/websocket';
	import { isEditing, editMode } from '$lib/stores/editMode';
	import { undoStore } from '$lib/stores/undoStore';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { callService } from '$lib/ha/services';
	import { getDomain, getEntityName, isActive } from '$lib/ha/entities';
	import type { Page } from '$lib/types/dashboard';
	import { VISIBLE_ALL } from '$lib/types/dashboard';

	const cfg = $derived($dashboardStore);
	const nav = $derived(cfg.nav);
	const settings = $derived(cfg.settings);
	const pages = $derived(cfg.pages);
	const favorites = $derived(cfg.favorites);
	const currentPageId = $derived($activePageId);
	const editing = $derived($isEditing);
	const connStatus = $derived($connectionStatus);

	const DOMAIN_ICONS: Record<string, string> = {
		light: 'lightbulb',
		switch: 'toggle-right',
		sensor: 'activity',
		binary_sensor: 'radio',
		climate: 'thermometer',
		media_player: 'music',
		cover: 'chevrons-up-down',
		lock: 'lock',
		fan: 'fan',
		camera: 'video',
		scene: 'sparkles',
		script: 'play',
		automation: 'zap',
		person: 'user',
		device_tracker: 'user',
		input_boolean: 'toggle-right',
		input_number: 'sliders-horizontal',
		input_select: 'list',
		timer: 'timer',
		vacuum: 'circle-dot',
		weather: 'cloud-sun',
		alarm_control_panel: 'shield',
		update: 'download',
		valve: 'droplets',
		remote: 'remote'
	};

	const pageMap = $derived(new Map(pages.map((page) => [page.id, page])));
	const badgeMap = $derived(new Map(nav.badges.map((badge) => [badge.pageId, badge])));
	const favoriteEntities = $derived(
		favorites.entityIds.map((id) => ({
			id,
			entity: $entities[id] ?? null
		}))
	);

	const orderedPageIds = $derived.by(() => {
		const ordered = nav.order
			.filter((entry): entry is { type: 'page'; id: string } => entry.type === 'page')
			.map((entry) => entry.id)
			.filter((id, index, arr) => arr.indexOf(id) === index && pageMap.has(id));

		if (ordered.length === 0) return pages.map((page) => page.id);
		const missing = pages.map((page) => page.id).filter((id) => !ordered.includes(id));
		return [...ordered, ...missing];
	});

	// If there is only one page, don't render the page list on desktop.
	// (Favorites can still render below.)
	const showPageNav = $derived(editing || pages.length > 1);

	function navigate(pageId: string) {
		uiStore.navigateTo(pageId);
	}

	function unpinEntity(entityId: string) {
		dashboardStore.toggleFavorite(entityId);
	}

	function toggleFavoriteEntity(entityId: string) {
		const domain = getDomain(entityId);
		callService(domain, 'toggle', {}, { entity_id: entityId }).catch(() => {});
	}

	function addPage() {
		const current = get(dashboardStore);
		undoStore.push(current);
		const newId = generateId();
		const newPage: Page = {
			id: newId,
			name: 'New Room',
			icon: 'file',
			layout: 'default',
			background: { type: 'none' },
			navVisibility: { ...VISIBLE_ALL },
			adminOnly: false,
			sections: [],
			transition: 'none'
		};
		dashboardStore.addPage(newPage);
		uiStore.navigateTo(newId);
		editMode.openPageEditor(newId);
	}

	let clockTime = $state('');
	let clockDate = $state('');
	let clockTimer: ReturnType<typeof setInterval> | null = null;

	function updateClock() {
		const now = new Date();
		const locale = settings.locale || undefined;
		const hour12 = settings.timeFormat === '12h';
		clockTime = now
			.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12 })
			.replace(/\s?[AP]M/i, '');
		clockDate = now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
	}

	const weatherEntity = $derived(
		$entities['weather.forecast_home'] ??
		Object.values($entities).find(e => e.entity_id.startsWith('weather.'))
	);
	const weatherStr = $derived.by(() => {
		if (!weatherEntity || weatherEntity.state === 'unknown' || weatherEntity.state === 'unavailable') {
			return null;
		}
		const feelsLike = weatherEntity.attributes?.apparent_temperature ?? weatherEntity.attributes?.temperature;
		const temp = Math.round(Number(feelsLike || 0));
		const condition = weatherEntity.state.replace(/-/g, ' ');
		const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
		return `Feels like ${temp}° — ${capitalizedCondition}`;
	});

	const desktopHeroEntities = $derived(
		(nav.heroEntities ?? []).filter(h => h.showOnDesktop)
	);

	onMount(() => {
		updateClock();
		clockTimer = setInterval(updateClock, 1000);
	});

	onDestroy(() => {
		if (clockTimer) clearInterval(clockTimer);
	});
</script>

<nav class="rail" aria-label="Dashboard information">
	<div class="rail__hero" aria-live="off">
		<div class="rail__time">{clockTime}</div>
		<div class="rail__date">{clockDate}</div>
		{#if weatherStr}
			<div class="rail__weather">{weatherStr}</div>
		{/if}
		{#each desktopHeroEntities as hero (hero.id)}
			{@const ent = $entities[hero.entityId]}
			{@const state = ent?.state ?? '—'}
			{@const unit = ent?.attributes?.unit_of_measurement ?? ''}
			{@const label = hero.label || ent?.attributes?.friendly_name || hero.entityId}
			<div class="rail__hero-entity">
				<span class="rail__hero-entity__label">{label}</span>
				<span class="rail__hero-entity__value">{state}{unit}</span>
			</div>
		{/each}
	</div>

	<div class="rail__nav" aria-label="Pages">
		<ul class="rail__list" role="list">
			{#if showPageNav}
				{#each orderedPageIds as pageId (pageId)}
					{@const page = pageMap.get(pageId)}
					{#if page}
						{@const active = currentPageId === page.id}
						{@const badge = badgeMap.get(page.id)}
						<li class="rail__item">
							<div class="rail__row" class:rail__row--editing={editing}>
								<button
									class="rail__link"
									class:rail__link--active={active}
									onclick={() => navigate(page.id)}
									data-page-drop-id={page.id}
									aria-current={active ? 'page' : undefined}
									aria-label={page.name}
									title={!nav.showLabels ? page.name : undefined}
								>
									<span class="rail__icon">
										<Icon name={page.icon} />
										{#if badge}
											<span class="rail__badge" aria-hidden="true"></span>
										{/if}
									</span>
									{#if nav.showLabels}
										<span class="rail__label">{page.name}</span>
									{/if}
								</button>
								{#if editing}
									<button
										class="rail__edit-btn"
										onclick={(event) => { event.stopPropagation(); editMode.openPageEditor(page.id); }}
										title="Edit room"
										aria-label={`Edit room ${page.name}`}
									>
										<Icon name="pencil" size={12} />
									</button>
								{/if}
							</div>
						</li>
					{/if}
				{/each}
			{/if}

			{#if favorites.showInNav && favoriteEntities.length > 0}
				{#if showPageNav}<li class="rail__divider" aria-hidden="true"></li>{/if}
				{#each favoriteEntities as fav (fav.id)}
					{@const entity = fav.entity}
					{@const active = entity ? isActive(entity) : false}
					{@const name = entity ? getEntityName(entity) : fav.id.split('.')[1].replace(/_/g, ' ')}
					{@const domain = getDomain(fav.id)}
					{@const icon = DOMAIN_ICONS[domain] ?? 'cpu'}
					<li class="rail__item">
						<div class="rail__row" class:rail__row--editing={editing}>
							<button
								class="rail__link rail__link--fav"
								class:rail__link--fav-active={active}
								onclick={() => toggleFavoriteEntity(fav.id)}
								aria-label={name}
								title={!nav.showLabels ? name : undefined}
							>
								<span class="rail__icon"><Icon name={icon} /></span>
								{#if nav.showLabels}
									<span class="rail__label">{name}</span>
								{/if}
								{#if entity}
									<span class="rail__state">{entity.state}</span>
								{/if}
							</button>
							{#if editing}
								<button
									class="rail__edit-btn rail__edit-btn--danger"
									onclick={(event) => { event.stopPropagation(); unpinEntity(fav.id); }}
									title="Remove from sidebar"
									aria-label={`Remove ${name} from sidebar`}
								>
									<Icon name="x" size={12} />
								</button>
							{/if}
						</div>
					</li>
				{/each}
			{/if}

			{#if editing}
				<li class="rail__item">
					<button class="rail__link rail__link--add" onclick={addPage}>
						<span class="rail__icon"><Icon name="plus" /></span>
						{#if nav.showLabels}
							<span class="rail__label">Add room</span>
						{/if}
					</button>
				</li>
			{/if}
		</ul>
	</div>

	{#if nav.showConnectionStatus}
		<div class="rail__footer">
			<span
				class="rail__conn-dot"
				class:rail__conn-dot--connected={connStatus === 'connected'}
				class:rail__conn-dot--connecting={connStatus === 'connecting'}
				class:rail__conn-dot--error={connStatus === 'error'}
				aria-label={`Connection: ${connStatus}`}
			></span>
			<span class="rail__conn-label">{connStatus}</span>
		</div>
	{/if}
</nav>

<style>
	.rail {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		padding: var(--rail-pad-top) 0 var(--rail-pad-bottom) var(--rail-pad-left);
		font-size: var(--rail-body-size);
		line-height: var(--rail-body-line);
		color: var(--fg);
		background: transparent;
	}

	.rail__hero {
		display: flex;
		flex-direction: column;
		gap: var(--rail-hero-gap);
		padding: var(--rail-hero-top) 0 var(--rail-hero-bottom);
		width: 100%;
	}

	.rail__time {
		font-size: var(--rail-time-size);
		font-weight: 440;
		line-height: var(--rail-time-line);
		margin-bottom: clamp(10px, 0.7vw, 14px);
		letter-spacing: -0.05em;
		font-variant-numeric: tabular-nums;
	}

	.rail__date {
		max-width: 100%;
		font-size: var(--rail-date-size);
		font-weight: 540;
		line-height: 1.2;
		color: color-mix(in srgb, var(--fg) 34%, transparent);
		text-wrap: normal;
	}

	.rail__weather {
		padding-top: var(--rail-weather-top);
		max-width: clamp(11ch, calc(var(--rail-width) * 0.58), 18ch);
		font-size: var(--rail-weather-size);
		font-weight: 200;
		line-height: 1.25;
		color: color-mix(in srgb, var(--fg) 24%, transparent);
	}

	.rail__hero-entity {
		padding-top: 6px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.rail__hero-entity__label {
		font-size: var(--rail-weather-size);
		font-weight: 200;
		color: color-mix(in srgb, var(--fg) 24%, transparent);
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rail__hero-entity__value {
		font-size: var(--rail-date-size);
		font-weight: 540;
		color: color-mix(in srgb, var(--fg) 54%, transparent);
		line-height: 1.2;
	}

	.rail__nav {
		margin-top: auto;
		padding-top: var(--rail-nav-top);
		min-height: 0;
	}

	.rail__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--rail-list-gap);
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
	}

	.rail__item {
		position: relative;
		list-style: none;
	}

	.rail__row {
		position: relative;
		display: flex;
		align-items: center;
	}

	.rail__link {
		position: relative;
		display: grid;
		grid-template-columns: var(--rail-icon-size) minmax(0, 1fr);
		align-items: center;
		gap: var(--rail-link-gap);
		width: 100%;
		padding: var(--rail-link-pad-y) 0;
		background: transparent;
		border: 0;
		border-radius: 0;
		color: color-mix(in srgb, var(--fg) 42%, transparent);
		font-size: var(--rail-nav-size);
		font-weight: 520;
		line-height: 1.15;
		text-align: left;
		text-decoration: none;
		transition: color var(--transition);
	}

	.rail__row--editing .rail__link {
		padding-right: calc(var(--rail-icon-size) + 8px);
	}

	.rail__link:hover {
		color: color-mix(in srgb, var(--fg) 62%, transparent);
	}

	.rail__link--active {
		color: color-mix(in srgb, var(--fg) 88%, transparent);
	}

	.rail__link--active::before {
		content: '';
		position: absolute;
		left: calc(var(--rail-active-offset) * -1);
		top: 50%;
		width: 1px;
		height: var(--rail-active-height);
		transform: translateY(-50%);
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg) 28%, transparent);
	}

	.rail__icon {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--rail-icon-size);
		height: var(--rail-icon-size);
		font-size: var(--rail-icon-size);
		color: inherit;
		flex-shrink: 0;
	}

	.rail__badge {
		position: absolute;
		top: -2px;
		right: -2px;
		width: var(--rail-badge-size);
		height: var(--rail-badge-size);
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--bg) 92%, transparent);
	}

	.rail__label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rail__state {
		font-size: calc(var(--rail-nav-size) * 0.72);
		color: color-mix(in srgb, var(--fg) 34%, transparent);
		white-space: nowrap;
		margin-left: auto;
		flex-shrink: 0;
	}

	.rail__divider {
		height: 1px;
		background: color-mix(in srgb, var(--fg) 10%, transparent);
		margin: 2px 0;
		list-style: none;
	}

	.rail__link--fav-active {
		color: var(--color-on);
	}

	.rail__link--add {
		border-top: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
		padding-top: calc(var(--rail-link-pad-y) + 4px);
		margin-top: 2px;
	}

	.rail__edit-btn {
		position: absolute;
		right: 0;
		width: calc(var(--rail-icon-size) + 2px);
		height: calc(var(--rail-icon-size) + 2px);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 0;
		background: transparent;
		color: color-mix(in srgb, var(--fg) 32%, transparent);
		cursor: pointer;
		opacity: 0;
		transition: opacity var(--transition), color var(--transition);
	}

	.rail__row:hover .rail__edit-btn,
	.rail__row--editing .rail__edit-btn {
		opacity: 1;
	}

	.rail__edit-btn:hover { color: color-mix(in srgb, var(--fg) 70%, transparent); }
	.rail__edit-btn--danger:hover { color: var(--color-danger); }

	.rail__footer {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: calc(var(--rail-link-pad-y) + 2px) 0 0;
		margin-top: auto;
		color: color-mix(in srgb, var(--fg) 34%, transparent);
		font-size: calc(var(--rail-nav-size) * 0.74);
	}

	.rail__conn-dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg) 22%, transparent);
		flex-shrink: 0;
	}

	.rail__conn-dot--connected { background: var(--color-on); }
	.rail__conn-dot--connecting { background: var(--color-warning); }
	.rail__conn-dot--error { background: var(--color-danger); }
</style>
