<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — NavSettings.svelte
	// Navigation style, toggles, mobile behaviour, sidebar entities.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { generateId } from '$lib/utils/uuid';
	import type { NavConfig, NavHeroEntity, ThemeScheduleMode } from '$lib/types/dashboard';
	import { THEME_PRESETS } from '$lib/themes/presets';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName } from '$lib/ha/entities';

	let root = $derived($dashboardStore);
	let cfg = $derived(root.nav);
	let display = $derived(root.display);
	let pages = $derived(root.pages);
	let schedule = $derived(display.themeSchedule);
	let favorites = $derived(root.favorites);
let allEntities = $derived(Object.values($entities));
let mobileStyle = $derived(cfg.mobileStyle);

	function set(patch: Partial<NavConfig>) {
		dashboardStore.setNav(patch);
	}

	function addHeroEntity() {
		const next = [...(cfg.heroEntities ?? []), {
			id: generateId(),
			entityId: '',
			label: '',
			showOnDesktop: true,
			showOnMobile: true
		}];
		set({ heroEntities: next });
	}

	function updateHeroEntity(id: string, patch: Partial<NavHeroEntity>) {
		const next = (cfg.heroEntities ?? []).map(h => h.id === id ? { ...h, ...patch } : h);
		set({ heroEntities: next });
	}

	function removeHeroEntity(id: string) {
		set({ heroEntities: (cfg.heroEntities ?? []).filter(h => h.id !== id) });
	}

	// ── Favorites (inline) ──────────────────────────────────────────────────
	let favSearchQuery = $state('');
	const favFiltered = $derived(
		favSearchQuery.trim()
			? allEntities.filter((e) => {
					const q = favSearchQuery.toLowerCase();
					return (
						e.entity_id.toLowerCase().includes(q) ||
						getEntityName(e).toLowerCase().includes(q)
					);
				})
			: allEntities
	);
	const favDisplayList = $derived(favFiltered.slice(0, 80));
	function isFavorite(entityId: string): boolean {
		return favorites.entityIds.includes(entityId);
	}
</script>

