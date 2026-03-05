// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Optimistic entity state store
//
// When a service call is made, we immediately patch the entity state in a local
// overlay store. The WebSocket update (typically 50–200 ms later) overwrites it.
// If no WS update arrives within 3 s, the patch expires automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { writable, derived } from 'svelte/store';
import { entities } from './websocket';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

// ─── Types ───────────────────────────────────────────────────────────────────

type StatePatch = Partial<Pick<HassEntity, 'state'>> & {
	attributes?: Partial<HassEntity['attributes']>;
};

// ─── Internal state ──────────────────────────────────────────────────────────

const patches = writable<Record<string, StatePatch>>({});
const timers  = new Map<string, ReturnType<typeof setTimeout>>();

const PATCH_TIMEOUT_MS = 3000;

// ─── Core API ────────────────────────────────────────────────────────────────

/** Apply an optimistic patch for an entity. Auto-expires after PATCH_TIMEOUT_MS. */
export function applyPatch(entityId: string, patch: StatePatch): void {
	patches.update((p) => ({ ...p, [entityId]: patch }));

	const existing = timers.get(entityId);
	if (existing) clearTimeout(existing);

	timers.set(
		entityId,
		setTimeout(() => {
			patches.update((p) => {
				const next = { ...p };
				delete next[entityId];
				return next;
			});
			timers.delete(entityId);
		}, PATCH_TIMEOUT_MS)
	);
}

/** Clear a patch — call this when the WS update arrives with confirmed state. */
export function clearPatch(entityId: string): void {
	const timer = timers.get(entityId);
	if (timer) {
		clearTimeout(timer);
		timers.delete(entityId);
	}
	patches.update((p) => {
		const next = { ...p };
		delete next[entityId];
		return next;
	});
}

// ─── Merged store ─────────────────────────────────────────────────────────────

/**
 * Derived store that merges live entities with any active optimistic patches.
 * Use this everywhere instead of the raw `entities` store for instant UI feedback.
 */
export const optimisticEntities = derived(
	[entities, patches],
	([$entities, $patches]): HassEntities => {
		if (Object.keys($patches).length === 0) return $entities;

		const result: HassEntities = { ...$entities };

		for (const [id, patch] of Object.entries($patches)) {
			if (!result[id]) continue;
			result[id] = {
				...result[id],
				...(patch.state !== undefined ? { state: patch.state } : {}),
				attributes: { ...result[id].attributes, ...(patch.attributes ?? {}) }
			};
		}

		return result;
	}
);

// ─── Domain-specific helpers ─────────────────────────────────────────────────

/** Optimistically toggle a boolean entity (on ↔ off). */
export function optimisticToggle(entityId: string, currentState: string): void {
	applyPatch(entityId, { state: currentState === 'on' ? 'off' : 'on' });
}

/** Optimistically set brightness (0–255). */
export function optimisticBrightness(entityId: string, brightness: number): void {
	applyPatch(entityId, {
		state: brightness > 0 ? 'on' : 'off',
		attributes: { brightness }
	});
}

/** Optimistically set cover position (0–100). */
export function optimisticCoverPosition(entityId: string, position: number): void {
	applyPatch(entityId, {
		state: position > 0 ? 'open' : 'closed',
		attributes: { current_position: position }
	});
}

/** Optimistically set climate target temperature. */
export function optimisticClimateTemp(entityId: string, temperature: number): void {
	applyPatch(entityId, { attributes: { temperature } });
}

/** Optimistically set fan speed percentage (0–100). */
export function optimisticFanPercentage(entityId: string, percentage: number): void {
	applyPatch(entityId, {
		state: percentage > 0 ? 'on' : 'off',
		attributes: { percentage }
	});
}

/** Optimistically set media player volume level (0–1). */
export function optimisticVolume(entityId: string, level: number): void {
	applyPatch(entityId, { attributes: { volume_level: level } });
}

/** Optimistically set humidifier target humidity (0–100). */
export function optimisticHumidity(entityId: string, humidity: number): void {
	applyPatch(entityId, { attributes: { humidity } });
}

/** Optimistically set input_number / number value. */
export function optimisticNumberValue(entityId: string, value: number): void {
	applyPatch(entityId, { state: String(value) });
}

/** Optimistically set select / input_select option. */
export function optimisticSelectOption(entityId: string, option: string): void {
	applyPatch(entityId, { state: option });
}
