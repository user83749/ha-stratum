<script lang="ts">
	import { browser } from '$app/environment';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { isEditing, editMode } from '$lib/stores/editMode';
	import { uiStore } from '$lib/stores/ui';
	import { currentBreakpoint } from '$lib/stores/ui';
	import Icon from '$lib/components/ui/Icon.svelte';
	import TileRenderer from '$lib/components/tiles/TileRenderer.svelte';
	import type { Section, TileLayout, TileSizePreset } from '$lib/types/dashboard';
	import {
		getAdaptiveColumns,
		getSectionMaxColumns,
		MOBILE_SECTION_COLS,
		normalizeTilesForColumns
	} from '$lib/layout/sectionLayout';
	import { getAllowedPresets, resolvePresetToSpan } from '$lib/layout/tileSizing';

	interface Props {
		section: Section;
		pageId: string;
		onEditSection?: () => void;
		onAddTile?: (activeColumns: number) => void;
	}

	let { section, pageId, onEditSection, onAddTile }: Props = $props();

	const editing = $derived($isEditing);
	const breakpoint = $derived($currentBreakpoint);
	const isMobileLayout = $derived(breakpoint === 'sm');
	let gridCtrEl: HTMLDivElement | null = $state(null);
	let gridCtrWidth = $state(0);
	let dragState = $state<{
		tileId: string;
		originX: number;
		originY: number;
		lastX: number;
		lastY: number;
		startLayout: TileLayout;
		currentLayout: TileLayout;
		isValid: boolean;
	} | null>(null);
	let resizeState = $state<{
		tileId: string;
		tileType: Section['tiles'][number]['type'];
		originX: number;
		originY: number;
		startLayout: TileLayout;
		currentLayout: TileLayout;
		startPreset: TileSizePreset;
		currentPreset: TileSizePreset;
		isValid: boolean;
	} | null>(null);
	let pointerCaptureEl = $state<HTMLElement | null>(null);
	let pointerCaptureId = $state<number | null>(null);
	let dragFrame = $state<number | null>(null);
	let resizeFrame = $state<number | null>(null);
	let pendingDragPoint = $state<{ x: number; y: number } | null>(null);
	let pendingResizePoint = $state<{ x: number; y: number } | null>(null);

	// Local transient collapsed state
	// svelte-ignore state_referenced_locally
	let localCollapsed = $state(section.collapsed);

	$effect(() => {
		localCollapsed = section.collapsed;
	});

	$effect(() => {
		if (!gridCtrEl || typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			gridCtrWidth = Math.round(entry.contentRect.width);
		});

		observer.observe(gridCtrEl);
		gridCtrWidth = Math.round(gridCtrEl.clientWidth);

		return () => observer.disconnect();
	});

	$effect(() => {
		return () => {
			window.removeEventListener('pointermove', handleWindowPointerMove);
			window.removeEventListener('pointerup', handleWindowPointerUp);
			window.removeEventListener('pointercancel', handleWindowPointerCancel);
			window.removeEventListener('pointermove', handleResizePointerMove);
			window.removeEventListener('pointerup', handleResizePointerUp);
			window.removeEventListener('pointercancel', handleResizePointerCancel);
			cancelScheduledInteractionFrames();
			releasePointerCapture();
			editMode.setDragging(false);
		};
	});

	function cancelScheduledInteractionFrames() {
		if (dragFrame !== null && browser) {
			window.cancelAnimationFrame(dragFrame);
		}
		if (resizeFrame !== null && browser) {
			window.cancelAnimationFrame(resizeFrame);
		}
		dragFrame = null;
		resizeFrame = null;
		pendingDragPoint = null;
		pendingResizePoint = null;
	}

	function setPointerCaptureFromEvent(event: PointerEvent) {
		const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
		if (!target || typeof target.setPointerCapture !== 'function') return;
		try {
			target.setPointerCapture(event.pointerId);
			pointerCaptureEl = target;
			pointerCaptureId = event.pointerId;
		} catch {
			pointerCaptureEl = null;
			pointerCaptureId = null;
		}
	}

	function releasePointerCapture() {
		if (!pointerCaptureEl || pointerCaptureId === null || typeof pointerCaptureEl.releasePointerCapture !== 'function') {
			pointerCaptureEl = null;
			pointerCaptureId = null;
			return;
		}
		try {
			if (pointerCaptureEl.hasPointerCapture?.(pointerCaptureId)) {
				pointerCaptureEl.releasePointerCapture(pointerCaptureId);
			}
		} catch {
			// capture may already be released by the browser
		}
		pointerCaptureEl = null;
		pointerCaptureId = null;
	}

	function resolveColumns(): number {
		const gap = section.grid.gap;
		const baseSize = section.grid.baseSize;
		const maxCols = getSectionMaxColumns(section);

		if (isMobileLayout) {
			return Math.min(maxCols, MOBILE_SECTION_COLS);
		}

		const measuredWidth =
			gridCtrWidth ||
			(browser
				? Math.round(gridCtrEl?.clientWidth || gridCtrEl?.parentElement?.clientWidth || window.innerWidth)
				: baseSize);

		return getAdaptiveColumns(measuredWidth, baseSize, gap, maxCols);
	}

	const activeColumns = $derived(resolveColumns());
	const positionedTiles = $derived(normalizeTilesForColumns(section.tiles, activeColumns));
	const activeInteractionTileId = $derived(dragState?.tileId ?? resizeState?.tileId ?? null);
	const occupiedGhostCells = $derived.by(() => {
		if (!activeInteractionTileId) return [] as Array<{ key: string; x: number; y: number }>;
		const cells: Array<{ key: string; x: number; y: number }> = [];

		for (const item of positionedTiles) {
			if (item.tile.id === activeInteractionTileId) continue;
			for (let row = item.layout.y; row < item.layout.y + item.layout.h; row += 1) {
				for (let col = item.layout.x; col < item.layout.x + item.layout.w; col += 1) {
					cells.push({ key: `${col}:${row}`, x: col, y: row });
				}
			}
		}

		return cells;
	});
	const occupiedCellKeys = $derived.by(() => new Set(occupiedGhostCells.map((cell) => cell.key)));
	const interactionLayout = $derived(dragState?.currentLayout ?? resizeState?.currentLayout ?? null);
	const previewCells = $derived.by(() => {
		if (!interactionLayout) return [] as Array<{ key: string; x: number; y: number }>;
		const cells: Array<{ key: string; x: number; y: number }> = [];
		for (let row = interactionLayout.y; row < interactionLayout.y + interactionLayout.h; row += 1) {
			for (let col = interactionLayout.x; col < interactionLayout.x + interactionLayout.w; col += 1) {
				cells.push({ key: `preview:${col}:${row}`, x: col, y: row });
			}
		}
		return cells;
	});
	const collisionCells = $derived.by(() =>
		previewCells.filter((cell) => occupiedCellKeys.has(`${cell.x}:${cell.y}`)).map((cell) => ({
			...cell,
			key: `collision:${cell.x}:${cell.y}`
		}))
	);
	const renderedTiles = $derived.by(() =>
		positionedTiles.map((item) =>
			resizeState?.tileId === item.tile.id
				? {
						...item,
						layout: resizeState.currentLayout,
						tile: {
							...item.tile,
							layout: resizeState.currentLayout,
							size: { w: resizeState.currentLayout.w, h: resizeState.currentLayout.h }
						}
					}
				: dragState?.tileId === item.tile.id
					? {
							...item,
							layout: dragState.currentLayout,
							tile: {
								...item.tile,
								layout: dragState.currentLayout
							}
						}
				: item
		)
	);
	const gridGuideCells = $derived.by(() => {
		if (!activeInteractionTileId) return [] as Array<{ key: string; x: number; y: number }>;
		const maxBottom = renderedTiles.reduce((bottom, item) => Math.max(bottom, item.layout.y + item.layout.h), 0);
		const interactionBottom = Math.max(
			dragState ? dragState.currentLayout.y + dragState.currentLayout.h : 0,
			resizeState ? resizeState.currentLayout.y + resizeState.currentLayout.h : 0
		);
		const rows = Math.max(1, Math.min(24, Math.max(maxBottom, interactionBottom) + 1));
		const cells: Array<{ key: string; x: number; y: number }> = [];
		for (let row = 0; row < rows; row += 1) {
			for (let col = 0; col < activeColumns; col += 1) {
				cells.push({ key: `guide:${col}:${row}`, x: col, y: row });
			}
		}
		return cells;
	});
	const cellSize = $derived.by(() => {
		const cols = activeColumns;
		const gap = section.grid.gap;
		if (!cols) return section.grid.baseSize;
		return Math.max(1, (gridCtrWidth - (cols - 1) * gap) / cols);
	});

	const gridStyle = $derived.by(() => {
		const cols = activeColumns;
		const gap = section.grid.gap;
		const parts: string[] = [];

		// Home Assistant-style responsive layout:
		// - larger screens adapt the column count from available section width
		// - the section's column setting acts only as a max-column cap
		// - mobile is always constrained to a 4-unit grid
		const colW = `calc((100cqw - ${(cols - 1) * gap}px) / ${cols})`;
		parts.push(`grid-template-columns: repeat(${cols}, 1fr)`);
		parts.push(`grid-auto-rows: ${colW}`);

		parts.push(`gap: ${gap}px`);
		if (section.padding !== undefined) parts.push(`padding: ${section.padding}px`);
		return parts.join('; ');
	});

	function tileStyle(layout: { x: number; y: number; w: number; h: number }): string {
		return `grid-column: ${layout.x + 1} / span ${layout.w}; grid-row: ${layout.y + 1} / span ${layout.h}`;
	}

	function canPlaceDraggedLayout(tileId: string, layout: TileLayout): boolean {
		if (layout.x < 0 || layout.y < 0 || layout.w < 1 || layout.h < 1) return false;
		if (layout.x + layout.w > activeColumns) return false;

		for (const item of positionedTiles) {
			if (item.tile.id === tileId) continue;
			const other = item.layout;
			const overlaps =
				layout.x < other.x + other.w &&
				layout.x + layout.w > other.x &&
				layout.y < other.y + other.h &&
				layout.y + layout.h > other.y;
			if (overlaps) return false;
		}

		return true;
	}

	function flushDragMove() {
		if (!dragState || !pendingDragPoint) {
			dragFrame = null;
			return;
		}
		const unit = cellSize + section.grid.gap;
		const deltaX = pendingDragPoint.x - dragState.originX;
		const deltaY = pendingDragPoint.y - dragState.originY;
		const stepX = Math.round(deltaX / unit);
		const stepY = Math.round(deltaY / unit);
		const nextLayout: TileLayout = {
			...dragState.startLayout,
			x: Math.max(0, Math.min(activeColumns - dragState.startLayout.w, dragState.startLayout.x + stepX)),
			y: Math.max(0, dragState.startLayout.y + stepY)
		};

		dragState = {
			...dragState,
			lastX: pendingDragPoint.x,
			lastY: pendingDragPoint.y,
			currentLayout: nextLayout,
			isValid: canPlaceDraggedLayout(dragState.tileId, nextLayout)
		};
		dragFrame = null;
	}

	function handleWindowPointerMove(e: PointerEvent) {
		if (!dragState) return;
		pendingDragPoint = { x: e.clientX, y: e.clientY };
		if (dragFrame !== null || !browser) return;
		dragFrame = window.requestAnimationFrame(flushDragMove);
	}

	function finishTileDrag(commit: boolean, endEvent?: PointerEvent) {
		if (!dragState) return;
		const finalState = dragState;
		window.removeEventListener('pointermove', handleWindowPointerMove);
		window.removeEventListener('pointerup', handleWindowPointerUp);
		window.removeEventListener('pointercancel', handleWindowPointerCancel);
		if (dragFrame !== null && browser) {
			window.cancelAnimationFrame(dragFrame);
			dragFrame = null;
		}
		pendingDragPoint = null;
		releasePointerCapture();
		editMode.setDragging(false);
		dragState = null;

		const moved =
			finalState.currentLayout.x !== finalState.startLayout.x ||
			finalState.currentLayout.y !== finalState.startLayout.y;

		if (!commit || !moved) return;

		let targetSectionId = section.id;
		let targetPageId = pageId;
		let targetColumnHint = activeColumns;

		if (browser) {
			const clientX = endEvent?.clientX ?? finalState.lastX;
			const clientY = endEvent?.clientY ?? finalState.lastY;
			
			const dragEl = document.querySelector(`[data-tile-id="${finalState.tileId}"]`) as HTMLElement;
			let oldDisplay = '';
			if (dragEl) {
				oldDisplay = dragEl.style.display;
				dragEl.style.display = 'none';
			}

			const dropTarget = document.elementFromPoint(clientX, clientY);
			
			if (dragEl) {
				dragEl.style.display = oldDisplay;
			}

			const sectionEl = dropTarget?.closest<HTMLElement>('[data-section-id]');
			const pageEl = dropTarget?.closest<HTMLElement>('[data-page-drop-id]');
			const nextSectionId = sectionEl?.dataset.sectionId;
			const nextPageId = pageEl?.dataset.pageDropId;
			const nextColumns = Number(sectionEl?.dataset.activeColumns ?? '');

			if (nextSectionId) {
				targetSectionId = nextSectionId;
			}
			if (nextPageId) {
				targetPageId = nextPageId;
			}
			if (!Number.isNaN(nextColumns) && nextColumns > 0) {
				targetColumnHint = nextColumns;
			}
		}

		if (targetPageId !== pageId) {
			dashboardStore.moveTileToPage(pageId, section.id, targetPageId, finalState.tileId, targetColumnHint);
			uiStore.navigateTo(targetPageId);
			editMode.clearSelection();
			return;
		}

		if (targetSectionId !== section.id) {
			dashboardStore.moveTileToSection(pageId, section.id, targetSectionId, finalState.tileId, targetColumnHint);
			editMode.focusTile(pageId, targetSectionId, finalState.tileId);
			return;
		}

		if (finalState.isValid) {
			dashboardStore.setTileLayout(pageId, section.id, finalState.tileId, finalState.currentLayout);
		}
	}

	function handleWindowPointerUp(e: PointerEvent) {
		finishTileDrag(true, e);
	}

	function handleWindowPointerCancel() {
		finishTileDrag(false);
	}

	function startTileDrag(tileId: string, event: PointerEvent) {
		if (!editing) return;
		finishTileResize(false);
		const item = positionedTiles.find((candidate) => candidate.tile.id === tileId);
		if (!item) return;

		editMode.focusTile(pageId, section.id, tileId);
		editMode.setDragging(true);
		setPointerCaptureFromEvent(event);
		dragState = {
			tileId,
			originX: event.clientX,
			originY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
			startLayout: { ...item.layout },
			currentLayout: { ...item.layout },
			isValid: true
		};

		window.addEventListener('pointermove', handleWindowPointerMove);
		window.addEventListener('pointerup', handleWindowPointerUp);
		window.addEventListener('pointercancel', handleWindowPointerCancel);
	}

	function flushResizeMove() {
		if (!resizeState || !pendingResizePoint) {
			resizeFrame = null;
			return;
		}
		const startX = resizeState.startLayout.x;

		const unit = cellSize + section.grid.gap;
		const deltaX = pendingResizePoint.x - resizeState.originX;
		const deltaY = pendingResizePoint.y - resizeState.originY;
		
		const targetW = Math.max(
			1,
			Math.min(activeColumns - resizeState.startLayout.x, resizeState.startLayout.w + Math.round(deltaX / unit))
		);
		const targetH = Math.max(1, resizeState.startLayout.h + Math.round(deltaY / unit));

		const nextLayout: TileLayout = {
			...resizeState.startLayout,
			w: targetW,
			h: targetH
		};

		if (canPlaceDraggedLayout(resizeState.tileId, nextLayout)) {
			resizeState = {
				...resizeState,
				currentLayout: nextLayout,
				isValid: true
			};
		} else {
			resizeState = {
				...resizeState,
				currentLayout: nextLayout,
				isValid: false
			};
		}
		
		resizeFrame = null;
	}

	function handleResizePointerMove(e: PointerEvent) {
		if (!resizeState) return;
		pendingResizePoint = { x: e.clientX, y: e.clientY };
		if (resizeFrame !== null || !browser) return;
		resizeFrame = window.requestAnimationFrame(flushResizeMove);
	}

	function finishTileResize(commit: boolean) {
		if (!resizeState) return;
		const finalState = resizeState;
		window.removeEventListener('pointermove', handleResizePointerMove);
		window.removeEventListener('pointerup', handleResizePointerUp);
		window.removeEventListener('pointercancel', handleResizePointerCancel);
		if (resizeFrame !== null && browser) {
			window.cancelAnimationFrame(resizeFrame);
			resizeFrame = null;
		}
		pendingResizePoint = null;
		releasePointerCapture();
		editMode.setDragging(false);
		resizeState = null;

		if (
			finalState.isValid &&
			commit &&
			(finalState.currentLayout.w !== finalState.startLayout.w ||
				finalState.currentLayout.h !== finalState.startLayout.h)
		) {
			dashboardStore.updateTile(pageId, section.id, finalState.tileId, {
				layout: finalState.currentLayout,
				size: { w: finalState.currentLayout.w, h: finalState.currentLayout.h }
			});
		}
	}

	function handleResizePointerUp() {
		finishTileResize(true);
	}

	function handleResizePointerCancel() {
		finishTileResize(false);
	}

	function startTileResize(tileId: string, event: PointerEvent) {
		if (!editing) return;
		finishTileDrag(false);
		const item = positionedTiles.find((candidate) => candidate.tile.id === tileId);
		if (!item) return;
		const initialPreset = item.tile.sizePreset ?? 'md';

		editMode.focusTile(pageId, section.id, tileId);
		editMode.setDragging(true);
		setPointerCaptureFromEvent(event);
		resizeState = {
			tileId,
			tileType: item.tile.type,
			originX: event.clientX,
			originY: event.clientY,
			startLayout: { ...item.layout },
			currentLayout: { ...item.layout },
			startPreset: initialPreset,
			currentPreset: initialPreset,
			isValid: true
		};

		window.addEventListener('pointermove', handleResizePointerMove);
		window.addEventListener('pointerup', handleResizePointerUp);
		window.addEventListener('pointercancel', handleResizePointerCancel);
	}
