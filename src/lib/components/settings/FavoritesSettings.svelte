<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — FavoritesSettings.svelte
	// Entity search + star/unstar favorites.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName } from '$lib/ha/entities';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let cfg = $derived($dashboardStore.favorites);
	let allEntities = $derived(Object.values($entities));

	let searchQuery = $state('');

	const filtered = $derived(
		searchQuery.trim()
			? allEntities.filter((e) => {
					const q = searchQuery.toLowerCase();
					return (
						e.entity_id.toLowerCase().includes(q) ||
						getEntityName(e).toLowerCase().includes(q)
					);
				})
			: allEntities
	);

	const displayList = $derived(
		filtered.slice(0, 80)
	);

	function isFavorite(entityId: string): boolean {
		return cfg.entityIds.includes(entityId);
	}
</script>

<div class="fs">

	<!-- Toggles: show in header / nav -->
	<div class="fs__group">
		<span class="s-label">Display options</span>

		<div class="fs__toggle-row">
			<div class="fs__toggle-info">
				<span class="fs__toggle-label">Show in header</span>
				<span class="fs__toggle-desc">Render a favorites row below the header bar</span>
			</div>
			<Toggle
				checked={cfg.showInHeader}
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
				checked={cfg.showInNav}
				onchange={(v) => dashboardStore.setFavorites({ showInNav: v })}
				label="Show in nav"
			/>
		</div>
	</div>

	<!-- Favorited entities summary -->
	{#if cfg.entityIds.length > 0}
		<div class="fs__group">
			<span class="s-label">Favorited ({cfg.entityIds.length})</span>
			<div class="fs__chips">
				{#each cfg.entityIds as id}
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

	<!-- Search -->
	<div class="fs__group">
		<span class="s-label">Search entities</span>
		<div class="fs__search-wrap">
			<Icon name="search" size={14} />
			<input
				class="fs__search"
				type="text"
				placeholder="Search by name or entity ID…"
				bind:value={searchQuery}
			/>
			{#if searchQuery}
				<button class="fs__search-clear" onclick={() => (searchQuery = '')}>
					<Icon name="x" size={13} />
				</button>
			{/if}
		</div>
	</div>

	<!-- Entity list -->
	<div class="fs__list">
		{#if allEntities.length === 0}
			<div class="fs__empty">
				<Icon name="wifi-off" size={20} />
				<span>No entities available. Connect to Home Assistant first.</span>
			</div>
		{:else if displayList.length === 0}
			<div class="fs__empty">
				<Icon name="search" size={20} />
				<span>No entities match your search.</span>
			</div>
		{:else}
			{#each displayList as entity}
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
			{#if filtered.length > 80}
				<div class="fs__more">
					+{filtered.length - 80} more — refine your search
				</div>
			{/if}
		{/if}
	</div>

</div>

<style>
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

	/* ── Toggle rows ───────────────────────────────────────────────────────── */

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

	/* ── Chips ─────────────────────────────────────────────────────────────── */

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
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: transparent;
		border: none;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		opacity: 0.7;
		transition: opacity var(--transition);
	}

	.fs__chip-remove:hover { opacity: 1; }

	/* ── Search ────────────────────────────────────────────────────────────── */

	.fs__search-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.fs__search-wrap:focus-within {
		border-color: var(--accent);
		background: var(--bg-elevated);
		color: var(--fg);
	}

	.fs__search {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--fg);
		font-size: 0.875rem;
		outline: none;
	}

	.fs__search::placeholder { color: var(--fg-subtle); }

	.fs__search-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: none;
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: background-color var(--transition);
	}

	.fs__search-clear:hover { background: var(--active); }

	/* ── List ──────────────────────────────────────────────────────────────── */

	.fs__list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 380px;
		overflow-y: auto;
	}

	.fs__item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		transition: background-color var(--transition);
	}

	.fs__item:hover { background: var(--hover); }

	.fs__item--fav {
		background: color-mix(in srgb, var(--accent) 6%, transparent);
	}

	.fs__item-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.fs__item-name {
		font-size: 0.83rem;
		font-weight: 500;
		color: var(--fg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fs__item-id {
		font-size: 0.71rem;
		color: var(--fg-subtle);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fs__star {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.fs__star:hover { background: var(--hover); color: var(--color-warning); }

	.fs__star--active {
		color: var(--color-warning);
	}

	/* ── Empty / more ──────────────────────────────────────────────────────── */

	.fs__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 32px 16px;
		color: var(--fg-subtle);
		font-size: 0.82rem;
		text-align: center;
	}

	.fs__more {
		padding: 10px;
		text-align: center;
		font-size: 0.75rem;
		color: var(--fg-subtle);
	}
</style>
