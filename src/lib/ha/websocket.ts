import {
	createConnection,
	createLongLivedTokenAuth,
	subscribeEntities,
	type Connection,
	type HassEntities
} from 'home-assistant-js-websocket';
import { writable, derived, get } from 'svelte/store';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const connection = writable<Connection | null>(null);
export const connectionStatus = writable<ConnectionStatus>('disconnected');
export const entities = writable<HassEntities>({});
export const error = writable<string | null>(null);

let unsubscribeEntities: (() => void) | null = null;

export async function connect(hassUrl: string, token: string): Promise<void> {
	// Clean up any existing connection first
	if (get(connection)) {
		disconnect();
	}

	connectionStatus.set('connecting');
	error.set(null);

	try {
		const auth = createLongLivedTokenAuth(hassUrl, token);
		const conn = await createConnection({ auth });

		connection.set(conn);
		connectionStatus.set('connected');

		unsubscribeEntities = subscribeEntities(conn, (state) => {
			entities.set(state);
		});

		conn.addEventListener('ready', () => connectionStatus.set('connected'));
		conn.addEventListener('disconnected', () => connectionStatus.set('disconnected'));
		conn.addEventListener('reconnect-error', () => connectionStatus.set('error'));
	} catch (err) {
		connectionStatus.set('error');
		error.set(err instanceof Error ? err.message : 'Failed to connect');
	}
}

export function disconnect(): void {
	unsubscribeEntities?.();
	unsubscribeEntities = null;

	const conn = get(connection);
	conn?.close();
	connection.set(null);
	connectionStatus.set('disconnected');
	entities.set({});
}

export const entityList = derived(entities, ($entities) =>
	Object.values($entities).sort((a, b) => a.entity_id.localeCompare(b.entity_id))
);

export const entityDomains = derived(entities, ($entities) => {
	const domains = new Set<string>();
	for (const id of Object.keys($entities)) {
		domains.add(id.split('.')[0]);
	}
	return Array.from(domains).sort();
});
