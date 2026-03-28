import type { ThemeConfig } from '$lib/types/dashboard';
import { SYSTEM_THEMES, type ThemeDefinition, type VisualStyle } from '$lib/themes/presets';

// ── Theme Maps ──────────────────────────────────────────────────────────────

const RADIUS_MAP: Record<string, string> = {
	none: '0px',
	sm: '4px',
	md: '8px',
	lg: '12px',
	xl: '16px'
};

const TILE_RADIUS_MAP: Record<string, string> = {
	none: '0px',
	sm: '8px',
	md: '12px',
	lg: '16px',
	xl: '20px'
};

const DIALOG_RADIUS_MAP: Record<string, string> = {
	none: '0px',
	sm: '4px',
	md: '8px',
	lg: '12px',
	xl: '16px'
};

const FONT_SIZE_MAP: Record<string, string> = {
	sm: '13px',
	md: '14px',
	lg: '16px'
};

// ── Theme Resolution ────────────────────────────────────────────────────────

function resolveTheme(cfg: ThemeConfig): ThemeDefinition {
	const found = SYSTEM_THEMES.find((t) => t.id === cfg.themeId);
	return found ?? SYSTEM_THEMES[0];
}

function normalizeRadiusKey(key: string | undefined, fallback: keyof typeof RADIUS_MAP): keyof typeof RADIUS_MAP {
	// Backward compatibility for previously persisted "full" radius values.
	if (key === 'full') return 'xl';
	if (key && key in RADIUS_MAP) return key as keyof typeof RADIUS_MAP;
	return fallback;
}

// ── Theme Application ───────────────────────────────────────────────────────

export function applyTheme(cfg: ThemeConfig): void {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const theme = resolveTheme(cfg);
	const isDark = theme.colorScheme === 'dark';

	// ── Scheme class ────────────────────────────────────────────────────────
	root.classList.toggle('dark', isDark);
	root.classList.toggle('light', !isDark);
	root.style.setProperty('color-scheme', theme.colorScheme);

	// ── Stamp every color token from the theme — no interpolation ───────────
	for (const [prop, value] of Object.entries(theme.tokens)) {
		root.style.setProperty(prop, value as string);
	}
	const tokens = theme.tokens as unknown as Record<string, string>;

	// ── Global background on the shell ──────────────────────────────────────
	// --theme-bg-css is already stamped from tokens above (it's in ThemeTokens)

	// ── Shape — theme default, user can override ─────────────────────────────
	const radiusKey = normalizeRadiusKey(cfg.radius ?? theme.radius, 'lg');
	const tileRadiusKey = normalizeRadiusKey(cfg.tileRadius, 'md');
	const popupRadiusKey = normalizeRadiusKey(cfg.popupRadius, 'xl');
	const radius = RADIUS_MAP[radiusKey] ?? '12px';
	const tileRadius = TILE_RADIUS_MAP[tileRadiusKey] ?? '8%'; // md
	const dialogRadius = DIALOG_RADIUS_MAP[popupRadiusKey] ?? '16px'; // xl
	root.style.setProperty('--radius', radius);
	root.style.setProperty('--radius-sm', `calc(${radius} * 0.6)`);
	root.style.setProperty('--radius-lg', `calc(${radius} * 1.4)`);
	root.style.setProperty('--tile-radius', tileRadius);
	root.style.setProperty('--dialog-radius', dialogRadius);

	// ── Typography — theme default, user can override ─────────────────────────
	const fontFamily = cfg.font?.family ?? theme.font.family;
	const fontSize = cfg.font?.size ?? theme.font.size;
	const fontFam = `"${fontFamily}", system-ui, sans-serif`;
	const fontSizePx = FONT_SIZE_MAP[fontSize] ?? '14px';
	root.style.setProperty('--font-family', fontFam);
	root.style.setProperty('--font-size', fontSizePx);

	// ── Spacing — theme default, user can override ────────────────────────────
	const dense = cfg.dense ?? theme.dense ?? false;
	root.style.setProperty('--tile-padding', dense ? '8px' : '14px');
	root.style.setProperty('--tile-gap', dense ? '6px' : '10px');
	// HA custom:grid-layout default (used for page padding + section gap)
	root.style.setProperty(
		'--custom-layout-card-padding',
		tokens['--custom-layout-card-padding'] ?? '3.3vw'
	);

	// ── Motion ──────────────────────────────────────────────────────────────
	const anim = (cfg.animations ?? theme.animations ?? true);
	root.style.setProperty('--transition', anim ? '150ms ease' : '0ms');
	root.style.setProperty('--transition-slow', anim ? '300ms ease' : '0ms');
	root.style.setProperty('--transition-hover', anim ? '180ms ease' : '0ms');

	// ── Status colours (semantic globals) ─────────────────────────────────────
	// Respect theme-defined on/off semantics. Individual tile components decide
	// where those colors apply; the wrapper itself no longer force-tints cards.
	root.style.setProperty('--color-on', theme.tokens['--color-on']);
	root.style.setProperty('--color-off', theme.tokens['--color-off']);
	root.style.setProperty('--color-warning', '#f59e0b');
	root.style.setProperty('--color-danger', '#ef4444');
	root.style.setProperty('--color-info', '#3b82f6');

	// ── Tile visual style ─────────────────────────────────────────────────────
	root.classList.remove('vs-liquid', 'vs-sculpted', 'vs-vivid');
	root.classList.add(`vs-${theme.visualStyle}`);
	applyVisualStyle(root, theme.visualStyle, isDark);

	// Notify components that depend on computed theme vars.
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event('stratum:theme-applied'));
	}
}

