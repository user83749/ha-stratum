<script lang="ts">
	import { browser } from '$app/environment';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { editMode, isEditing } from '$lib/stores/editMode';
	import { getEntityIcon, getEntityName } from '$lib/ha/entities';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TileWrapper from '$lib/components/tiles/TileWrapper.svelte';
	import type { Section, Tile } from '$lib/types/dashboard';
	import type { HassEntity } from 'home-assistant-js-websocket';

	interface Props {
		section: Section;
		pageId: string;
		onEditSection?: () => void;
		onAddTile?: (activeColumns: number) => void;
	}

	let { section, pageId, onEditSection, onAddTile }: Props = $props();

	const editing = $derived($isEditing);
	// svelte-ignore state_referenced_locally
	let localCollapsed = $state(section.collapsed);
	let chipListEl: HTMLDivElement | null = $state(null);
	let tileDragId = $state<string | null>(null);
	let tileDropIdx = $state<number>(-1);

	$effect(() => {
		localCollapsed = section.collapsed;
	});

	$effect(() => {
		if (!browser) return;
		return () => {
			window.removeEventListener('pointermove', onTileDragMove);
			window.removeEventListener('pointerup', onTileDragEnd);
			window.removeEventListener('pointercancel', onTileDragCancel);
			if (tileDragId) editMode.setDragging(false);
		};
	});

	function chipEntity(tile: Tile): HassEntity | null {
		if (!tile.entity_id) return null;
		return $entities[tile.entity_id] ?? null;
	}

	function chipLabel(tile: Tile, entity: HassEntity | null): string {
		const override = (tile.config.name as string | undefined)?.trim();
		if (override) return override;
		if (entity) return getEntityName(entity);
		return tile.entity_id ?? 'Entity';
	}

	function chipIcon(tile: Tile, entity: HassEntity | null): string {
		const override = (tile.config.icon as string | undefined)?.trim();
		if (override) return override;
		if (entity) return getEntityIcon(entity);
		return 'circle';
	}

	function chipTile(tile: Tile): Tile {
		if (tile.config.tap_action) return tile;
		return {
			...tile,
			config: {
				...tile.config,
				tap_action: { type: 'more-info' }
			}
		};
	}

	function startTileDrag(tileId: string, event: PointerEvent) {
		if (!editing) return;
		event.stopPropagation();
		editMode.focusTile(pageId, section.id, tileId);
		editMode.setDragging(true);
		tileDragId = tileId;
		tileDropIdx = section.tiles.findIndex((tile) => tile.id === tileId);
		window.addEventListener('pointermove', onTileDragMove);
		window.addEventListener('pointerup', onTileDragEnd);
		window.addEventListener('pointercancel', onTileDragCancel);
	}

	function onTileDragMove(event: PointerEvent) {
		if (!tileDragId || !chipListEl || !browser) return;
		event.preventDefault();
		const nodes = Array.from(chipListEl.querySelectorAll<HTMLElement>('[data-chip-tile-id]'));
		let nearest = tileDropIdx;
		let minDist = Infinity;
		nodes.forEach((node, idx) => {
			const rect = node.getBoundingClientRect();
			const midX = rect.left + rect.width / 2;
			const midY = rect.top + rect.height / 2;
			const dist = Math.hypot(event.clientX - midX, event.clientY - midY);
			if (dist < minDist) {
				minDist = dist;
				nearest = idx;
			}
		});
		tileDropIdx = nearest;
	}

	function finishTileDrag(commit: boolean) {
		const draggedId = tileDragId;
		const dropIndex = tileDropIdx;
		window.removeEventListener('pointermove', onTileDragMove);
		window.removeEventListener('pointerup', onTileDragEnd);
		window.removeEventListener('pointercancel', onTileDragCancel);
		editMode.setDragging(false);
		tileDragId = null;
		tileDropIdx = -1;
		if (!commit || !draggedId) return;

		const ids = section.tiles.map((tile) => tile.id);
		const from = ids.indexOf(draggedId);
		if (from === -1 || dropIndex < 0 || dropIndex >= ids.length || from === dropIndex) return;
		ids.splice(from, 1);
		ids.splice(dropIndex > from ? dropIndex - 1 : dropIndex, 0, draggedId);
		dashboardStore.reorderTiles(pageId, section.id, ids);
	}

	function onTileDragEnd() {
		finishTileDrag(true);
	}

	function onTileDragCancel() {
		finishTileDrag(false);
	}
