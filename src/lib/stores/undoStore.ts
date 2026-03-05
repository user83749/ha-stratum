// ─────────────────────────────────────────────────────────────────────────────
// Stratum — undoStore.ts
// In-memory undo/redo ring buffer for DashboardConfig snapshots.
// Holds up to MAX_HISTORY snapshots. Call push() before every mutation.
// ─────────────────────────────────────────────────────────────────────────────

import { writable, derived, get } from 'svelte/store';
import type { DashboardConfig } from '$lib/types/dashboard';

const MAX_HISTORY = 50;

interface UndoState {
	past:   DashboardConfig[];   // stack of past states (index 0 = oldest)
	future: DashboardConfig[];   // stack of future states (index 0 = most-recent-undone)
}

function createUndoStore() {
	const { subscribe, set, update } = writable<UndoState>({ past: [], future: [] });

	return {
		subscribe,

		// Call BEFORE applying a mutation — stores the pre-mutation snapshot.
		push(snapshot: DashboardConfig) {
			update((s) => {
				const past = [...s.past, structuredClone(snapshot)];
				if (past.length > MAX_HISTORY) past.shift();
				return { past, future: [] };
			});
		},

		// Returns the config to restore, or null if nothing to undo.
		undo(current: DashboardConfig): DashboardConfig | null {
			const state = get({ subscribe });
			if (state.past.length === 0) return null;

			const past   = [...state.past];
			const prev   = past.pop()!;
			const future = [structuredClone(current), ...state.future];

			set({ past, future });
			return prev;
		},

		// Returns the config to restore, or null if nothing to redo.
		redo(current: DashboardConfig): DashboardConfig | null {
			const state = get({ subscribe });
			if (state.future.length === 0) return null;

			const future = [...state.future];
			const next   = future.shift()!;
			const past   = [...state.past, structuredClone(current)];
			if (past.length > MAX_HISTORY) past.shift();

			set({ past, future });
			return next;
		},

		// Clear both stacks (call on edit mode exit or full config reload).
		clear() {
			set({ past: [], future: [] });
		}
	};
}

export const undoStore = createUndoStore();

// Convenience derived stores
export const canUndo = derived(undoStore, ($u) => $u.past.length  > 0);
export const canRedo = derived(undoStore, ($u) => $u.future.length > 0);
