import {
	createConnection,
	createLongLivedTokenAuth,
	subscribeEntities,
	type Connection,
	type HassEntities,
	type Auth
} from 'home-assistant-js-websocket';
import { writable, derived, get } from 'svelte/store';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const connection = writable<Connection | null>(null);
export const connectionStatus = writable<ConnectionStatus>('disconnected');
export const entities = writable<HassEntities>({});
export const error = writable<string | null>(null);

let unsubscribeEntities: (() => void) | null = null;

function attachListeners(conn: Connection) {
	connection.set(conn);
	connectionStatus.set('connected');
	unsubscribeEntities = subscribeEntities(conn, (state) => entities.set(state));
	conn.addEventListener('ready', () => connectionStatus.set('connected'));
	conn.addEventListener('disconnected', () => connectionStatus.set('disconnected'));
	conn.addEventListener('reconnect-error', () => connectionStatus.set('error'));
}

// ── Addon mode: connect via our server-side WebSocket relay ─────────────────
// The relay at /api-stratum/ws handles HA auth with SUPERVISOR_TOKEN
// automatically — no token needed from the browser.
export async function connectAddon(): Promise<void> {
	if (get(connection)) disconnect();
	connectionStatus.set('connecting');
	error.set(null);

	try {
		// Build an absolute ws(s):// URL to our relay.
		// When accessed via HA Ingress (iPhone app or external HTTPS), the page is
		// served at /api/hassio_ingress/{token}/... and the reverse proxy only
		// routes requests that carry the Ingress token in the path.  We must
		// therefore preserve the /api/hassio_ingress/{token}/ prefix when building
		// the WebSocket URL, otherwise the HA proxy rejects the upgrade before it
		// reaches our server.
		const loc = window.location;
		const proto = loc.protocol === 'https:' ? 'wss' : 'ws';

		// Extract Ingress prefix: /api/hassio_ingress/{token}  (no trailing slash)
		const ingressMatch = loc.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
		const ingressPrefix = ingressMatch ? ingressMatch[1] : '';

		const relayUrl = `${proto}://${loc.host}${ingressPrefix}/api-stratum/ws`;

		// Minimal Auth-like object — hassUrl is only used by the library to
		// build the WS URL when createSocket is NOT overridden, so with our
		// custom createSocket it is ignored.  We still need it non-empty.
		const fakeAuth = {
			data: { hassUrl: loc.origin, access_token: '', expires: 0, expires_in: 0, refresh_token: '', token_type: 'Bearer' },
			wsUrl: relayUrl,
			accessToken: '',
			expired: false,
			refreshAccessToken: async () => { /* no-op */ }
		} as unknown as Auth;

		// No custom createSocket — the library's default socket.js flow handles
		// auth_required / auth_ok naturally.  The relay sends both to the browser
		// after completing the HA auth server-side, and also discards the browser's
		// own auth message so no real token is ever needed from the client.
		const conn = await createConnection({ auth: fakeAuth });

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
		const auth = createLongLivedTokenAuth(hassUrl, token);
		const conn = await createConnection({ auth });
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
