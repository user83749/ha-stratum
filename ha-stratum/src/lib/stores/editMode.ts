import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface EditSelection {
	pageId:    string | null;
	sectionId: string | null;
	tileId:    string | null;
}

interface EditModeState {
	active:         boolean;
	selection:      EditSelection;
	multiSelection: string[];   // tileIds for bulk ops
	isDragging:     boolean;
	// Which editor panel is open
	editorOpen:     'tile' | 'section' | 'page' | null;
}

const initial: EditModeState = {
	active:         false,
	selection:      { pageId: null, sectionId: null, tileId: null },
	multiSelection: [],
	isDragging:     false,
	editorOpen:     null,
};

function createEditModeStore() {
	const { subscribe, set, update } = writable<EditModeState>(initial);

	return {
		subscribe,

		toggle() {
			update((s) => ({
				...s,
				active:         !s.active,
				selection:      { pageId: null, sectionId: null, tileId: null },
				multiSelection: [],
				editorOpen:     null,
			}));
		},

		enter() {
			update((s) => ({ ...s, active: true }));
		},

		exit() {
			set(initial);
		},

		// ── Single tile selection (opens TileEditor) ────────────────────────

		selectTile(pageId: string, sectionId: string, tileId: string) {
			update((s) => ({
				...s,
				selection:      { pageId, sectionId, tileId },
				multiSelection: [],
				editorOpen:     'tile',
			}));
		},

		focusTile(pageId: string, sectionId: string, tileId: string) {
			update((s) => ({
				...s,
				selection:      { pageId, sectionId, tileId },
				multiSelection: [],
				editorOpen:     null,
			}));
		},

		// ── Multi-select (shift+click accumulates tileIds) ──────────────────

		toggleMultiSelect(tileId: string) {
			update((s) => {
				const idx = s.multiSelection.indexOf(tileId);
				const multiSelection = idx === -1
					? [...s.multiSelection, tileId]
					: s.multiSelection.filter((id) => id !== tileId);
				return { ...s, multiSelection, selection: { pageId: null, sectionId: null, tileId: null }, editorOpen: null };
			});
		},

		clearMultiSelect() {
			update((s) => ({ ...s, multiSelection: [] }));
		},

		// ── Section selection ────────────────────────────────────────────────

		selectSection(pageId: string, sectionId: string) {
			update((s) => ({
				...s,
				selection:      { pageId, sectionId, tileId: null },
				multiSelection: [],
				editorOpen:     'section',
			}));
		},

		// ── Page editor ──────────────────────────────────────────────────────

		openPageEditor(pageId: string) {
			update((s) => ({
				...s,
				selection:  { pageId, sectionId: null, tileId: null },
				editorOpen: 'page',
			}));
		},

		// ── Close any editor panel ───────────────────────────────────────────

		closeEditor() {
			update((s) => ({
				...s,
				editorOpen: null,
				selection:  { pageId: null, sectionId: null, tileId: null },
			}));
		},

		clearSelection() {
			update((s) => ({
				...s,
				selection:      { pageId: null, sectionId: null, tileId: null },
				multiSelection: [],
				editorOpen:     null,
			}));
		},

		setDragging(isDragging: boolean) {
			if (browser) {
				document.documentElement.classList.toggle('is-tile-dragging', isDragging);
			}
			update((s) => ({ ...s, isDragging }));
		},
	};
}

export const editMode = createEditModeStore();

// Convenience derived stores
export const isEditing      = derived(editMode, ($e) => $e.active);
export const isDragging     = derived(editMode, ($e) => $e.isDragging);
export const editSelection  = derived(editMode, ($e) => $e.selection);
export const multiSelection = derived(editMode, ($e) => $e.multiSelection);
export const editorOpen     = derived(editMode, ($e) => $e.editorOpen);
