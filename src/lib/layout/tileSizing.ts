import type { TileSize, TileType, TileSizePreset } from '$lib/types/dashboard';

const ALL_PRESETS: TileSizePreset[] = ['sm', 'md', 'lg', 'xl'];

const CONTROL_TYPES = new Set<TileType>([
	'entity', 'light', 'fan', 'lock', 'button', 'remote', 'slider', 'input_select', 'timer',
	'humidifier', 'water_heater', 'siren', 'cover', 'update'
]);

const RICH_TYPES = new Set<TileType>([
	'climate', 'media_player', 'camera', 'weather', 'todo', 'energy', 'vacuum', 'lawn_mower',
	'calendar', 'history', 'gauge', 'statistic', 'logbook', 'map'
]);

function isMediumOnlyType(type: TileType): boolean {
	return ['clock', 'markdown', 'image', 'iframe', 'alarm_panel', 'person'].includes(type);
}

export function getAllowedPresets(type: TileType): TileSizePreset[] {
	if (type === 'divider') return ['lg', 'xl'];
	if (isMediumOnlyType(type)) return ['md', 'lg', 'xl'];
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
	if (type === 'divider') {
		span = preset === 'lg' ? { w: 6, h: 1 } : { w: 12, h: 1 };
	} else {
		// Standardized baseline footprints for initial placement:
		span =
			preset === 'sm' ? { w: 1, h: 1 } :
				preset === 'md' ? { w: 2, h: 1 } :
					preset === 'lg' ? { w: 3, h: 3 } :
						{ w: 4, h: 3 }; // xl
	}

	if (breakpoint === 'sm') {
		return { w: Math.min(span.w, 4), h: span.h };
	}

	return span;
}

export function inferPresetFromLegacySize(type: TileType, size?: Partial<TileSize> | null): TileSizePreset {
	const w = Math.max(1, size?.w ?? 1);
	const h = Math.max(1, size?.h ?? 1);
	const area = w * h;

	let preset: TileSizePreset;
	if (w <= 1 && h <= 1) preset = 'sm';
	else if ((w <= 2 && h <= 1) || (w <= 1 && h <= 2) || area <= 2) preset = 'md';
	else if (area <= 4 || (w <= 3 && h <= 1)) preset = 'lg';
	else preset = 'xl';

	const allowed = getAllowedPresets(type);
	if (allowed.includes(preset)) return preset;
	return allowed[0];
}
