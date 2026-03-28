// ── Tile Sizing ──────────────────────────────────────────────────────────────

// ── Imports ──────────────────────────────────────────────────────────────────
import type { TileSize, TileType, TileSizePreset } from '$lib/types/dashboard';
import type { Tile } from '$lib/types/dashboard';

// ── Preset Constants ─────────────────────────────────────────────────────────
const ALL_PRESETS: TileSizePreset[] = ['sm', 'md', 'lg', 'xl'];

// ── Preset Helpers ───────────────────────────────────────────────────────────
export function getAllowedPresets(type: TileType): TileSizePreset[] {
	void type;
	return ALL_PRESETS;
}

export function resolvePresetToSpan(
	type: TileType,
	sizePreset: TileSizePreset,
	breakpoint: 'sm' | 'md' | 'lg' = 'lg'
): TileSize {
	const preset = getAllowedPresets(type).includes(sizePreset)
		? sizePreset
		: getAllowedPresets(type)[0];

	let span: TileSize;
	// Unified preset semantics across all tile types.
	// Grid rows are half the height of a column (double-density).
	// sm  = {w:1,h:2} → 1 col  × 2 half-rows = 1×1 visual square
	// md  = {w:2,h:1} → 2 cols × 1 half-row  = 2×0.5 compact bar   ← the compact preset
	// lg  = {w:2,h:2} → 2 cols × 2 half-rows = 2×1 visual landscape
	// xl  = {w:2,h:4} → 2 cols × 4 half-rows = 2×2 visual square
	span =
		preset === 'sm' ? { w: 1, h: 2 } :
			preset === 'md' ? { w: 2, h: 1 } :
				preset === 'lg' ? { w: 2, h: 2 } :
					{ w: 2, h: 4 };

	if (breakpoint === 'sm') {
		return { w: Math.min(span.w, 4), h: span.h };
	}

	return span;
}

export function inferPresetFromLegacySize(type: TileType, size?: Partial<TileSize> | null): TileSizePreset {
	void type;
	const w = Math.max(1, size?.w ?? 1);
	const h = Math.max(1, size?.h ?? 1);

	let preset: TileSizePreset;
	// Thresholds match new double-density spans:
	// sm={w:1,h:2}, md={w:2,h:1}, lg={w:2,h:2}, xl={w:2,h:4}
	if (w <= 1 && h <= 2)       preset = 'sm';  // 1 col, up to 2 half-rows
	else if (w <= 2 && h <= 1)  preset = 'md';  // 2 cols, 1 half-row (compact)
	else if (w <= 2 && h <= 2)  preset = 'lg';  // 2 cols, up to 2 half-rows
	else                         preset = 'xl';  // anything taller

	const allowed = getAllowedPresets(type);
	if (allowed.includes(preset)) return preset;
	return allowed[0];
}

export function getTileSizePreset(tile: Tile): TileSizePreset {
	// Derive from live dimensions when available so resizing (drag or edit)
	// immediately switches the rendered tile variant (sm/md/lg/xl).
	const inferred = inferPresetFromLegacySize(tile.type, tile.layout ?? tile.size);
	const hasLiveSize =
		typeof tile.layout?.w === 'number' ||
		typeof tile.layout?.h === 'number' ||
		typeof tile.size?.w === 'number' ||
		typeof tile.size?.h === 'number';

	if (hasLiveSize) return inferred;
	if (tile.sizePreset && getAllowedPresets(tile.type).includes(tile.sizePreset)) {
		return tile.sizePreset;
	}
	return inferred;
}
