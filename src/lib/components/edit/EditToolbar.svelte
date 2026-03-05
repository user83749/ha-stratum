<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — EditToolbar.svelte
	// Fixed top bar shown when edit mode is active.
	// Left:   "Edit Mode" label + Undo/Redo
	// Center: Grid-conflict warning (conditional)
	// Right:  Add Section | Add Tile | Discard | Save
	// ─────────────────────────────────────────────────────────────────────────

	import { get } from 'svelte/store';
	import { editMode } from '$lib/stores/editMode';
	import { undoStore, canUndo, canRedo } from '$lib/stores/undoStore';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getEntityName, getDomain } from '$lib/ha/entities';
	import Icon from '$lib/components/ui/Icon.svelte';

	// ── Props ──────────────────────────────────────────────────────────────────

	interface Props {
		hasConflicts?: boolean;
		onAddSection: () => void;
		onAddTile: () => void;
		onAutoFix?: () => void;
	}

	const { hasConflicts = false, onAddSection, onAddTile, onAutoFix }: Props = $props();

	// ── Entity picker (pin to nav) ─────────────────────────────────────────────

	let entityPickerOpen = $state(false);
	let entitySearch     = $state('');

	const pinnedIds = $derived(new Set($dashboardStore.favorites.entityIds));

	const pickerResults = $derived(() => {
		const q = entitySearch.trim().toLowerCase();
		const all = Object.values($entities);
		const unpinned = all.filter((e) => !pinnedIds.has(e.entity_id));
		if (!q) return unpinned.slice(0, 60);
		return unpinned
			.filter((e) =>
				e.entity_id.toLowerCase().includes(q) ||
				getEntityName(e).toLowerCase().includes(q)
			)
			.slice(0, 60);
	});

	function pinEntity(entityId: string) {
		const fav = $dashboardStore.favorites;
		if (!fav.showInNav) dashboardStore.setFavorites({ showInNav: true });
		dashboardStore.toggleFavorite(entityId);
		entitySearch = '';
	}

	function toggleEntityPicker() {
		entityPickerOpen = !entityPickerOpen;
		if (!entityPickerOpen) entitySearch = '';
	}

	function handlePickerKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') { entityPickerOpen = false; entitySearch = ''; }
	}

	// ── Derived ────────────────────────────────────────────────────────────────

	const undoDisabled = $derived(!$canUndo);
	const redoDisabled = $derived(!$canRedo);

	// ── Handlers ──────────────────────────────────────────────────────────────

	function handleUndo() {
		const current = get(dashboardStore);
		const restored = undoStore.undo(current);
		if (restored) dashboardStore.seed(restored);
	}

	function handleRedo() {
		const current = get(dashboardStore);
		const restored = undoStore.redo(current);
		if (restored) dashboardStore.seed(restored);
	}

	function handleDiscard() {
		editMode.exit();
		undoStore.clear();
	}

	function handleSave() {
		// Auto-save is already handled by dashboardStore mutations (800 ms debounce).
		// Exiting edit mode is the user-facing "done" action.
		editMode.exit();
		undoStore.clear();
	}
</script>

