import type { Section, Tile, TileLayout, TileSize } from '$lib/types/dashboard';
import { inferPresetFromLegacySize, resolvePresetToSpan } from '$lib/layout/tileSizing';

export const MOBILE_SECTION_COLS = 4;
export const DEFAULT_LAYOUT_MAX_COLS = 12;

export function getSectionMaxColumns(section: Section): number {
	const configured = section.grid.columns && section.grid.columns > 0 ? section.grid.columns : null;
	return configured ?? DEFAULT_LAYOUT_MAX_COLS;
}

export function getAdaptiveColumns(
	sectionWidth: number,
	baseSize: number,
	gap: number,
	maxColumns: number
): number {
	if (!sectionWidth) return Math.max(1, Math.min(maxColumns, 1));
	const fitCols = Math.max(1, Math.floor((sectionWidth + gap) / (baseSize + gap)));
	return Math.max(1, Math.min(fitCols, maxColumns));
}

function normalizeBox(box: Partial<TileLayout> | undefined, fallback: TileSize): TileLayout {
	return {
		x: Math.max(0, Math.floor(box?.x ?? 0)),
		y: Math.max(0, Math.floor(box?.y ?? 0)),
		w: Math.max(1, Math.floor(box?.w ?? fallback.w)),
		h: Math.max(1, Math.floor(box?.h ?? fallback.h))
	};
}

function canPlace(layout: TileLayout, occupied: Set<string>, cols: number): boolean {
	if (layout.x < 0 || layout.y < 0 || layout.w < 1 || layout.h < 1) return false;
	if (layout.x + layout.w > cols) return false;

	for (let row = layout.y; row < layout.y + layout.h; row += 1) {
		for (let col = layout.x; col < layout.x + layout.w; col += 1) {
			if (occupied.has(`${col}:${row}`)) return false;
		}
	}

	return true;
}

function occupy(layout: TileLayout, occupied: Set<string>) {
	for (let row = layout.y; row < layout.y + layout.h; row += 1) {
		for (let col = layout.x; col < layout.x + layout.w; col += 1) {
			occupied.add(`${col}:${row}`);
		}
	}
}

export function findFirstFitPosition(
	occupied: Set<string>,
	cols: number,
	size: TileSize,
	startY = 0
): TileLayout {
	const w = Math.max(1, Math.min(size.w, cols));
	const h = Math.max(1, size.h);
	let y = Math.max(0, startY);

	for (; y < 512; y += 1) {
		for (let x = 0; x <= cols - w; x += 1) {
			const candidate = { x, y, w, h };
			if (canPlace(candidate, occupied, cols)) return candidate;
		}
	}

	return { x: 0, y, w, h };
}

export function normalizeTilesForColumns(
	tiles: Tile[],
	cols: number
): Array<{ tile: Tile; layout: TileLayout }> {
	const occupied = new Set<string>();
	const normalized: Array<{ tile: Tile; layout: TileLayout }> = [];

	for (const tile of tiles) {
		const preset = tile.sizePreset ?? inferPresetFromLegacySize(tile.type, tile.size);
		const fallback = resolvePresetToSpan(tile.type, preset, cols <= MOBILE_SECTION_COLS ? 'sm' : 'lg');
		const preferred = normalizeBox(tile.layout, tile.size ?? fallback);
		const clamped = {
			...preferred,
			w: Math.min(preferred.w, cols)
		};
		const layout = canPlace(clamped, occupied, cols)
			? clamped
			: findFirstFitPosition(occupied, cols, clamped, clamped.y);

		occupy(layout, occupied);
		normalized.push({ tile, layout });
	}

	return normalized;
}

export function normalizeTilesForStorage(tiles: Tile[], cols: number): Tile[] {
	return normalizeTilesForColumns(tiles, cols).map(({ tile, layout }) => ({
		...tile,
		layout,
		sizePreset: tile.sizePreset ?? inferPresetFromLegacySize(tile.type, tile.size),
		// Keep legacy size in sync with the resolved snapped layout while the
		// old field still exists for migration compatibility.
		size: { w: layout.w, h: layout.h }
	}));
}

export function appendTileToLayout(tiles: Tile[], tile: Tile, cols: number): Tile[] {
	const normalized = normalizeTilesForStorage(tiles, cols);
	const occupied = new Set<string>();

	for (const existing of normalized) {
		if (!existing.layout) continue;
		occupy(existing.layout, occupied);
	}

	const preset = tile.sizePreset ?? inferPresetFromLegacySize(tile.type, tile.size);
	const fallback = tile.size ?? resolvePresetToSpan(tile.type, preset, 'lg');
	const layout = findFirstFitPosition(occupied, cols, tile.layout ?? fallback);

	return [
		...normalized,
		{
			...tile,
			sizePreset: preset,
			size: fallback,
			layout
		}
	];
}

export function resizeTileForPreset(
	section: Section,
	tiles: Tile[],
	tileId: string,
	sizePreset: NonNullable<Tile['sizePreset']>
): Tile[] {
	const cols = getSectionMaxColumns(section);
	const next = tiles.map((tile) => {
		if (tile.id !== tileId) return tile;
		const span = resolvePresetToSpan(tile.type, sizePreset, 'lg');
		return {
			...tile,
			sizePreset,
			size: span,
			layout: tile.layout
				? { ...tile.layout, w: span.w, h: span.h }
				: { x: 0, y: 0, w: span.w, h: span.h }
		};
	});

	return normalizeTilesForStorage(next, cols);
}