// ── Visual Style Tokens ─────────────────────────────────────────────────────

function applyVisualStyle(root: HTMLElement, vs: VisualStyle, isDark: boolean): void {
	if (vs === 'liquid') {
		const bgA = isDark ? '0.68' : '0.86';
		const base = isDark
			? '0 10px 26px rgba(0 0 0 / 0.24)'
			: '0 10px 24px rgba(0 0 0 / 0.07)';
		const raised = isDark
			? '0 14px 34px rgba(0 0 0 / 0.30)'
			: '0 14px 30px rgba(0 0 0 / 0.10)';

		root.style.setProperty('--tile-bg', `rgba(var(--surface-rgb) / ${bgA})`);
		root.style.setProperty('--tile-border', '1px solid var(--border)');
		root.style.setProperty('--tile-shadow', base);
		root.style.setProperty('--tile-backdrop', 'blur(18px) saturate(1.1)');
		root.style.setProperty('--tile-active-shadow', base);
		root.style.setProperty('--tile-hover-shadow', raised);

	} else if (vs === 'sculpted') {
		const lift = isDark
			? '0 8px 20px rgba(0 0 0 / 0.22)'
			: '0 8px 18px rgba(0 0 0 / 0.06)';
		const raised = isDark
			? '0 12px 28px rgba(0 0 0 / 0.28)'
			: '0 12px 24px rgba(0 0 0 / 0.09)';
		const press = isDark
			? '0 6px 16px rgba(0 0 0 / 0.18)'
			: '0 6px 14px rgba(0 0 0 / 0.05)';

		root.style.setProperty('--tile-bg', 'var(--surface)');
		root.style.setProperty('--tile-border', '1px solid var(--border)');
		root.style.setProperty('--tile-shadow', lift);
		root.style.setProperty('--tile-backdrop', 'none');
		root.style.setProperty('--tile-active-shadow', press);
		root.style.setProperty('--tile-hover-shadow', raised);

	} else { // vivid
		root.style.setProperty('--tile-bg', 'var(--surface)');
		root.style.setProperty('--tile-border', '1px solid var(--border)');
		root.style.setProperty('--tile-shadow', 'none');
		root.style.setProperty('--tile-backdrop', 'none');
		root.style.setProperty('--tile-active-shadow',
			`0 2px 8px rgba(0, 0, 0, 0.08)`);
		root.style.setProperty('--tile-hover-shadow', 'none');
	}
}

// ── System Scheme Watcher ───────────────────────────────────────────────────

export function watchSystemScheme(
	getCurrentCfg: () => { theme: ThemeConfig }
): () => void {
	if (typeof window === 'undefined') return () => { };
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	const handler = () => {
		const current = getCurrentCfg();
		applyTheme(current.theme);
	};
	mq.addEventListener('change', handler);
	return () => mq.removeEventListener('change', handler);
}

// ── Backward-Compatible API ────────────────────────────────────────────────

export function applyBackground() { /* no-op — background lives in theme tokens */ }