<div class="ns">

	<!-- Startup / gestures -->
	<div class="ns__group">
		<span class="s-label">Behavior</span>

		<div class="ns__group">
			<span class="ns__sub-label">Default page</span>
			<select
				class="ns__select"
				value={display.defaultPageId ?? ''}
				onchange={(e) => dashboardStore.setDisplay({
					defaultPageId: (e.target as HTMLSelectElement).value || undefined
				})}
			>
				<option value="">First page</option>
				{#each pages as page}
					<option value={page.id}>{page.name}</option>
				{/each}
			</select>
		</div>

		<div class="ns__toggle-row">
			<div class="ns__toggle-info">
				<span class="ns__toggle-label">Swipe navigation</span>
				<span class="ns__toggle-desc">Horizontal swipe gestures to change pages</span>
			</div>
			<Toggle
				checked={display.swipeNavigation}
				onchange={(v) => dashboardStore.setDisplay({ swipeNavigation: v })}
				label="Swipe navigation"
			/>
		</div>
	</div>

	<!-- Theme schedule (kept here per your current "Display → Navigation" grouping) -->
	<div class="ns__group">
		<div class="ns__group-header">
			<span class="s-label">Theme schedule</span>
			<Toggle
				checked={schedule.enabled}
				onchange={(v) => dashboardStore.setThemeSchedule({ enabled: v })}
				label="Enable theme schedule"
			/>
		</div>

		{#if schedule.enabled}
			<div class="ns__pills">
				{#each [['sun','Based on sun position'],['time','Based on clock time']] as [val, label]}
					<button
						class="ns__pill"
						class:ns__pill--active={schedule.mode === val}
						onclick={() => dashboardStore.setThemeSchedule({ mode: val as ThemeScheduleMode })}
					>{label}</button>
				{/each}
			</div>

			{#if schedule.mode === 'time'}
				<div class="ns__row">
					<div class="ns__field">
						<label class="ns__field-label" for="sched-day-start">Day starts at</label>
						<input
							id="sched-day-start"
							class="ns__input"
							type="time"
							value={schedule.dayStart ?? '07:00'}
							onchange={(e) => dashboardStore.setThemeSchedule({ dayStart: (e.target as HTMLInputElement).value })}
						/>
					</div>
					<div class="ns__field">
						<label class="ns__field-label" for="sched-night-start">Night starts at</label>
						<input
							id="sched-night-start"
							class="ns__input"
							type="time"
							value={schedule.nightStart ?? '20:00'}
							onchange={(e) => dashboardStore.setThemeSchedule({ nightStart: (e.target as HTMLInputElement).value })}
						/>
					</div>
				</div>
			{:else}
				<div class="ns__field">
					<label class="ns__field-label" for="sched-sun">Sun entity</label>
					<input
						id="sched-sun"
						class="ns__input"
						type="text"
						value={schedule.sunEntityId}
						oninput={(e) => dashboardStore.setThemeSchedule({ sunEntityId: (e.target as HTMLInputElement).value })}
					/>
				</div>
				<div class="ns__row">
					<div class="ns__field ns__field--grow">
						<label class="ns__field-label" for="sched-day-offset">Day offset (min after sunrise)</label>
						<input
							id="sched-day-offset"
							class="ns__input ns__input--num"
							type="number"
							value={schedule.dayOffset}
							oninput={(e) => dashboardStore.setThemeSchedule({ dayOffset: parseInt((e.target as HTMLInputElement).value) || 0 })}
						/>
					</div>
					<div class="ns__field ns__field--grow">
						<label class="ns__field-label" for="sched-night-offset">Night offset (min after sunset)</label>
						<input
							id="sched-night-offset"
							class="ns__input ns__input--num"
							type="number"
							value={schedule.nightOffset}
							oninput={(e) => dashboardStore.setThemeSchedule({ nightOffset: parseInt((e.target as HTMLInputElement).value) || 0 })}
						/>
					</div>
				</div>
			{/if}

			<div class="ns__row">
				<div class="ns__field ns__field--grow">
					<label class="ns__field-label" for="sched-day-preset">Day theme</label>
					<select
						id="sched-day-preset"
						class="ns__select"
						value={schedule.dayPresetId}
						onchange={(e) => dashboardStore.setThemeSchedule({ dayPresetId: (e.target as HTMLSelectElement).value })}
					>
						{#each THEME_PRESETS as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
				<div class="ns__field ns__field--grow">
					<label class="ns__field-label" for="sched-night-preset">Night theme</label>
					<select
						id="sched-night-preset"
						class="ns__select"
						value={schedule.nightPresetId}
						onchange={(e) => dashboardStore.setThemeSchedule({ nightPresetId: (e.target as HTMLSelectElement).value })}
					>
						{#each THEME_PRESETS as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	</div>

	<!-- Header title -->
	<div class="ns__group">
		<span class="s-label">Drawer header title</span>
		<input
			class="ns__input"
			type="text"
			placeholder="Stratum"
			value={cfg.headerTitle ?? ''}
			oninput={(e) => set({ headerTitle: (e.target as HTMLInputElement).value || undefined })}
		/>
	</div>

	<!-- Toggles -->
	<div class="ns__group">
		<span class="s-label">Options</span>

		{#each [
			['showLabels',           'Show labels',           'Show page names next to icons (desktop)'],
			['showLabelsOnMobile',   'Show labels on mobile', mobileStyle === 'bottom-bar' ? 'Show page names in the mobile bottom bar' : 'Show page names in the mobile drawer'],
			['showMobileClock',      'Mobile header clock',   'Show the large time (clock) line at the top of the page on mobile'],
			['showConnectionStatus', 'Connection status',     'Show HA connection indicator'],
		] as [key, label, desc]}
			<div class="ns__toggle-row">
				<div class="ns__toggle-info">
					<span class="ns__toggle-label">{label}</span>
					<span class="ns__toggle-desc">{desc}</span>
				</div>
				<Toggle
					checked={cfg[key as keyof NavConfig] as boolean}
					onchange={(v) => set({ [key]: v })}
					label={label}
				/>
			</div>
		{/each}

	</div>

	<!-- Mobile style -->
	<div class="ns__group">
		<span class="s-label">Mobile navigation</span>
		<div class="ns__pills">
			{#each [['bottom-bar','Bottom bar'],['drawer','Drawer'],['hidden','Hidden']] as [val, label]}
				<button
					type="button"
					class="ns__pill"
					class:ns__pill--active={cfg.mobileStyle === val}
					onclick={() => set({ mobileStyle: val as NavConfig['mobileStyle'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Mobile breakpoint -->
	<div class="ns__group">
		<span class="s-label">Mobile breakpoint (px)</span>
		<input
			class="ns__input ns__input--num"
			type="number"
			min="320"
			max="1280"
			value={cfg.mobileBreakpoint}
			oninput={(e) => set({ mobileBreakpoint: parseInt((e.target as HTMLInputElement).value) || 768 })}
			style="width: 100px"
		/>
	</div>

	<!-- Sidebar entities -->
	<div class="ns__group">
		<div class="ns__group-header">
			<span class="s-label">Sidebar entities</span>
			<button class="ns__add-btn" onclick={addHeroEntity}>
				<Icon name="plus" size={13} strokeWidth={2.5} />
				Add entity
			</button>
		</div>
		<span class="ns__group-hint">Entities shown below the clock in the sidebar and mobile header.</span>

		{#each (cfg.heroEntities ?? []) as hero (hero.id)}
			<div class="ns__hero-card">
				<div class="ns__hero-top">
					<input
						class="ns__input ns__input--flex"
						type="text"
						placeholder="entity_id (e.g. sensor.temp)"
						value={hero.entityId}
						oninput={(e) => updateHeroEntity(hero.id, { entityId: (e.target as HTMLInputElement).value.trim() })}
					/>
					<button class="ns__remove-btn" onclick={() => removeHeroEntity(hero.id)} title="Remove">
						<Icon name="x" size={14} strokeWidth={2.5} />
					</button>
				</div>
				<input
					class="ns__input"
					type="text"
					placeholder="Custom label (optional)"
					value={hero.label ?? ''}
					oninput={(e) => updateHeroEntity(hero.id, { label: (e.target as HTMLInputElement).value || undefined })}
				/>
				<div class="ns__hero-visibility">
					<button
						class="ns__vis-pill"
						class:ns__vis-pill--active={hero.showOnDesktop}
						onclick={() => updateHeroEntity(hero.id, { showOnDesktop: !hero.showOnDesktop })}
					>Desktop</button>
					<button
						class="ns__vis-pill"
						class:ns__vis-pill--active={hero.showOnMobile}
						onclick={() => updateHeroEntity(hero.id, { showOnMobile: !hero.showOnMobile })}
					>Mobile</button>
				</div>
			</div>
		{/each}
	</div>

	<!-- Favorites -->
	<div class="fs">
		<div class="fs__group">
			<span class="s-label">Favorites</span>

			<div class="fs__toggle-row">
				<div class="fs__toggle-info">
					<span class="fs__toggle-label">Show in header</span>
					<span class="fs__toggle-desc">Render a favorites row below the header bar</span>
				</div>
				<Toggle
					checked={favorites.showInHeader}
					onchange={(v) => dashboardStore.setFavorites({ showInHeader: v })}
					label="Show in header"
				/>
			</div>

			<div class="fs__toggle-row">
				<div class="fs__toggle-info">
					<span class="fs__toggle-label">Show in navigation</span>
					<span class="fs__toggle-desc">Pin a favorites section at the bottom of the nav</span>
				</div>
				<Toggle
					checked={favorites.showInNav}
					onchange={(v) => dashboardStore.setFavorites({ showInNav: v })}
					label="Show in nav"
				/>
			</div>
		</div>

		{#if favorites.entityIds.length > 0}
			<div class="fs__group">
				<span class="s-label">Favorited ({favorites.entityIds.length})</span>
				<div class="fs__chips">
					{#each favorites.entityIds as id}
						<span class="fs__chip">
							{id}
							<button
								class="fs__chip-remove"
								onclick={() => dashboardStore.toggleFavorite(id)}
								aria-label="Remove {id} from favorites"
							>
								<Icon name="x" size={11} />
							</button>
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<div class="fs__group">
			<span class="s-label">Search entities</span>
			<div class="fs__search-wrap">
				<Icon name="search" size={14} />
				<input
					class="fs__search"
					type="text"
					placeholder="Search by name or entity ID…"
					bind:value={favSearchQuery}
				/>
				{#if favSearchQuery}
					<button class="fs__search-clear" onclick={() => (favSearchQuery = '')}>
						<Icon name="x" size={13} />
					</button>
				{/if}
			</div>
		</div>

		<div class="fs__list">
			{#if allEntities.length === 0}
				<div class="fs__empty">
					<Icon name="wifi-off" size={20} />
					<span>No entities available. Connect to Home Assistant first.</span>
				</div>
			{:else if favDisplayList.length === 0}
				<div class="fs__empty">
					<Icon name="search" size={20} />
					<span>No entities match your search.</span>
				</div>
			{:else}
				{#each favDisplayList as entity}
					{@const fav = isFavorite(entity.entity_id)}
					<div class="fs__item" class:fs__item--fav={fav}>
						<div class="fs__item-info">
							<span class="fs__item-name">{getEntityName(entity)}</span>
							<span class="fs__item-id">{entity.entity_id}</span>
						</div>
						<button
							class="fs__star"
							class:fs__star--active={fav}
							onclick={() => dashboardStore.toggleFavorite(entity.entity_id)}
							aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
							title={fav ? 'Remove from favorites' : 'Add to favorites'}
						>
							<Icon name={fav ? 'star' : 'star-off'} size={15} />
						</button>
					</div>
				{/each}
				{#if favFiltered.length > 80}
					<div class="fs__more">
						+{favFiltered.length - 80} more — refine your search
					</div>
				{/if}
			{/if}
		</div>
	</div>

</div>

<style>
	.ns {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ns__sub-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fg-muted);
		margin-bottom: 2px;
	}

	.ns__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ns__group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ns__group-hint {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
		margin-top: -2px;
	}

	.ns__add-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}

	.ns__add-btn:hover {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ns__hero-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.ns__hero-top {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.ns__input--flex {
		flex: 1;
		width: auto;
	}

	.ns__remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}

	.ns__remove-btn:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
	}

	.ns__hero-visibility {
		display: flex;
		gap: 5px;
	}

	.ns__vis-pill {
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 0.73rem;
		font-weight: 500;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-subtle);
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.ns__vis-pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ns__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.ns__pill {
		padding: 5px 12px;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 500;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.ns__pill:hover { color: var(--fg); border-color: var(--fg-muted); }

	.ns__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ns__input {
		padding: 7px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		box-sizing: border-box;
		width: 100%;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ns__select {
		padding: 7px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		cursor: pointer;
		box-sizing: border-box;
		width: 100%;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ns__select:focus {
		border-color: var(--accent);
		outline: none;
	}

	.ns__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	.ns__input--num {
		text-align: center;
	}

	.ns__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.ns__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ns__toggle-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg);
	}

	.ns__toggle-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}

	.ns__row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.ns__field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ns__field--grow { flex: 1; min-width: 120px; }

	.ns__field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fg-muted);
	}

	/* ── Favorites (inline) ─────────────────────────────────────────────── */

	.fs {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.fs__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.fs__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.fs__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.fs__toggle-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg);
	}

	.fs__toggle-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}

	.fs__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.fs__chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px 3px 9px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		font-size: 0.73rem;
		font-weight: 500;
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.fs__chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		background: transparent;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
	}

	.fs__chip-remove:hover {
		background: color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.fs__search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-subtle);
	}

	.fs__search {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		color: var(--fg);
		font-size: 0.875rem;
	}

	.fs__search-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		padding: 0;
	}

	.fs__search-clear:hover {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.fs__list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.fs__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 18px 10px;
		color: var(--fg-subtle);
		font-size: 0.83rem;
		text-align: center;
		border-radius: var(--radius-sm);
		border: 1px dashed var(--border);
		background: color-mix(in srgb, var(--surface) 60%, transparent);
	}

	.fs__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.fs__item--fav {
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		background: color-mix(in srgb, var(--accent) 5%, var(--surface));
	}

	.fs__item-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.fs__item-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fs__item-id {
		font-size: 0.72rem;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.fs__star {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-subtle);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition), border-color var(--transition);
		flex-shrink: 0;
	}

	.fs__star:hover {
		color: var(--fg);
		border-color: var(--fg-muted);
	}

	.fs__star--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.fs__more {
		font-size: 0.75rem;
		color: var(--fg-subtle);
		text-align: center;
		padding: 6px 0 0;
	}
</style>
