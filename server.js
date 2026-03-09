// SSR Ghost Mocks — prevents crashes from dependencies using browser globals
try {
	Object.defineProperty(globalThis, 'navigator', {
		value: { userAgent: 'node', platform: 'node', serviceWorker: { register: () => Promise.resolve() } },
		writable: true,
		configurable: true
	});
} catch (e) {
	// Fallback for modern Node where some globals are strictly locked
}

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { handler } from './build/handler.js';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();

const PORT = parseInt(process.env.PORT ?? '8099', 10);
const ADDON = process.env.ADDON === 'true';
const EXPOSED_PORT = process.env.EXPOSED_PORT ?? null; // set by run.sh when user enables the port
const CONFIG_PATH = ADDON
	? '/data/stratum-config.json'
	: join(__dirname, 'data', 'stratum-config.json');

// ─── Process-level error handlers ───────────────────────────────────────────

process.on('uncaughtException', (err) => {
	console.error('[Stratum] UNCAUGHT EXCEPTION:', err);
	process.exit(1);
});

process.on('unhandledRejection', (reason) => {
	console.error('[Stratum] UNHANDLED REJECTION:', reason);
});

// Supervisor injects this when homeassistant_api is enabled.
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Proxy Helpers ──────────────────────────────────────────────────────────

const INTERNAL_API_PREFIXES = ['/api-stratum'];

function resolveTarget(_req) {
	// Always proxy to HASS_URL — in addon mode this is http://supervisor/core,
	// in standalone mode it is the user-configured HA instance URL.
	// SUPERVISOR_TOKEN is injected as Authorization by haProxy's headers config.
	return HASS_URL;
}

const haProxy = createProxyMiddleware({
	router: resolveTarget,
	changeOrigin: true,
	ws: true,
	headers: SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
		: undefined,
	on: {
		error: (err, req, res) => {
			console.error(`[Stratum] Proxy error for ${req.method} ${req.url}:`, err.message);
			if (res && typeof res.status === 'function') {
				res.status(502).json({ error: 'Proxy error', message: err.message });
			}
		}
	}
});

// ─── Middleware ─────────────────────────────────────────────────────────────

// Request logger — every request visible in the addon log
app.use((req, _res, next) => {
	console.log(`[Stratum] ${req.method} ${req.url}`);
	next();
});

// Global Ingress prefix stripper — ensures all internal routing and proxying
// uses root-relative paths, regardless of the dynamic Ingress ID.
app.use((req, _res, next) => {
	if (ADDON && req.path.startsWith('/api/hassio_ingress/')) {
		const parts = req.path.split('/');
		if (parts.length >= 5) {
			req.url = '/' + parts.slice(4).join('/');
		}
	}
	next();
});

// Add X-Proxy-Target for SvelteKit +page.server.ts load function
app.use((req, _res, next) => {
	req.headers['X-Proxy-Target'] = resolveTarget(req);
	next();
});

function shouldProxy(pathname) {
	// Never proxy our own internal API routes
	const isInternalApi = INTERNAL_API_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
	if (isInternalApi) return false;

	// Proxy all other HA-specific endpoints
	return (
		pathname === '/api' ||
		pathname.startsWith('/api/') ||
		pathname === '/local' ||
		pathname.startsWith('/local/')
	);
}

// Proxy match for HA endpoints
app.use((req, res, next) => {
	if (!shouldProxy(req.path)) return next();
	haProxy(req, res, next);
});

// ─── Internal API ───────────────────────────────────────────────────────────

app.get('/api-stratum/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api-stratum/ha/info', (_req, res) => {
	res.json({
		addon: ADDON,
		ingress: ADDON && !!SUPERVISOR_TOKEN
	});
});

// Read persisted auth config (hassUrl + token)
app.get('/api-stratum/auth-config', (_req, res) => {
	try {
		if (existsSync(CONFIG_PATH)) {
			const raw = readFileSync(CONFIG_PATH, 'utf-8');
			const cfg = JSON.parse(raw);
			res.json({ hassUrl: cfg.hassUrl ?? '', token: cfg.token ?? '' });
		} else {
			res.json({ hassUrl: '', token: '' });
		}
	} catch (err) {
		console.error('[Stratum] Failed to read auth config:', err.message);
		res.json({ hassUrl: '', token: '' });
	}
});

