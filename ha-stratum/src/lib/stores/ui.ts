import { writable, derived } from 'svelte/store';
import type { MoreInfoStyle } from '$lib/types/dashboard';
import type { TileType } from '$lib/types/dashboard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveDialog {
	entityId: string;
	styleOverride?: MoreInfoStyle;
	tileType?: TileType;
	tileId?: string;
}

export type Breakpoint = 'sm' | 'md' | 'lg';

interface UIState {
	// Page navigation
	activePageId: string | null;
	previousPageId: string | null;

	// Overlays
	searchOpen: boolean;
	settingsOpen: boolean;
	settingsTab: string;
	mobileNavOpen: boolean;

	// More-info dialog
	activeDialog: ActiveDialog | null;

	// Notification panel
	notificationsOpen: boolean;

	// Responsive breakpoint — updated by +page.svelte on resize
	breakpoint: Breakpoint;
}

// ─── Store ───────────────────────────────────────────────────────────────────

const initial: UIState = {
	activePageId: null,
	previousPageId: null,
	searchOpen: false,
	settingsOpen: false,
	settingsTab: 'theme',
	mobileNavOpen: false,
	activeDialog: null,
	notificationsOpen: false,
	breakpoint: 'lg'
};

function createUIStore() {
	const { subscribe, set, update } = writable<UIState>(initial);

	return {
		subscribe,

		// ── Page navigation ────────────────────────────────────────────────

		navigateTo(pageId: string) {
			update((s) => ({
				...s,
				previousPageId: s.activePageId,
				activePageId: pageId,
				searchOpen: false,
				activeDialog: null
			}));
		},

		navigateBack() {
			update((s) => {
				if (!s.previousPageId) return s;
				return { ...s, activePageId: s.previousPageId, previousPageId: null };
			});
		},

		/** Set the initial landing page once, after config loads. */
		initPage(defaultPageId: string | undefined, firstPageId: string | undefined) {
			update((s) => {
				if (s.activePageId !== null) return s;
				return { ...s, activePageId: defaultPageId ?? firstPageId ?? null };
			});
		},

		// ── Responsive breakpoint ─────────────────────────────────────────

		setBreakpoint(bp: Breakpoint) {
			update((s) => (s.breakpoint !== bp ? { ...s, breakpoint: bp } : s));
		},

		// ── Search ────────────────────────────────────────────────────────

		openSearch()   { update((s) => ({ ...s, searchOpen: true  })); },
		closeSearch()  { update((s) => ({ ...s, searchOpen: false })); },
		toggleSearch() { update((s) => ({ ...s, searchOpen: !s.searchOpen })); },

		// ── Settings panel ────────────────────────────────────────────────

		openSettings()            { update((s) => ({ ...s, settingsOpen: true  })); },
		openSettingsAt(tab: string) { update((s) => ({ ...s, settingsOpen: true, settingsTab: tab })); },
		closeSettings()           { update((s) => ({ ...s, settingsOpen: false })); },
		toggleSettings()          { update((s) => ({ ...s, settingsOpen: !s.settingsOpen })); },

		// ── Mobile nav ────────────────────────────────────────────────────

		openMobileNav()   { update((s) => ({ ...s, mobileNavOpen: true  })); },
		closeMobileNav()  { update((s) => ({ ...s, mobileNavOpen: false })); },
		toggleMobileNav() { update((s) => ({ ...s, mobileNavOpen: !s.mobileNavOpen })); },

		// ── More-info dialog ──────────────────────────────────────────────

		openDialog(entityId: string, styleOverride?: MoreInfoStyle, tileType?: TileType, tileId?: string) {
			update((s) => ({ ...s, activeDialog: { entityId, styleOverride, tileType, tileId } }));
		},

		closeDialog() { update((s) => ({ ...s, activeDialog: null })); },

		// ── Notifications panel ───────────────────────────────────────────

		openNotifications()   { update((s) => ({ ...s, notificationsOpen: true  })); },
		closeNotifications()  { update((s) => ({ ...s, notificationsOpen: false })); },
		toggleNotifications() { update((s) => ({ ...s, notificationsOpen: !s.notificationsOpen })); },

		// ── Utility ──────────────────────────────────────────────────────

		closeAll() {
			update((s) => ({
				...s,
				searchOpen: false,
				settingsOpen: false,
				mobileNavOpen: false,
				activeDialog: null,
				notificationsOpen: false
			}));
		},

		reset() { set(initial); }
	};
}

export const uiStore = createUIStore();

// ─── Derived convenience stores ───────────────────────────────────────────────

export const activePageId       = derived(uiStore, ($ui) => $ui.activePageId);
export const previousPageId     = derived(uiStore, ($ui) => $ui.previousPageId);
export const isSearchOpen       = derived(uiStore, ($ui) => $ui.searchOpen);
export const isSettingsOpen     = derived(uiStore, ($ui) => $ui.settingsOpen);
export const settingsTab        = derived(uiStore, ($ui) => $ui.settingsTab);
export const isMobileNavOpen    = derived(uiStore, ($ui) => $ui.mobileNavOpen);
export const activeDialog       = derived(uiStore, ($ui) => $ui.activeDialog);
export const isNotificationsOpen = derived(uiStore, ($ui) => $ui.notificationsOpen);
export const currentBreakpoint  = derived(uiStore, ($ui) => $ui.breakpoint);

export const isAnyOverlayOpen = derived(
	uiStore,
	($ui) => $ui.searchOpen || $ui.settingsOpen || $ui.activeDialog !== null || $ui.notificationsOpen
);
