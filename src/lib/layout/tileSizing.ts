import type { TileSize, TileType, TileSizePreset } from '$lib/types/dashboard';
import type { Tile } from '$lib/types/dashboard';

const ALL_PRESETS: TileSizePreset[] = ['sm', 'md', 'lg', 'xl'];

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
	// Unified preset semantics across all tile types:
	// sm = 1x1, md = 2x1, lg = 2x2, xl = 2x3.
	span =
		preset === 'sm' ? { w: 1, h: 1 } :
			preset === 'md' ? { w: 2, h: 1 } :
				preset === 'lg' ? { w: 2, h: 2 } :
					{ w: 2, h: 3 };

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
	if (w <= 1 && h <= 1) preset = 'sm';
	else if (w <= 2 && h <= 1) preset = 'md';
	else if (w <= 2 && h <= 2) preset = 'lg';
	else preset = 'xl';

	const allowed = getAllowedPresets(type);
	if (allowed.includes(preset)) return preset;
	return allowed[0];
}

export function getTileSizePreset(tile: Tile): TileSizePreset {
	// Always derive from live dimensions when available so resizing (drag or edit)
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