// Persist auth config to disk (hassUrl + token — separate from dashboard config)
app.post('/api-stratum/auth-config', express.json(), (req, res) => {
	try {
		const { hassUrl = '', token = '' } = req.body ?? {};
		const dir = join(CONFIG_PATH, '..');
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(CONFIG_PATH, JSON.stringify({ hassUrl, token }, null, 2), 'utf-8');
		res.json({ ok: true });
	} catch (err) {
		console.error('[Stratum] Failed to write auth config:', err.message);
		res.status(500).json({ error: 'Failed to save config', message: err.message });
	}
});

// Test a user-supplied HA URL + token by probing /api/ on their instance
app.post('/api-stratum/ha/test', express.json(), async (req, res) => {
	const { url, token } = req.body ?? {};
	if (!url || !token) {
		return res.status(400).json({ error: 'Missing url or token' });
	}
	try {
		const testUrl = url.replace(/\/$/, '') + '/api/';
		const response = await fetch(testUrl, {
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(8000)
		});
		if (response.ok) {
			res.json({ ok: true });
		} else {
			res.status(response.status).json({
				error: `HA returned ${response.status}`,
				message: `HTTP ${response.status} — check your URL and token`
			});
		}
	} catch (err) {
		res.status(502).json({
			error: 'Connection failed',
			message: err instanceof Error ? err.message : String(err)
		});
	}
});

// ─── SvelteKit ──────────────────────────────────────────────────────────────

app.use(handler);

// ─── Global express error handler ───────────────────────────────────────────

app.use((err, _req, res, _next) => {
	console.error('[Stratum] Express error:', err);
	res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ─── Start ──────────────────────────────────────────────────────────────────

const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`[Stratum] ========================================`);
	console.log(`[Stratum] Running on http://0.0.0.0:${PORT}`);
	console.log(`[Stratum] Mode:        ${ADDON ? 'add-on' : 'standalone'}`);
	console.log(`[Stratum] HA URL:      ${HASS_URL}`);
	console.log(`[Stratum] Token:       ${SUPERVISOR_TOKEN ? 'present' : 'MISSING'}`);
	console.log(`[Stratum] Direct port: ${EXPOSED_PORT ?? 'disabled'}`);
	console.log(`[Stratum] ========================================`);
});

