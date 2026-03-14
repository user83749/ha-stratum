import {
	createConnection,
	createLongLivedTokenAuth,
	subscribeEntities,
	type Connection,
	type HassEntities,
	type Auth
} from 'home-assistant-js-websocket';
import { writable, derived, get } from 'svelte/store';
import { clearPatchesForSnapshot, syncBaseEntities } from './optimistic';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const connection = writable<Connection | null>(null);
export const connectionStatus = writable<ConnectionStatus>('disconnected');
export const entities = writable<HassEntities>({});
export const error = writable<string | null>(null);

let unsubscribeEntities: (() => void) | null = null;
const FIRST_SNAPSHOT_TIMEOUT_MS = 6000;

function attachListeners(conn: Connection) {
	connection.set(conn);
	connectionStatus.set('connected');
	unsubscribeEntities = subscribeEntities(conn, (state) => {
		// Prune optimistic patches in one pass for entities that arrived from HA,
		// so confirmed state replaces optimistic values immediately without
		// per-entity store update churn.
		clearPatchesForSnapshot(state);
		entities.set(state);
		syncBaseEntities(state);
	});
	conn.addEventListener('ready', () => connectionStatus.set('connected'));
	conn.addEventListener('disconnected', () => connectionStatus.set('disconnected'));
	conn.addEventListener('reconnect-error', () => connectionStatus.set('error'));
}

function relayWsUrl(): string {
	const loc = window.location;
	const proto = loc.protocol === 'https:' ? 'wss' : 'ws';
	const ingressMatch = loc.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
	const ingressPrefix = ingressMatch ? ingressMatch[1] : '';
	return `${proto}://${loc.host}${ingressPrefix}/api-stratum/ws`;
}

function statesToMap(states: any[]): HassEntities {
	const map: HassEntities = {};
	for (const state of states) {
		if (state?.entity_id) map[state.entity_id] = state;
	}
	return map;
}

async function seedInitialStates(conn: Connection): Promise<void> {
	const states = await Promise.race([
		conn.sendMessagePromise({ type: 'get_states' }) as Promise<any[]>,
		new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('No entity snapshot received')), FIRST_SNAPSHOT_TIMEOUT_MS)
		)
	]);
	const stateMap = statesToMap(states);
	clearPatchesForSnapshot(stateMap);
	entities.set(stateMap);
	syncBaseEntities(stateMap);
}

async function connectViaRelay(): Promise<Connection> {
	const loc = window.location;
	const fakeAuth = {
		data: { hassUrl: loc.origin, access_token: '', expires: 0, expires_in: 0, refresh_token: '', token_type: 'Bearer' },
		wsUrl: relayWsUrl(),
		accessToken: '',
		expired: false,
		refreshAccessToken: async () => { /* no-op */ }
	} as unknown as Auth;

	// Do not block add-on connect on an explicit get_states bootstrap; the
	// relay/subscription path should establish connection immediately.
	return createConnection({ auth: fakeAuth });
}

// ── Addon mode: connect via our server-side WebSocket relay ─────────────────
// The relay at /api-stratum/ws handles add-on HA auth server-side — no token
// needed from the browser.
export async function connectAddon(): Promise<void> {
	if (get(connection)) disconnect();
	connectionStatus.set('connecting');
	error.set(null);

	try {
		const conn = await connectViaRelay();

		attachListeners(conn);
	} catch (err) {
		connectionStatus.set('error');
		error.set(err instanceof Error ? err.message : 'Failed to connect');
	}
}

// ── Standalone mode: connect with a user-supplied URL + token ────────────────
export async function connect(hassUrl: string, token: string): Promise<void> {
	if (get(connection)) disconnect();
	connectionStatus.set('connecting');
	error.set(null);

	try {
		const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
		const auth = createLongLivedTokenAuth(hassUrl.trim(), cleanToken);
		// Standalone/manual credentials path: always use exactly what the user
		// entered. No relay fallback here to avoid any add-on-style ambiguity.
		const conn = await createConnection({ auth });
		// Standalone mode needs explicit bootstrap to avoid empty-entity startup
		// races in local dev where subscription snapshots can be delayed.
		await seedInitialStates(conn);
		attachListeners(conn);
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
	syncBaseEntities({});
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

// ── Reconnect pause (UI "Disconnect" button) ────────────────────────────────
// In add-on/ingress mode we auto-reconnect. When the user hits "Disconnect" we
// want a real disconnect state (at least briefly) instead of reconnecting
// immediately and making the button feel broken.
let reconnectPausedUntil = 0;

export function pauseReconnect(ms = 30_000): void {
	reconnectPausedUntil = Date.now() + ms;
}

export function reconnectAllowed(): boolean {
	return Date.now() >= reconnectPausedUntil;
}
