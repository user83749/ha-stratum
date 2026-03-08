import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';

export const TV_CONTENT_TYPES = new Set(['tvshow', 'video', 'movie', 'episode', 'channel']);

export const TV_REMOTE_BUTTON_DEFS = [
	{ key: 'power', label: 'Power button' },
	{ key: 'home', label: 'Home button' },
	{ key: 'back', label: 'Back button' },
	{ key: 'menu', label: 'Menu button' },
	{ key: 'up', label: 'D-pad up' },
	{ key: 'down', label: 'D-pad down' },
	{ key: 'left', label: 'D-pad left' },
	{ key: 'right', label: 'D-pad right' },
	{ key: 'select', label: 'D-pad OK / Select' },
	{ key: 'volume_up', label: 'Volume +' },
	{ key: 'volume_down', label: 'Volume -' },
	{ key: 'channel_up', label: 'Channel +' },
	{ key: 'channel_down', label: 'Channel -' }
] as const;

export type TvRemoteCommand = (typeof TV_REMOTE_BUTTON_DEFS)[number]['key'];

function objectId(entityId: string): string {
	const idx = entityId.indexOf('.');
	return idx >= 0 ? entityId.slice(idx + 1) : entityId;
}

export function isTvLikeMediaEntity(entity: HassEntity | null | undefined): boolean {
	if (!entity || !entity.entity_id.startsWith('media_player.')) return false;
	const deviceClass = entity.attributes.device_class as string | undefined;
	const contentType = (entity.attributes.media_content_type as string | undefined) ?? '';
	return deviceClass === 'tv' || TV_CONTENT_TYPES.has(contentType);
}

export function findCompanionRemoteEntityId(mainEntityId: string, entities: HassEntities): string | undefined {
	if (!mainEntityId.startsWith('media_player.')) return undefined;
	const oid = objectId(mainEntityId);
	const exact = `remote.${oid}`;
	if (entities[exact]) return exact;

	const bySuffix = Object.keys(entities).find((id) => id.startsWith('remote.') && id.endsWith(`.${oid}`));
	if (bySuffix) return bySuffix;

	const friendly = entities[mainEntityId]?.attributes?.friendly_name;
	if (typeof friendly === 'string' && friendly.trim()) {
		const needle = friendly.trim().toLowerCase();
		const byName = Object.entries(entities).find(([id, value]) =>
			id.startsWith('remote.') &&
			((value?.attributes?.friendly_name as string | undefined)?.toLowerCase().includes(needle) ?? false)
		)?.[0];
		if (byName) return byName;
	}

	return undefined;
}

function defaultCommandEntityId(command: TvRemoteCommand, mainEntityId: string, entities: HassEntities): string {
	const companionRemote = findCompanionRemoteEntityId(mainEntityId, entities);
	const prefersRemote = new Set<TvRemoteCommand>([
		'home', 'back', 'menu', 'up', 'down', 'left', 'right', 'select'
	]);
	if (prefersRemote.has(command) && companionRemote) return companionRemote;
	return mainEntityId;
}

export function resolveTvCommandEntityId(
	command: TvRemoteCommand,
	mainEntityId: string,
	overrides: Record<string, string> | undefined,
	entities: HassEntities
): string {
	const explicit = (overrides?.[command] ?? '').trim();
	if (explicit) return explicit;
	return defaultCommandEntityId(command, mainEntityId, entities);
}

