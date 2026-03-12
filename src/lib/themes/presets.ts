import type { PageBackground } from '$lib/types/dashboard';

// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Comprehensive Theme Library
// A massive collection of high-end, elegant, modern themes.
// STRICTLY NEUTRAL surfaces and text. Gradients provide the backdrop, 
// but the UI elements remain clean and sophisticated glass/solid layers.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeTokens {
	'--theme-bg-css': string;
	'--bg': string;
	'--bg-elevated': string;
	'--surface': string;
	'--surface-rgb': string;
	'--fg': string;
	'--fg-muted': string;
	'--fg-subtle': string;
	'--border': string;
	'--border-strong': string;
	'--hover': string; // Light/subtle shift on hover
	'--active': string;
	'--accent': string;
	'--accent-rgb': string;
	'--accent-fg': string;
	'--shadow': string;
	'--shadow-lg': string;
	'--color-on': string;
	'--color-off': string;
}

export type VisualStyle = 'liquid' | 'sculpted' | 'vivid';
export type RadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type FontSize = 'sm' | 'md' | 'lg';

export interface ThemeDefinition {
	id: string;
	name: string;
	description: string;
	colorScheme: 'dark' | 'light';
	visualStyle: VisualStyle;
	radius: RadiusScale;
	font: { family: string; size: FontSize };
	dense: boolean;
	animations: boolean;
	tokens: ThemeTokens;
	defaultBackground: PageBackground;
	preview: {
		canvas: string;
		card: string;
		accent: string;
		text: string;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// The Gradient Collection (Bold Backgrounds, Strictly Neutral Cards)
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_NEBULA: ThemeDefinition = {
	id: 'nebula', name: 'Furnace Line',
	description: 'Warm neutral gradient with restrained amber accents and clean low-contrast surfaces.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'md', font: { family: 'Manrope', size: 'md' },
	dense: false, animations: true,
	preview: {
		canvas: 'radial-gradient(circle at 16% 14%, #8a430f 0%, #341808 28%, #0b0908 68%, #050505 100%)',
		card: '#1b1f22',
		accent: '#f59e0b',
		text: '#f7f3ea'
	},
	tokens: {
		'--theme-bg-css': 'radial-gradient(circle at 14% 12%, #221003 0%, #180b05 22%, #080706 54%, #040404 100%)',
		'--bg': '#101214',
		'--bg-elevated': '#191d20',
		'--surface': '#1b1f22',
		'--surface-rgb': '27 31 34',
		'--fg': '#f7f3ea',
		'--fg-muted': '#c5bbb0',
		'--fg-subtle': '#8f857c',
		'--border': 'rgba(247, 243, 234, 0.08)',
		'--border-strong': 'rgba(247, 243, 234, 0.15)',
		'--hover': 'rgba(255, 255, 255, 0.045)',
		'--active': 'rgba(245, 158, 11, 0.12)',
		'--accent': '#f59e0b',
		'--accent-rgb': '245 158 11',
		'--accent-fg': '#1a1208',
		'--shadow': '0 10px 28px rgba(0, 0, 0, 0.38)',
		'--shadow-lg': '0 24px 60px rgba(0, 0, 0, 0.52)',
		'--color-on': '#f59e0b',
		'--color-off': '#3a4046'
	},
	defaultBackground: {
		type: 'gradient',
		value: 'radial-gradient(circle at 14% 12%, #221003 0%, #180b05 22%, #080706 54%, #040404 100%)'
	}
};

export const THEME_AURORA_BOREALIS: ThemeDefinition = {
	id: 'aurora-borealis', name: 'Aurora Borealis',
	description: 'Lush emerald gradient. Pitch-black contrasting cards.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'xl', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(circle at top right, #004d40, #000000 60%, #00251a)', card: '#050505', accent: '#2dd4bf', text: '#ffffff' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(circle at top right, #004d40, #000000 60%, #00251a)', '--bg': '#000000', '--bg-elevated': '#050505', '--surface': '#050505', '--surface-rgb': '5 5 5',
		'--fg': '#ffffff', '--fg-muted': '#a1a1aa', '--fg-subtle': '#71717a', '--border': 'rgba(255, 255, 255, 0.1)', '--border-strong': 'rgba(255, 255, 255, 0.2)',
		'--hover': 'rgba(255, 255, 255, 0.05)', '--active': 'rgba(255, 255, 255, 0.1)', '--accent': '#2dd4bf', '--accent-rgb': '45 212 191', '--accent-fg': '#000000',
		'--shadow': '0 10px 40px rgba(0, 0, 0, 0.8)', '--shadow-lg': '0 20px 60px rgba(0, 0, 0, 1)', '--color-on': '#2dd4bf', '--color-off': 'rgba(255, 255, 255, 0.1)'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(circle at top right, #004d40, #000000 60%, #00251a)' }
};

export const THEME_ACID_GRAPHITE: ThemeDefinition = {
	id: 'acid-graphite', name: 'Acid Graphite',
	description: 'High-contrast industrial aesthetic. Incandescent neon lime accents on deep architectural slate.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'md', font: { family: 'Geist', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 100%)', card: '#1e293b', accent: '#d4ff00', text: '#f8fafc' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 100%)',
		'--bg': '#0f172a', '--bg-elevated': '#1e293b', '--surface': '#1e293b', '--surface-rgb': '30 41 59',
		'--fg': '#f8fafc', '--fg-muted': '#94a3b8', '--fg-subtle': '#64748b', '--border': 'rgba(212, 255, 0, 0.05)', '--border-strong': 'rgba(212, 255, 0, 0.12)',
		'--hover': 'rgba(212, 255, 0, 0.04)', '--active': 'rgba(212, 255, 0, 0.15)', '--accent': '#d4ff00', '--accent-rgb': '212 255 0', '--accent-fg': '#000000',
		'--shadow': '0 8px 30px rgba(0, 0, 0, 0.4)', '--shadow-lg': '0 20px 50px rgba(0, 0, 0, 0.6)', '--color-on': '#d4ff00', '--color-off': '#334155'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(circle at 20% 20%, #1e293b 0%, #0f172a 100%)' }
};

export const THEME_NEON_TOKYO: ThemeDefinition = {
	id: 'neon-tokyo', name: 'Neon Tokyo',
	description: 'Electric cyberpunk nightscape. Hot magenta and deep blue mesh with vivid cyan accents.',
	colorScheme: 'dark', visualStyle: 'liquid', radius: 'xl', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(at 20% 80%, #4a0030 0, transparent 50%), radial-gradient(at 80% 20%, #0a1744 0, transparent 50%), #08040e', card: 'rgba(20, 8, 30, 0.85)', accent: '#22d3ee', text: '#f0e6ff' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(at 15% 85%, #4a0030 0, transparent 55%), radial-gradient(at 85% 15%, #0a1744 0, transparent 55%), radial-gradient(at 50% 50%, #120824 0, transparent 70%), #08040e',
		'--bg': '#08040e', '--bg-elevated': '#120a1c', '--surface': '#10081a', '--surface-rgb': '16 8 26',
		'--fg': '#f0e6ff', '--fg-muted': '#b0a0c8', '--fg-subtle': '#6b5a80', '--border': 'rgba(200, 160, 255, 0.08)', '--border-strong': 'rgba(200, 160, 255, 0.16)',
		'--hover': 'rgba(200, 160, 255, 0.05)', '--active': 'rgba(34, 211, 238, 0.12)', '--accent': '#22d3ee', '--accent-rgb': '34 211 238', '--accent-fg': '#000000',
		'--shadow': '0 8px 32px rgba(0, 0, 0, 0.6)', '--shadow-lg': '0 20px 48px rgba(0, 0, 0, 0.8)', '--color-on': '#22d3ee', '--color-off': '#1c1228'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(at 15% 85%, #4a0030 0, transparent 55%), radial-gradient(at 85% 15%, #0a1744 0, transparent 55%), radial-gradient(at 50% 50%, #120824 0, transparent 70%), #08040e' }
};

export const THEME_OCEANIC = THEME_NEON_TOKYO;
export const THEME_STUDIO_MINIMAL = THEME_NEON_TOKYO;


export const THEME_CRIMSON_FORGE: ThemeDefinition = {
	id: 'crimson-forge', name: 'Crimson Forge',
	description: 'Forged in darkness. Pitch-black architectural surfaces resting on a glowing deep crimson and magma backdrop.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'md', font: { family: 'Inter', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(ellipse at 30% 40%, #250505 0%, #100202 45%, #050101 75%, #000000 100%)', card: '#0a0a0a', accent: '#ef4444', text: '#f8fafc' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(ellipse at 30% 40%, #250505 0%, #100202 45%, #050101 75%, #000000 100%)',
		'--bg': '#000000', '--bg-elevated': '#0a0a0a', '--surface': '#0a0a0a', '--surface-rgb': '10 10 10',
		'--fg': '#f8fafc', '--fg-muted': '#94a3b8', '--fg-subtle': '#475569', '--border': 'rgba(239, 68, 68, 0.15)', '--border-strong': 'rgba(239, 68, 68, 0.3)',
		'--hover': 'rgba(239, 68, 68, 0.08)', '--active': 'rgba(239, 68, 68, 0.2)', '--accent': '#ef4444', '--accent-rgb': '239 68 68', '--accent-fg': '#ffffff',
		'--shadow': '0 8px 30px rgba(0, 0, 0, 0.8)', '--shadow-lg': '0 20px 50px rgba(0, 0, 0, 0.95)', '--color-on': '#ef4444', '--color-off': '#1e1e1e'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 30% 40%, #250505 0%, #100202 45%, #050101 75%, #000000 100%)' }
};

export const THEME_TITANIUM: ThemeDefinition = {
	id: 'titanium', name: 'Titanium',
	description: 'Sleek dark metallic. Deep contrasting pitch black cards.',
	colorScheme: 'dark', visualStyle: 'vivid', radius: 'md', font: { family: 'Inter', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'linear-gradient(to right, #434343 0%, #000000 100%)', card: '#050505', accent: '#38bdf8', text: '#ffffff' },
	tokens: {
		'--theme-bg-css': 'linear-gradient(to bottom right, #434343 0%, #111111 60%, #000000 100%)', '--bg': '#000000', '--bg-elevated': '#09090b', '--surface': '#050505', '--surface-rgb': '5 5 5',
		'--fg': '#ffffff', '--fg-muted': '#a1a1aa', '--fg-subtle': '#71717a', '--border': 'rgba(255, 255, 255, 0.1)', '--border-strong': 'rgba(255, 255, 255, 0.2)',
		'--hover': 'rgba(255, 255, 255, 0.05)', '--active': 'rgba(255, 255, 255, 0.1)', '--accent': '#38bdf8', '--accent-rgb': '56 189 248', '--accent-fg': '#000000',
		'--shadow': '0 10px 30px rgba(0, 0, 0, 0.9)', '--shadow-lg': '0 20px 50px rgba(0, 0, 0, 1)', '--color-on': '#38bdf8', '--color-off': 'rgba(255, 255, 255, 0.1)'
	},
	defaultBackground: { type: 'gradient', value: 'linear-gradient(to right, #434343 0%, #111111 60%, #000000 100%)' }
};

// ─────────────────────────────────────────────────────────────────────────────
// The Luxury Collection (Premium, Minimalist, High-End Neutrals)
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_ONYX: ThemeDefinition = {
	id: 'onyx', name: 'Onyx Reserve',
	description: 'Premium charcoal dark mode. Strictly monochrome styling.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'md', font: { family: 'Inter', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: '#09090b', card: '#18181b', accent: '#ffffff', text: '#ffffff' },
	tokens: {
		'--theme-bg-css': '#09090b', '--bg': '#09090b', '--bg-elevated': '#18181b', '--surface': '#18181b', '--surface-rgb': '24 24 27',
		'--fg': '#ffffff', '--fg-muted': '#a1a1aa', '--fg-subtle': '#71717a', '--border': 'rgba(255, 255, 255, 0.08)', '--border-strong': 'rgba(255, 255, 255, 0.15)',
		'--hover': 'rgba(255, 255, 255, 0.05)', '--active': 'rgba(255, 255, 255, 0.1)', '--accent': '#ffffff', '--accent-rgb': '255 255 255', '--accent-fg': '#000000',
		'--shadow': '0 4px 12px rgba(0, 0, 0, 0.4)', '--shadow-lg': '0 10px 30px rgba(0, 0, 0, 0.6)', '--color-on': '#ffffff', '--color-off': '#27272a'
	},
	defaultBackground: { type: 'solid', value: '#09090b' }
};

export const THEME_TERRACOTTA: ThemeDefinition = {
	id: 'terracotta', name: 'Terracotta',
	description: 'Warm earthy clay tones with rustic burnt orange accents. Grounded and natural.',
	colorScheme: 'light', visualStyle: 'vivid', radius: 'lg', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: '#f0e6dd', card: '#faf6f1', accent: '#c2410c', text: '#2c1810' },
	tokens: {
		'--theme-bg-css': 'linear-gradient(170deg, #f0e6dd 0%, #ecddd0 50%, #efe3d8 100%)', '--bg': '#f0e6dd', '--bg-elevated': '#f6f0ea', '--surface': '#faf6f1', '--surface-rgb': '250 246 241',
		'--fg': '#2c1810', '--fg-muted': '#5c4436', '--fg-subtle': '#9a8578', '--border': 'rgba(44, 24, 16, 0.08)', '--border-strong': 'rgba(44, 24, 16, 0.14)',
		'--hover': 'rgba(44, 24, 16, 0.04)', '--active': 'rgba(194, 65, 12, 0.1)', '--accent': '#c2410c', '--accent-rgb': '194 65 12', '--accent-fg': '#ffffff',
		'--shadow': '0 3px 10px rgba(60, 30, 15, 0.06)', '--shadow-lg': '0 14px 36px rgba(60, 30, 15, 0.1)', '--color-on': '#c2410c', '--color-off': '#d8ccc2'
	},
	defaultBackground: { type: 'gradient', value: 'linear-gradient(170deg, #f0e6dd 0%, #ecddd0 50%, #efe3d8 100%)' }
};

export const THEME_MATCHA_LATTE: ThemeDefinition = {
	id: 'matcha-latte', name: 'Matcha Latte',
	description: 'Serene sage-green canvas with warm cream cards. Calm, organic, natural.',
	colorScheme: 'light', visualStyle: 'sculpted', radius: 'xl', font: { family: 'DM Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: '#e8ede4', card: '#f9f7f2', accent: '#2d6a4f', text: '#1b2e1f' },
	tokens: {
		'--theme-bg-css': 'linear-gradient(160deg, #e8ede4 0%, #dde5d6 40%, #e4e8df 100%)', '--bg': '#e8ede4', '--bg-elevated': '#f4f2ec', '--surface': '#f9f7f2', '--surface-rgb': '249 247 242',
		'--fg': '#1b2e1f', '--fg-muted': '#4a5d4e', '--fg-subtle': '#8a9a8d', '--border': 'rgba(27, 46, 31, 0.08)', '--border-strong': 'rgba(27, 46, 31, 0.15)',
		'--hover': 'rgba(27, 46, 31, 0.04)', '--active': 'rgba(45, 106, 79, 0.1)', '--accent': '#2d6a4f', '--accent-rgb': '45 106 79', '--accent-fg': '#ffffff',
		'--shadow': '0 4px 14px rgba(30, 50, 30, 0.06)', '--shadow-lg': '0 16px 40px rgba(30, 50, 30, 0.1)', '--color-on': '#2d6a4f', '--color-off': '#c8d0c4'
	},
	defaultBackground: { type: 'gradient', value: 'linear-gradient(160deg, #e8ede4 0%, #dde5d6 40%, #e4e8df 100%)' }
};

export const THEME_VELVET_NOIR: ThemeDefinition = {
	id: 'velvet-noir', name: 'Velvet Noir',
	description: 'Luxurious dark wine undertones with brushed gold accents. Rich and opulent.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'lg', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(ellipse at 70% 60%, #1a0a12 0%, #0c0608 60%, #060304 100%)', card: '#110a0e', accent: '#d4a574', text: '#f2e8e0' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(ellipse at 70% 60%, #1a0a12 0%, #0c0608 60%, #060304 100%)', '--bg': '#060304', '--bg-elevated': '#0e0810', '--surface': '#110a0e', '--surface-rgb': '17 10 14',
		'--fg': '#f2e8e0', '--fg-muted': '#b8a8a0', '--fg-subtle': '#786860', '--border': 'rgba(212, 165, 116, 0.08)', '--border-strong': 'rgba(212, 165, 116, 0.16)',
		'--hover': 'rgba(212, 165, 116, 0.05)', '--active': 'rgba(212, 165, 116, 0.12)', '--accent': '#d4a574', '--accent-rgb': '212 165 116', '--accent-fg': '#0a0604',
		'--shadow': '0 4px 16px rgba(0, 0, 0, 0.5)', '--shadow-lg': '0 20px 48px rgba(0, 0, 0, 0.7)', '--color-on': '#d4a574', '--color-off': '#1e1418'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 70% 60%, #1a0a12 0%, #0c0608 60%, #060304 100%)' }
};

export const THEME_SAKURA: ThemeDefinition = {
	id: 'sakura', name: 'Sakura Cloud',
	description: 'Soft pastel background strictly contrasted with pure white cards.',
	colorScheme: 'light', visualStyle: 'vivid', radius: 'lg', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: '#faf5f6', card: '#ffffff', accent: '#000000', text: '#000000' },
	tokens: {
		'--theme-bg-css': '#faf5f6', '--bg': '#faf5f6', '--bg-elevated': '#ffffff', '--surface': '#ffffff', '--surface-rgb': '255 255 255',
		'--fg': '#000000', '--fg-muted': '#52525b', '--fg-subtle': '#a1a1aa', '--border': 'rgba(0, 0, 0, 0.05)', '--border-strong': 'rgba(0, 0, 0, 0.1)',
		'--hover': 'rgba(0, 0, 0, 0.03)', '--active': 'rgba(0, 0, 0, 0.06)', '--accent': '#000000', '--accent-rgb': '0 0 0', '--accent-fg': '#ffffff',
		'--shadow': '0 4px 12px rgba(0, 0, 0, 0.04)', '--shadow-lg': '0 16px 40px rgba(0, 0, 0, 0.07)', '--color-on': '#000000', '--color-off': '#e5e5e5'
	},
	defaultBackground: { type: 'solid', value: '#faf5f6' }
};

export const THEME_SILICON: ThemeDefinition = {
	id: 'silicon', name: 'Silicon Fluid',
	description: 'Pristine neutral tones. Bright solid cards above.',
	colorScheme: 'light', visualStyle: 'liquid', radius: 'lg', font: { family: 'Inter', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(circle at top left, #f9fafb, #f3f4f6, #e5e7eb)', card: '#ffffff', accent: '#000000', text: '#000000' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(circle at top left, #f9fafb, #f3f4f6, #e5e7eb)', '--bg': '#ffffff', '--bg-elevated': '#ffffff', '--surface': '#ffffff', '--surface-rgb': '255 255 255',
		'--fg': '#000000', '--fg-muted': '#52525b', '--fg-subtle': '#a1a1aa', '--border': 'rgba(0, 0, 0, 0.05)', '--border-strong': 'rgba(0, 0, 0, 0.1)',
		'--hover': 'rgba(0, 0, 0, 0.03)', '--active': 'rgba(0, 0, 0, 0.06)', '--accent': '#000000', '--accent-rgb': '0 0 0', '--accent-fg': '#ffffff',
		'--shadow': '0 8px 32px rgba(0, 0, 0, 0.05)', '--shadow-lg': '0 24px 64px rgba(0, 0, 0, 0.1)', '--color-on': '#000000', '--color-off': 'rgba(0, 0, 0, 0.05)'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(circle at top left, #f9fafb, #f3f4f6, #e5e7eb)' }
};

// ─────────────────────────────────────────────────────────────────────────────
// The Classic Collection (The Original Revamped to be Strictly Neutral)
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_MIDNIGHT: ThemeDefinition = {
	id: 'midnight', name: 'Classic Midnight',
	description: 'Cosmic indigo gradient. Cards are firmly neutral jet black.',
	colorScheme: 'dark', visualStyle: 'liquid', radius: 'lg', font: { family: 'Inter', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(ellipse at 30% 40%, #1e1254 0%, #0d0b1e 55%, #07060f 100%)', card: 'rgba(0, 0, 0, 0.7)', accent: '#818cf8', text: '#ffffff' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(ellipse at 30% 40%, #1e1254 0%, #0d0b1e 55%, #07060f 100%)', '--bg': '#000000', '--bg-elevated': '#09090b', '--surface': '#000000', '--surface-rgb': '0 0 0',
		'--fg': '#ffffff', '--fg-muted': '#a1a1aa', '--fg-subtle': '#71717a', '--border': 'rgba(255, 255, 255, 0.1)', '--border-strong': 'rgba(255, 255, 255, 0.2)',
		'--hover': 'rgba(255, 255, 255, 0.05)', '--active': 'rgba(255, 255, 255, 0.1)', '--accent': '#818cf8', '--accent-rgb': '129 140 248', '--accent-fg': '#ffffff',
		'--shadow': '0 4px 24px rgba(0, 0, 0, 0.6)', '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.8)', '--color-on': '#818cf8', '--color-off': 'rgba(255, 255, 255, 0.1)'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 30% 40%, #1e1254 0%, #0d0b1e 55%, #07060f 100%)' }
};

export const THEME_OBSIDIAN: ThemeDefinition = {
	id: 'obsidian', name: 'Pure Obsidian',
	description: 'Pure OLED black void. Clean architectural lines.',
	colorScheme: 'dark', visualStyle: 'sculpted', radius: 'md', font: { family: 'Geist', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: '#000000', card: '#09090b', accent: '#ffffff', text: '#ffffff' },
	tokens: {
		'--theme-bg-css': '#000000', '--bg': '#000000', '--bg-elevated': '#09090b', '--surface': '#09090b', '--surface-rgb': '9 9 11',
		'--fg': '#ffffff', '--fg-muted': '#a1a1aa', '--fg-subtle': '#71717a', '--border': 'rgba(255, 255, 255, 0.1)', '--border-strong': 'rgba(255, 255, 255, 0.2)',
		'--hover': 'rgba(255, 255, 255, 0.05)', '--active': 'rgba(255, 255, 255, 0.1)', '--accent': '#ffffff', '--accent-rgb': '255 255 255', '--accent-fg': '#000000',
		'--shadow': '8px 8px 20px rgba(0, 0, 0, 0.9)', '--shadow-lg': '16px 16px 40px rgba(0, 0, 0, 1)', '--color-on': '#ffffff', '--color-off': '#27272a'
	},
	defaultBackground: { type: 'solid', value: '#000000' }
};

export const THEME_DEEP_OCEAN: ThemeDefinition = {
	id: 'deep-ocean', name: 'Deep Ocean',
	description: 'Abyssal marine depths with bioluminescent aqua accents. Mysterious and immersive.',
	colorScheme: 'dark', visualStyle: 'vivid', radius: 'lg', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'radial-gradient(ellipse at 30% 80%, #0a2e3d 0%, #061620 50%, #020a0e 100%)', card: '#060e14', accent: '#4ade80', text: '#d8f0f4' },
	tokens: {
		'--theme-bg-css': 'radial-gradient(ellipse at 30% 80%, #0a2e3d 0%, #061620 50%, #020a0e 100%)', '--bg': '#020a0e', '--bg-elevated': '#081218', '--surface': '#060e14', '--surface-rgb': '6 14 20',
		'--fg': '#d8f0f4', '--fg-muted': '#88b0bc', '--fg-subtle': '#506a74', '--border': 'rgba(100, 200, 220, 0.08)', '--border-strong': 'rgba(100, 200, 220, 0.16)',
		'--hover': 'rgba(100, 200, 220, 0.04)', '--active': 'rgba(74, 222, 128, 0.1)', '--accent': '#4ade80', '--accent-rgb': '74 222 128', '--accent-fg': '#020a0e',
		'--shadow': '0 4px 24px rgba(0, 0, 0, 0.7)', '--shadow-lg': '0 16px 64px rgba(0, 0, 0, 0.85)', '--color-on': '#4ade80', '--color-off': '#0c1a22'
	},
	defaultBackground: { type: 'gradient', value: 'radial-gradient(ellipse at 30% 80%, #0a2e3d 0%, #061620 50%, #020a0e 100%)' }
};

export const THEME_POLAR_ICE: ThemeDefinition = {
	id: 'polar-ice', name: 'Polar Ice',
	description: 'Cool Arctic-inspired palette. Icy blue-white canvas with subtle blue-tinted surfaces and deep navy accents.',
	colorScheme: 'light', visualStyle: 'sculpted', radius: 'lg', font: { family: 'Plus Jakarta Sans', size: 'md' },
	dense: false, animations: true,
	preview: { canvas: 'linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%)', card: '#f8fbff', accent: '#0f172a', text: '#020617' },
	tokens: {
		'--theme-bg-css': 'linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%)', '--bg': '#f0f7ff', '--bg-elevated': '#ffffff', '--surface': '#f8fbff', '--surface-rgb': '248 251 255',
		'--fg': '#020617', '--fg-muted': '#475569', '--fg-subtle': '#94a3b8', '--border': 'rgba(15, 23, 42, 0.06)', '--border-strong': 'rgba(15, 23, 42, 0.12)',
		'--hover': 'rgba(15, 23, 42, 0.04)', '--active': 'rgba(15, 23, 42, 0.08)', '--accent': '#0f172a', '--accent-rgb': '15 23 42', '--accent-fg': '#ffffff',
		'--shadow': '0 4px 14px rgba(0, 20, 40, 0.05)', '--shadow-lg': '0 16px 40px rgba(0, 20, 40, 0.1)', '--color-on': '#0f172a', '--color-off': '#cbd5e1'
	},
	defaultBackground: { type: 'gradient', value: 'linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%)' }
};

export const THEME_DRAFTWORK: ThemeDefinition = {
	id: 'draftwork', name: 'Draftwork',
	description: 'Architectural paper tones with blueprint-blue accents. Crisp, technical, and intentionally unsentimental.',
	colorScheme: 'light', visualStyle: 'vivid', radius: 'md', font: { family: 'Geist', size: 'md' },
	dense: false, animations: true,
	preview: {
		canvas: 'linear-gradient(180deg, rgba(25, 77, 122, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(25, 77, 122, 0.07) 1px, transparent 1px), linear-gradient(160deg, #f6f2ea 0%, #edf2f5 100%)',
		card: '#fcfbf7',
		accent: '#1d4ed8',
		text: '#111827'
	},
	tokens: {
		'--theme-bg-css': 'linear-gradient(180deg, rgba(25, 77, 122, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(25, 77, 122, 0.06) 1px, transparent 1px), linear-gradient(160deg, #f6f2ea 0%, #eef2f5 52%, #e8eef2 100%)',
		'--bg': '#f2eee7', '--bg-elevated': '#f8f6f1', '--surface': '#fcfbf7', '--surface-rgb': '252 251 247',
		'--fg': '#111827', '--fg-muted': '#475569', '--fg-subtle': '#8b98a8', '--border': 'rgba(17, 24, 39, 0.08)', '--border-strong': 'rgba(17, 24, 39, 0.16)',
		'--hover': 'rgba(29, 78, 216, 0.05)', '--active': 'rgba(29, 78, 216, 0.10)', '--accent': '#1d4ed8', '--accent-rgb': '29 78 216', '--accent-fg': '#ffffff',
		'--shadow': '0 1px 0 rgba(17, 24, 39, 0.04), 0 10px 24px rgba(17, 24, 39, 0.06)', '--shadow-lg': '0 18px 44px rgba(17, 24, 39, 0.10)', '--color-on': '#1d4ed8', '--color-off': '#d5dbe3'
	},
	defaultBackground: {
		type: 'gradient',
		value: 'linear-gradient(180deg, rgba(25, 77, 122, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(25, 77, 122, 0.06) 1px, transparent 1px), linear-gradient(160deg, #f6f2ea 0%, #eef2f5 52%, #e8eef2 100%)'
	}
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SYSTEM_THEMES: ThemeDefinition[] = [
	// Gradients
	THEME_NEBULA,
	THEME_AURORA_BOREALIS,
	THEME_ACID_GRAPHITE,
	THEME_NEON_TOKYO,
	THEME_CRIMSON_FORGE,
	THEME_TITANIUM,

	// Luxury Collection
	THEME_ONYX,
	THEME_TERRACOTTA,
	THEME_MATCHA_LATTE,
	THEME_VELVET_NOIR,
	THEME_SAKURA,
	THEME_SILICON,

	// Classic Revival
	THEME_MIDNIGHT,
	THEME_OBSIDIAN,
	THEME_DEEP_OCEAN,
	THEME_POLAR_ICE,
	THEME_DRAFTWORK
];

export function getSystemTheme(id: string): ThemeDefinition | undefined {
	return SYSTEM_THEMES.find((t) => t.id === id);
}

// Legacy compat
export type ThemePreset = ThemeDefinition;
export const THEME_PRESETS = SYSTEM_THEMES;
export const DARK_PRESETS = SYSTEM_THEMES.filter((t) => t.colorScheme === 'dark');
export const LIGHT_PRESETS = SYSTEM_THEMES.filter((t) => t.colorScheme === 'light');