// ─── WebSocket Relay (addon mode) ───────────────────────────────────────────
// Browser connects to ws://our-server/api-stratum/ws
// Server opens ws://supervisor/core/api/websocket with SUPERVISOR_TOKEN,
// handles the HA auth handshake automatically, then relays messages
// bidirectionally — except browser "auth" messages, which are always
// intercepted to keep auth ownership server-side and avoid late-auth churn.

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (browserWs) => {
	const haWsUrl = HASS_URL.replace(/^http/, 'ws') + '/api/websocket';
	console.log(`[Stratum] WS relay: new browser connection → opening ${haWsUrl}`);

	const haWs = new WebSocket(haWsUrl, {
		headers: SUPERVISOR_TOKEN
			? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
			: undefined
	});

	let haReady = false;
	const pendingFromBrowser = [];

	// ── Keepalive ping every 30s to prevent HA Ingress from killing idle WS ──
	// HA Ingress reverse-proxy drops WebSocket connections that are idle for
	// ~60s. Sending a ping frame keeps the TCP connection alive so the relay
	// stays open indefinitely and service calls never get silently dropped.
	const keepalive = setInterval(() => {
		if (browserWs.readyState === WebSocket.OPEN) {
			browserWs.ping();
		}
		if (haWs.readyState === WebSocket.OPEN) {
			haWs.ping();
		}
	}, 30_000);

	function cleanup() {
		clearInterval(keepalive);
	}

	haWs.on('message', (data) => {
		let msg;
		try { msg = JSON.parse(data.toString()); } catch { /* forward raw */ }

		// Intercept auth_required — respond automatically with SUPERVISOR_TOKEN
		if (msg?.type === 'auth_required') {
			haWs.send(JSON.stringify({ type: 'auth', access_token: SUPERVISOR_TOKEN }));
			return;
		}

		// auth_ok — send auth_required + auth_ok to the browser so that
		// home-assistant-js-websocket's handshake state machine completes correctly
		if (msg?.type === 'auth_ok') {
			haReady = true;
			if (browserWs.readyState === WebSocket.OPEN) {
				browserWs.send(JSON.stringify({ type: 'auth_required', ha_version: msg.ha_version ?? '0.0.0' }));
				browserWs.send(JSON.stringify({ type: 'auth_ok', ha_version: msg.ha_version ?? '0.0.0' }));
			}
			// Flush any messages the browser sent before relay was ready
			for (const queued of pendingFromBrowser) {
				if (haWs.readyState === WebSocket.OPEN) haWs.send(queued);
			}
			pendingFromBrowser.length = 0;
			console.log('[Stratum] WS relay: auth_ok — relay fully connected');
			return;
		}

		// auth_invalid — close browser connection with a clear error
		if (msg?.type === 'auth_invalid') {
			console.error('[Stratum] WS relay: HA auth_invalid — SUPERVISOR_TOKEN rejected');
			browserWs.close(4401, 'HA auth_invalid');
			haWs.close();
			return;
		}

		// Log service call errors so they're visible in addon logs
		if (msg?.type === 'result' && msg.success === false) {
			console.error(`[Stratum] WS relay: HA returned error for id=${msg.id}:`, JSON.stringify(msg.error));
		}

		// All other messages — pass through to browser
		if (browserWs.readyState === WebSocket.OPEN) {
			browserWs.send(data);
		}
	});

	browserWs.on('message', (data) => {
		// Always intercept browser auth messages.
		// The relay performs HA auth server-side with SUPERVISOR_TOKEN and then
		// synthesizes auth_required/auth_ok back to the browser. Forwarding any
		// late browser {"type":"auth"} to HA can destabilize the WS session.
		let msg;
		try { msg = JSON.parse(data.toString()); } catch { /* non-JSON frames are relayed */ }
		if (msg?.type === 'auth') return;

		// Queue all non-auth messages until HA auth completes.
		if (!haReady) {
			pendingFromBrowser.push(data);
			return;
		}
		if (haWs.readyState === WebSocket.OPEN) {
			haWs.send(data);
		} else {
			console.warn('[Stratum] WS relay: browser sent message but HA WS is not open (state:', haWs.readyState, ')');
		}
	});

	haWs.on('error', (err) => {
		console.error('[Stratum] WS relay: HA socket error:', err.message);
		browserWs.close(1011, 'HA connection error');
	});

	browserWs.on('close', (code, reason) => {
		console.log(`[Stratum] WS relay: browser disconnected (${code} ${reason})`);
		cleanup();
		if (haWs.readyState === WebSocket.OPEN || haWs.readyState === WebSocket.CONNECTING) {
			haWs.close();
		}
	});

	haWs.on('close', (code, reason) => {
		console.log(`[Stratum] WS relay: HA socket closed (${code} ${reason})`);
		cleanup();
		if (browserWs.readyState === WebSocket.OPEN) {
			browserWs.close(1001, 'HA closed connection');
		}
	});
});

// WebSocket upgrade handler
server.on('upgrade', (req, socket, head) => {
	// Strip the Ingress prefix (e.g. /api/hassio_ingress/{token}/...) so the
	// pathname checks below work identically for both direct and Ingress access.
	if (ADDON && req.url?.includes('/api/hassio_ingress/')) {
		// parts: ['', 'api', 'hassio_ingress', '{token}', ...rest]
		const parts = req.url.split('/');
		req.url = '/' + parts.slice(4).join('/');
	}

	const pathname = req.url?.split('?')[0] ?? '';

	// Our relay endpoint — no token needed from browser
	if (pathname === '/api-stratum/ws') {
		if (!ADDON || !SUPERVISOR_TOKEN) {
			socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
			socket.destroy();
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
		return;
	}

	// Proxy all other WS paths to HA (e.g. /api/websocket for standalone mode)
	if (shouldProxy(pathname)) {
		haProxy.upgrade(req, socket, head);
	}
});
