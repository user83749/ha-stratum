// ── UI Store ────────────────────────────────────────────────────────────────

// ── Imports ─────────────────────────────────────────────────────────────────
import { writable, derived } from 'svelte/store';
import type { MoreInfoStyle } from '$lib/types/dashboard';
import type { TileType } from '$lib/types/dashboard';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveDialog {
	entityId: string;
	styleOverride?: MoreInfoStyle;
	tileType?: TileType;
	tileId?: string;
	context?: Record<string, any>;
}

export type Breakpoint = 'sm' | 'md' | 'lg';

interface UIState {
	// Page navigation
	activePageId: string | null;
	navigationHistory: string[];

	// Overlays
	searchOpen: boolean;
	settingsOpen: boolean;
	settingsTab: string;
	mobileNavOpen: boolean;

	// More-info dialog
	activeDialog: ActiveDialog | null;
	dialogStack: ActiveDialog[];

	// Notification panel
	notificationsOpen: boolean;

	// Responsive breakpoint — updated by +page.svelte on resize
	breakpoint: Breakpoint;
}

// ── Store ─────────────────────────────────────────────────────────────────────

const initial: UIState = {
	activePageId: null,
	navigationHistory: [],
	searchOpen: false,
	settingsOpen: false,
	settingsTab: 'theme',
	mobileNavOpen: false,
	activeDialog: null,
	dialogStack: [],
	notificationsOpen: false,
	breakpoint: 'lg'
};

function createUIStore() {
	const { subscribe, set, update } = writable<UIState>(initial);

	return {
		subscribe,

		// ── Page navigation ────────────────────────────────────────────────

		navigateTo(pageId: string) {
			update((s) => {
				const pushCurrent =
					s.activePageId !== null &&
					s.activePageId !== pageId &&
					s.navigationHistory[s.navigationHistory.length - 1] !== s.activePageId;
				return {
					...s,
					activePageId: pageId,
					navigationHistory: pushCurrent ? [...s.navigationHistory, s.activePageId!] : s.navigationHistory,
					searchOpen: false,
					settingsOpen: false,
					mobileNavOpen: false,
					activeDialog: null,
					dialogStack: [],
					notificationsOpen: false
				};
			});
		},

		navigateBack() {
			update((s) => {
				if (s.navigationHistory.length === 0) return s;
				const nextHistory = [...s.navigationHistory];
				const previous = nextHistory.pop() ?? null;
				if (!previous) return s;
				return { ...s, activePageId: previous, navigationHistory: nextHistory };
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

		openDialog(entityId: string, styleOverride?: MoreInfoStyle, tileType?: TileType, tileId?: string, context?: Record<string, any>) {
			update((s) => ({
				...s,
				activeDialog: { entityId, styleOverride, tileType, tileId, context },
				dialogStack: []
			}));
		},

		/** Open a new dialog while preserving the current one as a "back" target. */
		pushDialog(entityId: string, styleOverride?: MoreInfoStyle, tileType?: TileType, tileId?: string, context?: Record<string, any>) {
			update((s) => ({
				...s,
				dialogStack: s.activeDialog ? [...s.dialogStack, s.activeDialog] : s.dialogStack,
				activeDialog: { entityId, styleOverride, tileType, tileId, context }
			}));
		},

		dialogBack() {
			update((s) => {
				if (s.dialogStack.length === 0) return s;
				const nextStack = s.dialogStack.slice(0, -1);
				const prev = s.dialogStack[s.dialogStack.length - 1]!;
				return { ...s, activeDialog: prev, dialogStack: nextStack };
			});
		},

		closeDialog() { update((s) => ({ ...s, activeDialog: null, dialogStack: [] })); },

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
				dialogStack: [],
				notificationsOpen: false
			}));
		},

		reset() { set(initial); }
	};
}

export const uiStore = createUIStore();

// ── Derived Convenience Stores ────────────────────────────────────────────────

export const activePageId       = derived(uiStore, ($ui) => $ui.activePageId);
export const previousPageId     = derived(
	uiStore,
	($ui) => $ui.navigationHistory[$ui.navigationHistory.length - 1] ?? null
);
export const isSearchOpen       = derived(uiStore, ($ui) => $ui.searchOpen);
export const isSettingsOpen     = derived(uiStore, ($ui) => $ui.settingsOpen);
export const settingsTab        = derived(uiStore, ($ui) => $ui.settingsTab);
export const isMobileNavOpen    = derived(uiStore, ($ui) => $ui.mobileNavOpen);
export const activeDialog       = derived(uiStore, ($ui) => $ui.activeDialog);
export const dialogStackDepth   = derived(uiStore, ($ui) => $ui.dialogStack.length);
export const isNotificationsOpen = derived(uiStore, ($ui) => $ui.notificationsOpen);
export const currentBreakpoint  = derived(uiStore, ($ui) => $ui.breakpoint);

export const isAnyOverlayOpen = derived(
	uiStore,
	($ui) => $ui.searchOpen || $ui.settingsOpen || $ui.activeDialog !== null || $ui.notificationsOpen || $ui.mobileNavOpen
);
