import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { base } from '$app/paths';
import {
	defaultConfig,
	migrateConfig,
	type DashboardConfig,
	type Page,
	type Section,
	type Tile,
	type ThemeConfig,
	type NavConfig,
	type HeaderConfig,
	type AppSettings,
	type TileDefaults,
	type SearchConfig,
	type WeatherConfig,
	type DisplayConfig,
	type NotificationConfig,
	type CustomResources,
	type ThemeSchedule,
	type EditConfig,
	type MediaConfig,
	type EnergyConfig,
	type DialogConfig,
	type FavoritesConfig,
	type UserProfile
} from '$lib/types/dashboard';
import {
	appendTileToLayout,
	getSectionMaxColumns,
	normalizeTilesForStorage,
	resizeTileForPreset
} from '$lib/layout/sectionLayout';
import { inferPresetFromLegacySize, resolvePresetToSpan } from '$lib/layout/tileSizing';

// ─── Store ───────────────────────────────────────────────────────────────────

function createDashboardStore() {
	const { subscribe, set, update } = writable<DashboardConfig>(defaultConfig());

	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	function scheduleSave(config: DashboardConfig) {
		if (!browser) return;
		if (saveTimer) clearTimeout(saveTimer);
		const timer = setTimeout(() => {
			if (saveTimer === timer) {
				saveTimer = null;
			}
			void persistConfig(config);
		}, 800);
		saveTimer = timer;
	}

	async function persistConfig(config: DashboardConfig): Promise<void> {
		if (!browser) return;
		// NEVER PERSIST IF IN DEMO MODE — prevents demo config from overwriting the real dashboard.json
		if (localStorage.getItem('stratum_demo') === 'true') return;

		try {
			await fetch(`${base}/api-stratum/config`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(config)
			});
		} catch (err) {
			console.error('[stratum] Failed to save config:', err);
		}
	}

	function mutate(fn: (config: DashboardConfig) => void) {
		update((config) => {
			const next = structuredClone(config);
			fn(next);
			scheduleSave(next);
			return next;
		});
	}

	return {
		subscribe,

		// ── Demo / seed (bypasses persistence) ────────────────────────────

		seed(config: DashboardConfig) {
			set(config);
		},

		async replace(config: DashboardConfig): Promise<void> {
			if (saveTimer) {
				clearTimeout(saveTimer);
				saveTimer = null;
			}
			set(config);
			await persistConfig(config);
		},

		// ── Lifecycle ──────────────────────────────────────────────────────

		async load(): Promise<void> {
			if (!browser) return;
			try {
				const res = await fetch(`${base}/api-stratum/config`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const raw = await res.json();
				set(migrateConfig(raw));
			} catch {
				const fresh = defaultConfig();
				set(fresh);
				await persistConfig(fresh);
			}
		},

		// ── Top-level sections ────────────────────────────────────────────

		setTheme(patch: Partial<ThemeConfig>) {
			mutate((c) => Object.assign(c.theme, patch));
		},

		setNav(patch: Partial<NavConfig>) {
			mutate((c) => Object.assign(c.nav, patch));
		},

		setHeader(patch: Partial<HeaderConfig>) {
			mutate((c) => Object.assign(c.header, patch));
		},

		setSettings(patch: Partial<AppSettings>) {
			mutate((c) => Object.assign(c.settings, patch));
		},

		setTileDefaults(patch: Partial<TileDefaults>) {
			mutate((c) => Object.assign(c.tileDefaults, patch));
		},

		setSearch(patch: Partial<SearchConfig>) {
			mutate((c) => Object.assign(c.search, patch));
		},

		setWeather(patch: Partial<WeatherConfig>) {
			mutate((c) => Object.assign(c.weather, patch));
		},

		setDisplay(patch: Partial<DisplayConfig>) {
			mutate((c) => Object.assign(c.display, patch));
		},

		setThemeSchedule(patch: Partial<ThemeSchedule>) {
			mutate((c) => Object.assign(c.display.themeSchedule, patch));
		},

		setNotifications(patch: Partial<NotificationConfig>) {
			mutate((c) => Object.assign(c.notifications, patch));
		},

		setResources(patch: Partial<CustomResources>) {
			mutate((c) => Object.assign(c.resources, patch));
		},

		setEdit(patch: Partial<EditConfig>) {
			mutate((c) => Object.assign(c.edit, patch));
		},

		setMedia(patch: Partial<MediaConfig>) {
			mutate((c) => Object.assign(c.media, patch));
		},

		setEnergy(patch: Partial<EnergyConfig>) {
			mutate((c) => Object.assign(c.energy, patch));
		},

		setDialog(patch: Partial<DialogConfig>) {
			mutate((c) => Object.assign(c.dialog, patch));
		},

		setFavorites(patch: Partial<FavoritesConfig>) {
			mutate((c) => Object.assign(c.favorites, patch));
		},

		toggleFavorite(entityId: string) {
			mutate((c) => {
				const idx = c.favorites.entityIds.indexOf(entityId);
				if (idx === -1) c.favorites.entityIds.push(entityId);
				else c.favorites.entityIds.splice(idx, 1);
			});
		},

		// ── Profiles ───────────────────────────────────────────────────────

		addProfile(profile: UserProfile) {
			mutate((c) => c.profiles.push(profile));
		},

		updateProfile(profileId: string, patch: Partial<Omit<UserProfile, 'id'>>) {
			mutate((c) => {
				const p = c.profiles.find((p) => p.id === profileId);
				if (p) Object.assign(p, patch);
			});
		},

		deleteProfile(profileId: string) {
			mutate((c) => {
				c.profiles = c.profiles.filter((p) => p.id !== profileId);
			});
		},

		// ── Pages ──────────────────────────────────────────────────────────

		addPage(page: Page) {
			mutate((c) => c.pages.push(page));
		},

		updatePage(pageId: string, patch: Partial<Omit<Page, 'id' | 'sections'>>) {
			mutate((c) => {
				const p = c.pages.find((p) => p.id === pageId);
				if (p) Object.assign(p, patch);
			});
		},

		deletePage(pageId: string) {
			mutate((c) => {
				c.pages = c.pages.filter((p) => p.id !== pageId);
			});
		},

		reorderPages(ids: string[]) {
			mutate((c) => {
				const map = new Map(c.pages.map((p) => [p.id, p]));
				c.pages = ids.map((id) => map.get(id)!).filter(Boolean);
			});
		},

		// ── Sections ──────────────────────────────────────────────────────

		addSection(pageId: string, section: Section) {
			mutate((c) => {
				c.pages.find((p) => p.id === pageId)?.sections.push(section);
			});
		},

		updateSection(
			pageId: string,
			sectionId: string,
			patch: Partial<Omit<Section, 'id' | 'tiles'>>
		) {
			mutate((c) => {
				const s = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (!s) return;
				Object.assign(s, patch);
				if (patch.grid) {
					s.tiles = normalizeTilesForStorage(s.tiles, getSectionMaxColumns(s));
				}
			});
		},

		deleteSection(pageId: string, sectionId: string) {
			mutate((c) => {
				const p = c.pages.find((p) => p.id === pageId);
				if (p) p.sections = p.sections.filter((s) => s.id !== sectionId);
			});
		},

		reorderSections(pageId: string, ids: string[]) {
			mutate((c) => {
				const p = c.pages.find((p) => p.id === pageId);
				if (!p) return;
				const map = new Map(p.sections.map((s) => [s.id, s]));
				p.sections = ids.map((id) => map.get(id)!).filter(Boolean);
			});
		},

		toggleSectionCollapsed(pageId: string, sectionId: string) {
			mutate((c) => {
				const s = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (s) s.collapsed = !s.collapsed;
			});
		},

		// ── Tiles ─────────────────────────────────────────────────────────

		addTile(pageId: string, sectionId: string, tile: Tile) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (!section) return;
				const sizePreset = tile.sizePreset ?? inferPresetFromLegacySize(tile.type, tile.size);
				const size = tile.size ?? resolvePresetToSpan(tile.type, sizePreset);
				section.tiles = appendTileToLayout(section.tiles, {
					...tile,
					sizePreset,
					size
				}, getSectionMaxColumns(section));
			});
		},

		insertTileAt(pageId: string, sectionId: string, tile: Tile, position?: number, columnHint?: number) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (!section) return;
				const sizePreset = tile.sizePreset ?? inferPresetFromLegacySize(tile.type, tile.size);
				const size = tile.size ?? resolvePresetToSpan(tile.type, sizePreset);
				const nextTiles = [...section.tiles];
				const index = position === undefined ? nextTiles.length : Math.max(0, Math.min(position, nextTiles.length));
				nextTiles.splice(index, 0, { ...tile, sizePreset, size });
				const normalizeCols =
					columnHint && columnHint > 0
						? Math.max(1, Math.min(columnHint, getSectionMaxColumns(section)))
						: getSectionMaxColumns(section);
				section.tiles = normalizeTilesForStorage(nextTiles, normalizeCols);
			});
		},

		moveTileToSection(pageId: string, fromSectionId: string, toSectionId: string, tileId: string, columnHint?: number) {
			mutate((c) => {
				const page = c.pages.find((p) => p.id === pageId);
				const source = page?.sections.find((s) => s.id === fromSectionId);
				const target = page?.sections.find((s) => s.id === toSectionId);
				if (!source || !target || source.id === target.id) return;

				const tile = source.tiles.find((t) => t.id === tileId);
				if (!tile) return;

				source.tiles = source.tiles.filter((t) => t.id !== tileId);

				const normalizeCols =
					columnHint && columnHint > 0
						? Math.max(1, Math.min(columnHint, getSectionMaxColumns(target)))
						: getSectionMaxColumns(target);

				target.tiles = appendTileToLayout(
					target.tiles,
					{
						...tile,
						layout: undefined
					},
					normalizeCols
				);
			});
		},

		moveTileToPage(pageId: string, fromSectionId: string, toPageId: string, tileId: string, columnHint?: number) {
			mutate((c) => {
				const sourcePage = c.pages.find((p) => p.id === pageId);
				const source = sourcePage?.sections.find((s) => s.id === fromSectionId);
				const targetPage = c.pages.find((p) => p.id === toPageId);
				if (!source || !targetPage) return;

				const tile = source.tiles.find((t) => t.id === tileId);
				if (!tile) return;

				if (targetPage.sections.length === 0) {
					targetPage.sections.push({
						id: crypto.randomUUID(),
						title: 'New Section',
						icon: '',
						role: 'main',
						visibility: { lg: true, md: true, sm: true },
						collapsible: false,
						collapsed: false,
						grid: { baseSize: 160, gap: 8 },
						tiles: []
					});
				}

				const target = targetPage.sections[0];
				if (!target) return;

				source.tiles = source.tiles.filter((t) => t.id !== tileId);

				const normalizeCols =
					columnHint && columnHint > 0
						? Math.max(1, Math.min(columnHint, getSectionMaxColumns(target)))
						: getSectionMaxColumns(target);

				target.tiles = appendTileToLayout(
					target.tiles,
					{
						...tile,
						layout: undefined
					},
					normalizeCols
				);
			});
		},

		updateTile(pageId: string, sectionId: string, tileId: string, patch: Partial<Tile>) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				const tiles = section?.tiles;
				const tile = tiles?.find((t) => t.id === tileId);
				if (!tile || !section) return;
				Object.assign(tile, patch);
				if (patch.layout || patch.sizePreset || patch.size) {
					section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
				}
			});
		},

		setTileLayout(pageId: string, sectionId: string, tileId: string, layout: Tile['layout']) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				const tile = section?.tiles.find((t) => t.id === tileId);
				if (!tile || !section || !layout) return;
				tile.layout = {
					x: Math.max(0, Math.floor(layout.x)),
					y: Math.max(0, Math.floor(layout.y)),
					w: Math.max(1, Math.floor(layout.w)),
					h: Math.max(1, Math.floor(layout.h))
				};
				section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
			});
		},

		setTileSizePreset(pageId: string, sectionId: string, tileId: string, sizePreset: NonNullable<Tile['sizePreset']>) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (!section) return;
				section.tiles = resizeTileForPreset(section, section.tiles, tileId, sizePreset);
			});
		},

		normalizeSectionLayout(pageId: string, sectionId: string) {
			mutate((c) => {
				const section = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (!section) return;
				section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
			});
		},

		deleteTile(pageId: string, sectionId: string, tileId: string) {
			mutate((c) => {
				const s = c.pages
					.find((p) => p.id === pageId)
					?.sections.find((s) => s.id === sectionId);
				if (s) s.tiles = s.tiles.filter((t) => t.id !== tileId);
			});
		}
	};
}

export const dashboardStore = createDashboardStore();
