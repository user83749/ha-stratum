/**
 * Custom icon registry — maps short names to sizing metadata.
 * The actual SVG rendering lives in CustomIcon.svelte.
 *
 * Usage: type "floorlamp", "gate", "tv", etc. in the icon override field.
 */

export interface CustomIconMeta {
	/** Width as % of the icon-inner container */
	width: string;
	/** Negative left-margin offset for alignment */
	marginLeft: string;
	/** Top-margin offset for alignment */
	marginTop: string;
	/** Optional positioning overrides for special icon alignment */
	position?: 'absolute' | 'relative' | 'static';
	left?: string;
	right?: string;
	top?: string;
	bottom?: string;
	overflow?: 'visible' | 'hidden';
	/** Whether the icon reacts to entity state */
	dynamic: boolean;
}

// ── Aliases ─────────────────────────────────────────────────────────────────

// Backward-compatible aliases for renamed icons.
const CUSTOM_ICON_ALIASES: Record<string, string> = {
	fan2: 'fan',
	gate: 'customgate'
};

// ── Registry ────────────────────────────────────────────────────────────────

export const CUSTOM_ICONS: Record<string, CustomIconMeta> = {
	plex: { width: '77%', marginLeft: '0%', marginTop: '0%', dynamic: false },
	floorlamp: { width: '87%', marginLeft: '-18%', marginTop: '-.1%', dynamic: true },
	// Gate icon uses absolute positioning with a top offset.
	customgate: { width: '80%', marginLeft: '-3%', marginTop: '0%', position: 'absolute', left: '0', top: '-4%', overflow: 'visible', dynamic: true },
	garage: { width: '77%', marginLeft: '-7%', marginTop: '-15%', dynamic: true },
	bedroom: { width: '76%', marginLeft: '-1%', marginTop: '0%', dynamic: true },
	kodi: { width: '77%', marginLeft: '0%', marginTop: '0%', dynamic: false },
	spa: { width: '78%', marginLeft: '-2%', marginTop: '0%', dynamic: true },
	movie: { width: '76%', marginLeft: '-1%', marginTop: '0%', dynamic: true },
	pool: { width: '76%', marginLeft: '1%', marginTop: '0%', dynamic: true },
	relax: { width: '76%', marginLeft: '-1%', marginTop: '0%', dynamic: true },
	cam: { width: '80%', marginLeft: '-10%', marginTop: '-1%', dynamic: true },
	camera: { width: '95%', marginLeft: '-5%', marginTop: '10%', dynamic: false },
	apple_tv: { width: '77%', marginLeft: '0%', marginTop: '0%', dynamic: false },
	spotify: { width: '77%', marginLeft: '0%', marginTop: '0%', dynamic: false },
	nest_mini: { width: '77%', marginLeft: '0%', marginTop: '0%', dynamic: false },
	play_pause: { width: '25%', marginLeft: '0%', marginTop: '0%', dynamic: true },
	hue: { width: '77%', marginLeft: '-14%', marginTop: '1%', dynamic: true },
	shade: { width: '77%', marginLeft: '-15%', marginTop: '1%', dynamic: true },
	tv: { width: '87%', marginLeft: '0%', marginTop: '-8%', dynamic: true },
	ps5: { width: '89%', marginLeft: '-2%', marginTop: '-9%', dynamic: true },
	spot: { width: '74%', marginLeft: '-8%', marginTop: '3%', dynamic: true },
	imac: { width: '80%', marginLeft: '1%', marginTop: '-5%', dynamic: true },
	monitors: { width: '73%', marginLeft: '-9%', marginTop: '0%', dynamic: true },
	lamp: { width: '79%', marginLeft: '-16%', marginTop: '0%', dynamic: true },
	tvlights: { width: '77%', marginLeft: '-10%', marginTop: '-1%', dynamic: true },
	climate: { width: '78%', marginLeft: '-10%', marginTop: '0%', dynamic: true },
	bathroom: { width: '78%', marginLeft: '-10%', marginTop: '0%', dynamic: true },
	fan: { width: '75%', marginLeft: '-3%', marginTop: '0%', dynamic: true },
	closet: { width: '80%', marginLeft: '-16%', marginTop: '0%', dynamic: true },
	away: { width: '79%', marginLeft: '-1%', marginTop: '-1%', dynamic: true },
	home: { width: '72%', marginLeft: '-1%', marginTop: '0%', dynamic: true },
	sleep: { width: '76%', marginLeft: '-1%', marginTop: '0%', dynamic: true },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

export const CUSTOM_ICON_NAMES = Object.keys(CUSTOM_ICONS).sort((a, b) => a.localeCompare(b));

export function isCustomIcon(name: string): boolean {
	const resolved = CUSTOM_ICON_ALIASES[name] ?? name;
	return resolved in CUSTOM_ICONS;
}

export function getCustomIconMeta(name: string): CustomIconMeta | null {
	const resolved = CUSTOM_ICON_ALIASES[name] ?? name;
	return CUSTOM_ICONS[resolved] ?? null;
}