</script>

<section
	class="chiprow"
	class:chiprow--editing={editing}
	data-section-id={section.id}
	data-active-columns="1"
>
	{#if section.title || section.icon || editing}
		<div class="chiprow__header">
			<div class="chiprow__left">
				{#if section.icon}
					<span class="chiprow__icon" aria-hidden="true">
						<Icon name={section.icon} size={14} />
					</span>
				{/if}
				{#if section.title}
					<h2
						class="chiprow__title"
						class:chiprow__title--custom={!!section.titleSize}
						style={section.titleSize ? `--section-title-size:${section.titleSize}px` : undefined}
					>
						{section.title}
					</h2>
				{/if}
			</div>
			<div class="chiprow__controls">
				{#if editing}
					<button class="chiprow__btn" onclick={() => onAddTile?.(1)} title="Add tile" aria-label="Add tile">
						<Icon name="plus" size={14} />
					</button>
					<button class="chiprow__btn" onclick={onEditSection} title="Section settings" aria-label="Section settings">
						<Icon name="settings-2" size={13} />
					</button>
				{/if}
				{#if section.collapsible}
					<button
						class="chiprow__btn"
						aria-label={localCollapsed ? 'Expand section' : 'Collapse section'}
						onclick={() => dashboardStore.toggleSectionCollapsed(pageId, section.id)}
					>
						<span class="chiprow__chevron" class:rotated={localCollapsed}>
							<Icon name="chevron-down" size={14} />
						</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}

	{#if !localCollapsed}
		<div class="chiprow__list-wrap">
			<div class="chiprow__list" bind:this={chipListEl}>
				{#each section.tiles as tile (tile.id)}
					{@const entity = chipEntity(tile)}
					<div
						class="chiprow__item"
						class:chiprow__item--editing={editing}
						class:chiprow__item--dragging={tileDragId === tile.id}
						class:chiprow__item--drop-target={editing && tileDragId !== null && section.tiles[tileDropIdx]?.id === tile.id && tileDragId !== tile.id}
						data-tile-id={tile.id}
						data-chip-tile-id={tile.id}
					>
						<TileWrapper
							tile={chipTile(tile)}
							{entity}
							{pageId}
							sectionId={section.id}
							onEditDragStart={(event) => startTileDrag(tile.id, event)}
						>
							<div class="chiprow__btn-face">
								<span class="chiprow__chip-icon">
									<Icon name={chipIcon(tile, entity)} entity={entity} size="100%" />
								</span>
								<span class="chiprow__chip-label">{chipLabel(tile, entity)}</span>
							</div>
						</TileWrapper>
					</div>
				{/each}
					{#if editing && section.tiles.length === 0}
						<button class="chiprow__empty-drop" type="button" onclick={() => onAddTile?.(1)} disabled={!onAddTile}>
							<Icon name="plus" size={16} />
							<span>Add</span>
						</button>
					{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.chiprow {
		--chip-row-padding-y: 0.7vw;
		--chip-row-padding-x: 1.1vw;
		--chip-row-icon-size: 1.5vw;
		--chip-row-font-size: 1.22vw;
		--chip-row-radius: 0.65vw;
		--chip-row-margin-x: 0vw;
		--chip-row-scale-portrait: 1.4;
		--chip-row-scale-phone: 3;
		display: flex;
		flex-direction: column;
		gap: clamp(8px, 0.55vw, 12px);
		min-width: 0;
	}

	.chiprow--editing .chiprow__list-wrap {
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
		padding: 8px;
	}

	.chiprow__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-width: 0;
	}

	.chiprow__left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.chiprow__title {
		margin: 0;
		font-size: clamp(0.95rem, 1.06vw, 1.16rem);
		font-weight: 600;
		color: var(--fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chiprow__title--custom {
		font-size: var(--section-title-size);
		line-height: 1.15;
	}

	.chiprow__icon { display: inline-flex; color: var(--fg-subtle); }

	.chiprow__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
	}

	.chiprow__btn:hover {
		background: var(--hover);
		color: var(--fg);
	}

	.chiprow__controls {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.chiprow__chevron {
		display: inline-flex;
		transform: rotate(-90deg);
		transition: transform var(--transition);
	}
	.chiprow__chevron.rotated { transform: rotate(0deg); }

	.chiprow__list-wrap {
		min-width: 0;
	}

	.chiprow__list {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: clamp(8px, 0.52vw, 12px);
		min-width: 0;
	}

	.chiprow__item {
		flex: 1 1 auto;
		display: inline-flex;
		width: auto;
		max-width: 100%;
		min-width: 0;
	}

	.chiprow__item--editing {
		outline: 1px dashed color-mix(in srgb, var(--border-strong) 60%, transparent);
		border-radius: var(--radius);
	}

	.chiprow__item--dragging {
		opacity: 0.45;
	}

	.chiprow__item--drop-target {
		outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.chiprow__btn-face {
		display: inline-flex;
		align-items: center;
		gap: clamp(0.3rem, 0.32vw, 0.55rem);
		padding: var(--chip-row-padding-y) var(--chip-row-padding-x);
		white-space: nowrap;
		width: 100%;
		max-width: 100%;
	}

	.chiprow__chip-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--chip-row-icon-size);
		height: var(--chip-row-icon-size);
		color: var(--fg-subtle);
		opacity: 0.4;
		flex-shrink: 0;
		padding-right: 0.1vw;
		transform: translateY(7%);
	}

	.chiprow__chip-label {
		font-size: var(--chip-row-font-size);
		font-weight: 500;
		color: var(--fg);
		letter-spacing: 0.05vw;
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.chiprow__item :global(.tile-wrapper) {
		padding: 0 !important;
		width: 100% !important;
		height: auto !important;
		min-height: 0 !important;
		border-radius: var(--chip-row-radius);
		margin: 0 var(--chip-row-margin-x);
		background: rgba(115, 115, 115, 0.1);
	}

	.chiprow__item :global(.tile-wrapper:hover) {
		transform: translateY(-1px) scale(1.01);
	}

	.chiprow__item :global(.resize-handle) {
		display: none !important;
	}

	.chiprow__empty-drop {
		min-height: 56px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 14px;
		border: 1px dashed color-mix(in srgb, var(--accent) 35%, transparent);
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--accent) 6%, transparent);
		color: var(--fg-muted);
		cursor: pointer;
		font-weight: 600;
	}

	.chiprow__empty-drop:hover {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	@media (min-width: 1201px) {
		.chiprow__list {
			flex-wrap: nowrap;
			justify-content: space-between;
			overflow-x: hidden;
		}
	}

	@media (max-width: 1200px) {
		.chiprow {
			--chip-row-margin-x: 0.5vw;
		}
		.chiprow__btn-face {
			padding:
				calc(var(--chip-row-padding-y) * var(--chip-row-scale-portrait))
				calc(var(--chip-row-padding-x) * var(--chip-row-scale-portrait));
		}
		.chiprow__chip-label {
			font-size: calc(var(--chip-row-font-size) * var(--chip-row-scale-portrait));
		}
		.chiprow__chip-icon {
			width: calc(var(--chip-row-icon-size) * var(--chip-row-scale-portrait));
			height: calc(var(--chip-row-icon-size) * var(--chip-row-scale-portrait));
		}
		.chiprow__item :global(.tile-wrapper) {
			border-radius: calc(var(--chip-row-radius) * var(--chip-row-scale-portrait));
		}
	}

	@media (max-width: 800px) {
		.chiprow__list {
			justify-content: space-evenly;
		}
		.chiprow__item {
			max-width: 100%;
		}
		.chiprow__btn-face {
			max-width: 100%;
			padding:
				calc(var(--chip-row-padding-y) * var(--chip-row-scale-phone))
				calc(var(--chip-row-padding-x) * var(--chip-row-scale-phone));
		}
		.chiprow__item :global(.tile-wrapper) {
			border-radius: calc(var(--chip-row-radius) * var(--chip-row-scale-phone));
			background: rgba(115, 115, 115, 0.12);
		}
		.chiprow__chip-label {
			font-size: calc(var(--chip-row-font-size) * var(--chip-row-scale-phone));
		}
		.chiprow__chip-icon {
			width: calc(var(--chip-row-icon-size) * var(--chip-row-scale-phone));
			height: calc(var(--chip-row-icon-size) * var(--chip-row-scale-phone));
		}
	}
</style>
