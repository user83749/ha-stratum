import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

function toPositiveCount(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
		return Math.floor(value);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (/^\d+(\.\d+)?$/.test(trimmed)) {
			const parsed = Number(trimmed);
			return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
		}
		const csv = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
		if (csv.length > 1) return csv.length;
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? value.length : null;
	}
	if (value && typeof value === 'object') {
		const obj = value as Record<string, unknown>;
		const nestedKeys = ['count', 'total', 'available', 'updates', 'pending', 'value'];
		for (const key of nestedKeys) {
			const nested = toPositiveCount(obj[key]);
			if (nested !== null) return nested;
		}
	}
	return null;
}

export function getUpdateCount(entity: HassEntity | null | undefined, all?: HassEntities): number {
	if (!entity) return 0;
	if (entity.state === 'unknown' || entity.state === 'unavailable') return 0;

	const domain = entity.entity_id.split('.')[0] ?? '';
	if (domain === 'update') return entity.state === 'on' ? 1 : 0;

	const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
	const candidates: unknown[] = [
		entity.state,
		attrs.update_entities,
		attrs.total,
		attrs.home_assistant,
		attrs.available,
		attrs.available_updates,
		attrs.updates,
		attrs.pending_updates,
		attrs.update_count,
		attrs.num_updates,
		attrs.count
	];

	let max = 0;
	for (const candidate of candidates) {
		const count = toPositiveCount(candidate);
		if (count !== null) max = Math.max(max, count);
	}

	if (max > 0) return max;
	if (!all) return 0;

	let fromUpdateEntities = 0;
	for (const [id, stateObj] of Object.entries(all)) {
		if (!id.startsWith('update.')) continue;
		if (stateObj?.state === 'on') fromUpdateEntities += 1;
	}
	return fromUpdateEntities;
}

export function hasUpdate(entity: HassEntity | null | undefined, all?: HassEntities): boolean {
	return getUpdateCount(entity, all) > 0;
}
