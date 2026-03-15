<script lang="ts">
	// ── SectionList ───────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import SectionGrid from './SectionGrid.svelte';
	import SectionHorizontalChipRow from './SectionHorizontalChipRow.svelte';
	import type { Page } from '$lib/types/dashboard';

	// ── Props ─────────────────────────────────────────────────────────────
	interface Props {
		sections: Page['sections'];
		pageId: string;
		sectionDragId: string | null;
		sectionDropIdx: number;
		onEditSection: ((pageId: string, sectionId: string) => void) | null;
		onAddTile: ((pageId: string, sectionId: string, activeColumns?: number) => void) | null;
		onSectionDragStart: ((event: PointerEvent, sectionId: string) => void) | null;
		onSectionDragMove: (event: PointerEvent, gridEl: HTMLElement) => void;
		onSectionDragEnd: () => void;
	}

	const {
		sections,
		pageId,
		sectionDragId,
		sectionDropIdx,
		onEditSection,
		onAddTile,
		onSectionDragStart,
		onSectionDragMove,
		onSectionDragEnd
	}: Props = $props();

	// ── Local State ─────────────────────────────────────────────────────────────
	let gridEl = $state<HTMLElement | null>(null);
</script>

<!-- ── Section Grid ───────────────────────────────────────────────────────────── -->
<div
	bind:this={gridEl}
	class="page-sections-grid"
	class:sections-dragging={!!sectionDragId}
	role="presentation"
	onpointermove={(event) => {
		if (!gridEl) return;
		onSectionDragMove(event, gridEl);
	}}
	onpointerup={onSectionDragEnd}
	onpointercancel={onSectionDragEnd}
>
	<!-- ── Section Items ───────────────────────────────────────────────────────────── -->
	{#each sections as section, si (section.id)}
		<div
			class="section-drag-item"
			class:section-drag-item--dragging={section.id === sectionDragId}
			class:section-drag-item--drop-target={sectionDragId !== null && si === sectionDropIdx && section.id !== sectionDragId}
			class:section-drag-item--fullrow={section.layoutMode === 'horizontal_chip_row'}
		>
			<!-- ── Section Renderer ───────────────────────────────────────────────────────────── -->
			{#if section.layoutMode === 'horizontal_chip_row'}
				<SectionHorizontalChipRow
					{section}
					{pageId}
					onEditSection={onEditSection ? () => onEditSection(pageId, section.id) : undefined}
					onAddTile={onAddTile ? () => onAddTile(pageId, section.id, 1) : undefined}
				/>
			{:else}
				<SectionGrid
					{section}
					{pageId}
					onEditSection={onEditSection ? () => onEditSection(pageId, section.id) : undefined}
					onAddTile={onAddTile ? (activeColumns) => onAddTile(pageId, section.id, activeColumns) : undefined}
					onSectionDragStart={onSectionDragStart ? (event) => onSectionDragStart(event, section.id) : undefined}
				/>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* ── Section Grid ───────────────────────────────────────────────────────────── */
	.page-sections-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: start;
		gap: var(--custom-layout-card-padding);
		width: 100%;
	}

	.page-sections-grid > * {
		min-width: 0;
	}

	/* ── Responsive Grid ───────────────────────────────────────────────────────────── */
	@media (max-width: 1160px) {
		.page-sections-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 800px) {
		.page-sections-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: calc(var(--custom-layout-card-padding) * 1.7);
			row-gap: calc(var(--custom-layout-card-padding) * 1.45);
		}
	}

	/* ── Section Drag Preview ───────────────────────────────────────────────────────────── */
	.section-drag-item {
		transition: opacity 0.15s ease, transform 0.15s ease;
	}

	.section-drag-item--fullrow {
		grid-column: 1 / -1;
	}

	.section-drag-item--dragging {
		opacity: 0.4;
		transform: scale(0.97);
		pointer-events: none;
	}

	.section-drag-item--drop-target {
		position: relative;
	}

	.section-drag-item--drop-target::before {
		content: '';
		position: absolute;
		top: -4px;
		left: 0;
		right: 0;
		height: 3px;
		border-radius: 2px;
		background: var(--accent);
		box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 50%, transparent);
		z-index: 10;
	}

	.sections-dragging {
		cursor: grabbing;
	}
</style>