</script>

<section
	class="section"
	class:section--editing={editing}
	class:section--busy={!!dragState || !!resizeState}
	data-section-id={section.id}
	data-active-columns={activeColumns}
>
	<!-- Section header -->
	{#if section.title || section.icon || editing}
		<div class="section__header">
			{#if section.icon}
				<span class="section__icon" aria-hidden="true">
					<Icon name={section.icon} size={14} />
				</span>
			{/if}
			{#if section.title}
				<h2 class="section__title" style="font-size: {section.titleSize ?? 23}px;">{section.title}</h2>
			{/if}

			{#if editing}
				<div class="section__edit-controls">
					{#if onAddTile}
						<button
							class="section__edit-btn"
							onclick={() => onAddTile?.(activeColumns)}
							title="Add tile"
							aria-label="Add tile"
						>
							<Icon name="plus" size={13} strokeWidth={2} />
						</button>
					{/if}
					{#if onEditSection}
						<button
							class="section__edit-btn"
							onclick={onEditSection}
							title="Section settings"
							aria-label="Section settings"
						>
							<Icon name="settings-2" size={13} strokeWidth={1.75} />
						</button>
					{/if}
				</div>
			{/if}

			{#if section.collapsible}
				<button
					class="section__collapse-btn"
					onclick={() => (localCollapsed = !localCollapsed)}
					aria-label={localCollapsed ? 'Expand section' : 'Collapse section'}
					aria-expanded={!localCollapsed}
				>
					<span class="section__collapse-chevron" class:rotated={localCollapsed}>
						<Icon name="chevron-right" size={14} />
					</span>
				</button>
			{/if}
		</div>
	{:else if editing}
		<div class="section__header section__header--edit-only">
			<span class="section__edit-hint">
				<Icon name="layout-panel-top" size={12} />
				Section
			</span>
			<div class="section__edit-controls">
				{#if onAddTile}
					<button class="section__edit-btn" onclick={() => onAddTile?.(activeColumns)} title="Add tile" aria-label="Add tile">
						<Icon name="plus" size={13} strokeWidth={2} />
					</button>
				{/if}
				{#if onEditSection}
					<button class="section__edit-btn" onclick={onEditSection} title="Section settings" aria-label="Section settings">
						<Icon name="settings-2" size={13} strokeWidth={1.75} />
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Tile grid -->
	{#if !localCollapsed}
		<!-- grid-ctr provides the container-type context so cqw in grid-auto-rows works -->
		<div class="section__grid-ctr" bind:this={gridCtrEl}>
			<div class="section__grid" style={gridStyle}>
				{#if activeInteractionTileId}
					{#each gridGuideCells as cell (cell.key)}
						<div
							class="section__guide-cell"
							style={`grid-column: ${cell.x + 1}; grid-row: ${cell.y + 1};`}
							aria-hidden="true"
						></div>
					{/each}
					{#each previewCells as cell (cell.key)}
						<div
							class="section__preview-cell"
							style={`grid-column: ${cell.x + 1}; grid-row: ${cell.y + 1};`}
							aria-hidden="true"
						></div>
					{/each}
					{#each occupiedGhostCells as cell (cell.key)}
						<div
							class="section__ghost-cell"
							style={`grid-column: ${cell.x + 1}; grid-row: ${cell.y + 1};`}
							aria-hidden="true"
						></div>
					{/each}
					{#each collisionCells as cell (cell.key)}
						<div
							class="section__collision-cell"
							style={`grid-column: ${cell.x + 1}; grid-row: ${cell.y + 1};`}
							aria-hidden="true"
						></div>
					{/each}
				{/if}

				{#each renderedTiles as item (item.tile.id)}
					<div
						class="tile-slot"
						class:tile-slot--editing={editing}
						class:tile-slot--dragging={dragState?.tileId === item.tile.id}
						class:tile-slot--preview={dragState?.tileId === item.tile.id || resizeState?.tileId === item.tile.id}
						class:tile-slot--preview-valid={(dragState?.tileId === item.tile.id && dragState.isValid) || (resizeState?.tileId === item.tile.id && resizeState.isValid)}
						class:tile-slot--preview-invalid={(dragState?.tileId === item.tile.id && !dragState.isValid) || (resizeState?.tileId === item.tile.id && !resizeState.isValid)}
						style={tileStyle(item.layout)}
						data-tile-id={item.tile.id}
						data-tile-type={item.tile.type}
					>
						<TileRenderer
							tile={item.tile}
							{pageId}
							sectionId={section.id}
							onEditDragStart={(event) => startTileDrag(item.tile.id, event)}
							onEditResizeStart={(event) => startTileResize(item.tile.id, event)}
						/>
					</div>
				{/each}

				{#if renderedTiles.length === 0}
					<button
						class="section__empty-drop"
						type="button"
						onclick={() => onAddTile?.(activeColumns)}
						disabled={!onAddTile}
					>
						<Icon name="plus" size={16} />
						<span>Add tiles</span>
					</button>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section--editing {
		outline: 1px dashed color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: var(--radius);
		padding: 8px;
	}

	.section--busy,
	.section--busy * {
		user-select: none;
		-webkit-user-select: none;
	}

	.section--busy {
		--transition: 0s;
	}

	.section--busy .section__header {
		pointer-events: none;
	}

	/* Drag/resize should feel stable, but not completely static. A very fast
	   transition (80ms) makes snapping feel much more premium and responsive. */
	:global(html.is-tile-dragging) .section__title,
	:global(html.is-tile-dragging) .section__icon,
	:global(html.is-tile-dragging) .section__header,
	:global(html.is-tile-dragging) .tile-slot,
	:global(html.is-tile-dragging) .section__ghost-cell,
	:global(html.is-tile-dragging) .section__preview-cell,
	:global(html.is-tile-dragging) .section__guide-cell {
		transition: all 80ms cubic-bezier(0.4, 0, 0.2, 1) !important;
		animation: none !important;
	}

	:global(html.is-tile-dragging) .section__header {
		pointer-events: none !important;
	}

	/* ── Section header ──────────────────────────────────────────────────── */
	.section__header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 2px 0 2px 2px;
	}

	.section__header--edit-only {
		opacity: 0.7;
	}

	.section__icon {
		font-size: 0.875rem;
		color: var(--fg-subtle);
	}

	.section__title {
		flex: 1;
		font-size: 1.38rem;
		font-weight: 650;
		letter-spacing: -0.03em;
		color: var(--fg);
		margin: 0;
	}

	.section__edit-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
	}

	/* ── Edit controls ───────────────────────────────────────────────────── */
	.section__edit-controls {
		display: flex;
		align-items: center;
		gap: 2px;
		margin-left: auto;
	}

	.section__edit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}

	.section__edit-btn:hover {
		background: var(--hover);
		color: var(--fg-muted);
	}

	/* ── Collapse button ─────────────────────────────────────────────────── */
	.section__collapse-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		border: none;
		background: transparent;
		cursor: pointer;
		transition: color var(--transition), background-color var(--transition);
	}

	.section__collapse-btn:hover {
		color: var(--fg-muted);
		background-color: var(--hover);
	}

	.section__collapse-chevron {
		display: flex;
		align-items: center;
		transition: transform var(--transition);
		transform: rotate(90deg);
	}

	.section__collapse-chevron.rotated { transform: rotate(0deg); }

	/* ── Grid ────────────────────────────────────────────────────────────── */
	.section__grid-ctr {
		container-type: inline-size;
	}

	.section__grid {
		display: grid;
		position: relative;
		isolation: isolate;
	}

	.section__guide-cell {
		pointer-events: none;
		border-radius: calc(var(--radius-sm) + 2px);
		border: 1px dashed color-mix(in srgb, var(--border) 14%, transparent);
		background: color-mix(in srgb, var(--fg-subtle) 2.5%, transparent);
		transition: opacity 120ms ease;
		z-index: 0;
	}

	.section__preview-cell {
		pointer-events: none;
		border-radius: calc(var(--radius-sm) + 2px);
		background: 
			radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 15%, transparent), transparent 70%),
			linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, transparent) 0%, color-mix(in srgb, var(--accent) 5%, transparent) 100%);
		box-shadow: 
			inset 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent),
			0 2px 8px color-mix(in srgb, var(--accent) 10%, transparent);
		opacity: 0.95;
		z-index: 2;
		will-change: transform;
	}

	.section__ghost-cell {
		pointer-events: none;
		border-radius: calc(var(--radius-sm) + 2px);
		border: 1px dashed color-mix(in srgb, var(--border-strong) 48%, transparent);
		background: color-mix(in srgb, var(--accent) 1.5%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border) 15%, transparent);
		/* Occupied-cell overlay: richer guidance that indicates current structural occupancy. */
		z-index: 1;
		will-change: transform;
	}

	.section__collision-cell {
		pointer-events: none;
		border-radius: calc(var(--radius-sm) + 2px);
		background:
			radial-gradient(circle at center, color-mix(in srgb, #ef4444 20%, transparent), transparent 80%),
			linear-gradient(180deg, color-mix(in srgb, #ef4444 15%, transparent) 0%, color-mix(in srgb, #ef4444 10%, transparent) 100%);
		box-shadow: 
			inset 0 0 0 1px color-mix(in srgb, #ef4444 30%, transparent),
			0 0 12px color-mix(in srgb, #ef4444 15%, transparent);
		z-index: 3;
		will-change: transform;
	}

	/* ── Tile slot ───────────────────────────────────────────────────────── */
	.tile-slot {
		min-height: 0;
		position: relative;
		z-index: 4;
		will-change: auto;
		contain: layout paint style;
		transform: translateZ(0);
	}

	.tile-slot--editing {
		outline: 1px dashed color-mix(in srgb, var(--border-strong) 60%, transparent);
		border-radius: var(--radius);
	}

	.tile-slot--dragging {
		z-index: 4;
		will-change: transform;
	}

	.tile-slot--preview {
		z-index: 6;
	}

	.tile-slot--preview-valid::after,
	.tile-slot--preview-invalid::after {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: calc(var(--radius) + 2px);
		pointer-events: none;
		z-index: 8;
	}

	.tile-slot--preview-valid::after {
		border: 2px dashed color-mix(in srgb, var(--accent) 75%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.tile-slot--preview-invalid::after {
		border: 2px dashed color-mix(in srgb, #ef4444 80%, transparent);
		background: color-mix(in srgb, #ef4444 10%, transparent);
	}

	.tile-slot--preview-invalid {
		opacity: 0.88;
	}

	/* Empty section drop target */
	.section__empty-drop {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 80px;
		border: 2px dashed var(--border);
		border-radius: var(--radius);
		color: var(--fg-subtle);
		font-size: 0.8125rem;
		cursor: pointer;
		background: transparent;
		transition: border-color var(--transition), color var(--transition);
	}

	.section__empty-drop:disabled {
		cursor: default;
		opacity: 0.8;
	}

	.section__empty-drop:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