<header class="edit-toolbar" role="toolbar" aria-label="Edit mode toolbar">

	<!-- ── Left: label + undo/redo ─────────────────────────────────────────── -->
	<div class="toolbar__section toolbar__left">
		<span class="toolbar__edit-label">
			<Icon name="pencil" size={15} strokeWidth={2} />
			Edit Mode
		</span>

		<div class="toolbar__sep" aria-hidden="true"></div>

		<div class="toolbar__btn-group" role="group" aria-label="History">
			<button
				class="toolbar__icon-btn"
				onclick={handleUndo}
				disabled={undoDisabled}
				aria-label="Undo (Ctrl+Z)"
				title="Undo (Ctrl+Z)"
			>
				<Icon name="undo-2" size={17} strokeWidth={1.75} />
			</button>
			<button
				class="toolbar__icon-btn"
				onclick={handleRedo}
				disabled={redoDisabled}
				aria-label="Redo (Ctrl+Shift+Z)"
				title="Redo (Ctrl+Shift+Z)"
			>
				<Icon name="redo-2" size={17} strokeWidth={1.75} />
			</button>
		</div>
	</div>

	<!-- ── Center: conflict warning ────────────────────────────────────────── -->
	<div class="toolbar__section toolbar__center">
		{#if hasConflicts}
			<div class="toolbar__conflict" role="alert">
				<Icon name="triangle-alert" size={15} strokeWidth={2} />
				<span>Grid conflicts detected</span>
				{#if onAutoFix}
					<button class="toolbar__autofix-btn" onclick={onAutoFix}>Auto-fix</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ── Right: actions ──────────────────────────────────────────────────── -->
	<div class="toolbar__section toolbar__right">

		<span class="toolbar__autosave" aria-live="polite">
			<span class="toolbar__save-dot" aria-hidden="true"></span>
			Saved
		</span>

		<div class="toolbar__sep" aria-hidden="true"></div>

		<!-- Add entity to nav -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="toolbar__picker-wrap" onkeydown={handlePickerKeydown}>
			<button
				class="toolbar__btn toolbar__btn--secondary"
				class:toolbar__btn--active={entityPickerOpen}
				onclick={toggleEntityPicker}
				title="Add entity to sidebar"
			>
				<Icon name="user-plus" size={15} strokeWidth={1.75} />
				Add to Sidebar
			</button>
			{#if entityPickerOpen}
				<div class="toolbar__entity-picker">
					<div class="tep__search-wrap">
						<Icon name="search" size={13} />
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="tep__search"
							type="text"
							placeholder="Search entities…"
							bind:value={entitySearch}
							autofocus
						/>
						{#if entitySearch}
							<button class="tep__clear" onclick={() => (entitySearch = '')}>
								<Icon name="x" size={12} />
							</button>
						{/if}
					</div>
					<div class="tep__list">
						{#each pickerResults() as entity (entity.entity_id)}
							<button
								class="tep__item"
								onclick={() => { pinEntity(entity.entity_id); entityPickerOpen = false; }}
							>
								<span class="tep__item-name">{getEntityName(entity)}</span>
								<span class="tep__item-id">{entity.entity_id}</span>
							</button>
						{:else}
							<div class="tep__empty">
								{#if Object.keys($entities).length === 0}
									Not connected to Home Assistant
								{:else}
									No unpinned entities found
								{/if}
							</div>
						{/each}
					</div>
					{#if pinnedIds.size > 0}
						<div class="tep__pinned">
							<span class="tep__pinned-label">Pinned</span>
							<div class="tep__pinned-list">
								{#each [...pinnedIds] as id (id)}
									<span class="tep__chip">
										{id}
										<button
											class="tep__chip-remove"
											onclick={() => dashboardStore.toggleFavorite(id)}
											aria-label="Unpin {id}"
										>
											<Icon name="x" size={10} />
										</button>
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<button class="toolbar__btn toolbar__btn--secondary" onclick={onAddSection}>
			<Icon name="layout-panel-top" size={15} strokeWidth={1.75} />
			Add Section
		</button>

		<button class="toolbar__btn toolbar__btn--accent" onclick={onAddTile}>
			<Icon name="plus" size={15} strokeWidth={2.5} />
			Add Tile
		</button>

		<div class="toolbar__sep" aria-hidden="true"></div>

		<button
			class="toolbar__btn toolbar__btn--ghost"
			onclick={handleDiscard}
			title="Discard changes and exit"
		>
			Discard
		</button>

		<button
			class="toolbar__btn toolbar__btn--save"
			onclick={handleSave}
			title="Save and exit edit mode"
		>
			<Icon name="check" size={15} strokeWidth={2.5} />
			Done
		</button>
	</div>
</header>

<style>
	/* ── Shell ────────────────────────────────────────────────────────────── */

	.edit-toolbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 52px;
		z-index: 300;
		display: flex;
		align-items: center;
		padding: 0 14px;
		gap: 0;
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border);
		box-shadow: var(--shadow);
	}

	@starting-style {
		.edit-toolbar {
			transform: translateY(-100%);
			opacity: 0;
		}
	}

	/* ── Sections ─────────────────────────────────────────────────────────── */

	.toolbar__section {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.toolbar__left  { flex: 0 0 auto; }
	.toolbar__center { flex: 1 1 0; justify-content: center; }
	.toolbar__right { flex: 0 0 auto; gap: 6px; margin-left: auto; }

	/* ── Separator ────────────────────────────────────────────────────────── */

	.toolbar__sep {
		width: 1px;
		height: 22px;
		background: var(--border);
		margin: 0 6px;
		flex-shrink: 0;
	}

	/* ── Edit label ───────────────────────────────────────────────────────── */

	.toolbar__edit-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--fg);
		letter-spacing: 0.01em;
		white-space: nowrap;
		padding: 0 2px;
	}

	/* ── Icon buttons (undo/redo) ─────────────────────────────────────────── */

	.toolbar__btn-group {
		display: flex;
		gap: 2px;
	}

	.toolbar__icon-btn {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.toolbar__icon-btn:hover:not(:disabled) {
		background: var(--hover);
		color: var(--fg);
	}

	.toolbar__icon-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* ── Conflict banner ──────────────────────────────────────────────────── */

	.toolbar__conflict {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px 5px 8px;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
		color: var(--color-warning);
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.toolbar__autofix-btn {
		height: 24px;
		padding: 0 9px;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid color-mix(in srgb, var(--color-warning) 50%, transparent);
		background: color-mix(in srgb, var(--color-warning) 20%, transparent);
		color: var(--color-warning);
		cursor: pointer;
		transition: background-color var(--transition);
	}

	.toolbar__autofix-btn:hover {
		background: color-mix(in srgb, var(--color-warning) 32%, transparent);
	}

	/* ── Auto-save indicator ──────────────────────────────────────────────── */

	.toolbar__autosave {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fg-subtle);
		white-space: nowrap;
		padding: 0 2px;
	}

	.toolbar__save-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-on);
		flex-shrink: 0;
	}

	/* ── Shared button ────────────────────────────────────────────────────── */

	.toolbar__btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 32px;
		padding: 0 11px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition),
			box-shadow var(--transition);
	}

	.toolbar__btn:active { transform: scale(0.97); }

	/* Secondary (Add Section) */
	.toolbar__btn--secondary {
		background: var(--hover);
		color: var(--fg-muted);
		border-color: var(--border);
	}
	.toolbar__btn--secondary:hover {
		background: var(--active);
		color: var(--fg);
		border-color: var(--border-strong, var(--border));
	}

	/* Accent (Add Tile) */
	.toolbar__btn--accent {
		background: var(--accent);
		color: var(--accent-fg);
		border-color: transparent;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.toolbar__btn--accent:hover {
		box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 45%, transparent);
		filter: brightness(1.08);
	}

	/* Ghost (Discard) */
	.toolbar__btn--ghost {
		background: transparent;
		color: var(--fg-muted);
		border-color: transparent;
	}
	.toolbar__btn--ghost:hover {
		background: var(--hover);
		color: var(--fg);
		border-color: var(--border);
	}

	/* Save / Done */
	.toolbar__btn--save {
		background: var(--color-on);
		color: var(--accent-fg);
		border-color: transparent;
		box-shadow: 0 1px 4px color-mix(in srgb, var(--color-on) 30%, transparent);
	}
	.toolbar__btn--save:hover {
		filter: brightness(1.1);
		box-shadow: 0 2px 8px color-mix(in srgb, var(--color-on) 40%, transparent);
	}

	/* Active state for toggleable buttons */
	.toolbar__btn--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	/* ── Entity picker dropdown ────────────────────────────────────────────── */

	.toolbar__picker-wrap {
		position: relative;
	}

	.toolbar__entity-picker {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		width: 300px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 8px 32px rgba(0,0,0,0.18);
		z-index: 400;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.tep__search-wrap {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 10px;
		border-bottom: 1px solid var(--border);
		color: var(--fg-muted);
	}

	.tep__search {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--fg);
		font-size: 0.84rem;
		outline: none;
	}
	.tep__search::placeholder { color: var(--fg-subtle); }

	.tep__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: none;
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
	}

	.tep__list {
		max-height: 260px;
		overflow-y: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.tep__item {
		display: flex;
		flex-direction: column;
		gap: 1px;
		width: 100%;
		padding: 7px 12px;
		border: none;
		background: transparent;
		text-align: left;
		cursor: pointer;
		transition: background-color var(--transition);
	}
	.tep__item:hover { background: var(--hover); }

	.tep__item-name {
		font-size: 0.83rem;
		font-weight: 500;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tep__item-id {
		font-size: 0.71rem;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tep__empty {
		padding: 24px 12px;
		text-align: center;
		font-size: 0.8rem;
		color: var(--fg-subtle);
	}

	.tep__pinned {
		border-top: 1px solid var(--border);
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tep__pinned-label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
	}

	.tep__pinned-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.tep__chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 7px 2px 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		font-size: 0.7rem;
		font-weight: 500;
		border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.tep__chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: none;
		background: transparent;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		opacity: 0.7;
		flex-shrink: 0;
	}
	.tep__chip-remove:hover { opacity: 1; }

</style>
