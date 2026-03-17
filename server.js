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
const EXPOSED_PORT = process.env.EXPOSED_PORT ?? null;
const CONFIG_PATH = ADDON
	? '/data/stratum-config.json'
	: join(__dirname, 'data', 'stratum-config.json');

function sanitizeToken(raw) {
	return String(raw ?? '').trim().replace(/^Bearer\s+/i, '');
}

function normalizeBaseUrl(raw) {
	try {
		const url = new URL(String(raw ?? '').trim());
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return '';
	}
}

function readAuthConfig() {
	try {
		if (!existsSync(CONFIG_PATH)) return { hassUrl: '', token: '' };
		const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
		return {
			hassUrl: normalizeBaseUrl(raw.hassUrl),
			token: sanitizeToken(raw.token)
		};
	} catch {
		return { hassUrl: '', token: '' };
	}
}

// ─── Process-level error handlers ───────────────────────────────────────────

process.on('uncaughtException', (err) => {
	console.error('[Stratum] UNCAUGHT EXCEPTION:', err);
	process.exit(1);
});

process.on('unhandledRejection', (reason) => {
	console.error('[Stratum] UNHANDLED REJECTION:', reason);
});

const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Proxy Helpers ──────────────────────────────────────────────────────────

const INTERNAL_API_PREFIXES = ['/api-stratum'];

function resolveTarget(_req) {
	if (ADDON) return HASS_URL;
	const cfg = readAuthConfig();
	return cfg.hassUrl || HASS_URL;
}

function resolveToken() {
	if (ADDON) return sanitizeToken(SUPERVISOR_TOKEN);
	return sanitizeToken(readAuthConfig().token);
}

const haProxy = createProxyMiddleware({
	router: resolveTarget,
	changeOrigin: true,
	// ws: true is intentionally omitted — all WebSocket upgrades are handled
	// manually in server.on('upgrade') below to avoid double-handling
	on: {
		proxyReq: (proxyReq) => {
			// Inject auth server-side for every proxied HTTP request.
			// This covers /api/camera_proxy/, /api/hls/, and all other HA
			// endpoints so tokens never need to appear in browser-visible URLs.
			const token = resolveToken();
			if (token) {
				proxyReq.setHeader('Authorization', `Bearer ${token}`);
			}
		},
		error: (err, req, res) => {
			console.error(`[Stratum] Proxy error for ${req.method} ${req.url}:`, err.message);
			if (res && typeof res.status === 'function') {
				res.status(502).json({ error: 'Proxy error', message: err.message });
			}
		}
	}
});

// ─── Middleware ─────────────────────────────────────────────────────────────

app.use((req, _res, next) => {
	console.log(`[Stratum] ${req.method} ${req.url}`);
	next();
});

app.use((req, _res, next) => {
	if (ADDON && req.path.startsWith('/api/hassio_ingress/')) {
		const parts = req.path.split('/');
		if (parts.length >= 5) {
			req.url = '/' + parts.slice(4).join('/');
		}
	}
	next();
});

function shouldProxy(pathname) {
	const isInternalApi = INTERNAL_API_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
	);
	if (isInternalApi) return false;

	return (
		pathname === '/api' ||
		pathname.startsWith('/api/') ||
		pathname === '/local' ||
		pathname.startsWith('/local/')
	);
}

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

app.get('/api-stratum/auth-config', (_req, res) => {
	try {
		res.json(readAuthConfig());
	} catch (err) {
		console.error('[Stratum] Failed to read auth config:', err.message);
		res.json({ hassUrl: '', token: '' });
	}
});

app.post('/api-stratum/auth-config', express.json(), (req, res) => {
	try {
		const { hassUrl = '', token = '' } = req.body ?? {};
		const dir = join(CONFIG_PATH, '..');
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		writeFileSync(
			CONFIG_PATH,
			JSON.stringify({
				hassUrl: normalizeBaseUrl(hassUrl),
				token: sanitizeToken(token)
			}, null, 2),
			'utf-8'
		);
		res.json({ ok: true });
	} catch (err) {
		console.error('[Stratum] Failed to write auth config:', err.message);
		res.status(500).json({ error: 'Failed to save config', message: err.message });
	}
});

app.post('/api-stratum/ha/test', express.json(), async (req, res) => {
	const { url, token } = req.body ?? {};
	const cleanUrl = normalizeBaseUrl(url);
	const cleanToken = sanitizeToken(token);
	if (!cleanUrl || !cleanToken) {
		return res.status(400).json({ error: 'Missing url or token' });
	}
	try {
		const testUrl = cleanUrl + '/api/';
		const response = await fetch(testUrl, {
			headers: { Authorization: `Bearer ${cleanToken}` },
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

// ─── WebSocket Relay ─────────────────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (browserWs) => {
	const standaloneAuth = ADDON ? null : readAuthConfig();
	const relayHassUrl = ADDON
		? String(HASS_URL ?? '').trim().replace(/\/$/, '')
		: normalizeBaseUrl(standaloneAuth?.hassUrl);
	const relayToken = ADDON
		? sanitizeToken(SUPERVISOR_TOKEN)
		: sanitizeToken(standaloneAuth?.token);

	if (!relayHassUrl || !relayToken) {
		console.error('[Stratum] WS relay: missing Home Assistant URL or token');
		browserWs.close(4401, 'Missing Home Assistant credentials');
		return;
	}

	const haWsUrl = relayHassUrl.replace(/^http/, 'ws') + '/api/websocket';
	console.log(`[Stratum] WS relay: new browser connection → opening ${haWsUrl}`);

	const haWs = new WebSocket(haWsUrl, {
		headers: relayToken
			? { Authorization: `Bearer ${relayToken}` }
			: undefined
	});

	let haReady = false;
	let haAuthRequested = false;
	let pendingAuthPayload = null;
	const pendingFromBrowser = [];

	const keepalive = setInterval(() => {
		if (browserWs.readyState === WebSocket.OPEN) browserWs.ping();
		if (haWs.readyState === WebSocket.OPEN) haWs.ping();
	}, 30_000);

	function cleanup() {
		clearInterval(keepalive);
	}

	haWs.on('message', (data, isBinary) => {
		let msg;
		try { msg = JSON.parse(data.toString()); } catch { /* forward raw */ }

		if (msg?.type === 'auth_required') {
			haAuthRequested = true;
			if (browserWs.readyState === WebSocket.OPEN) {
				browserWs.send(isBinary ? data : data.toString());
			}
			if (pendingAuthPayload && haWs.readyState === WebSocket.OPEN) {
				haWs.send(pendingAuthPayload);
				pendingAuthPayload = null;
			}
			return;
		}

		if (msg?.type === 'auth_ok') {
			haReady = true;
			haAuthRequested = false;
			if (browserWs.readyState === WebSocket.OPEN) {
				browserWs.send(isBinary ? data : data.toString());
			}
			for (const queued of pendingFromBrowser) {
				if (haWs.readyState === WebSocket.OPEN) haWs.send(queued);
			}
			pendingFromBrowser.length = 0;
			console.log('[Stratum] WS relay: auth_ok — relay fully connected');
			return;
		}

		if (msg?.type === 'auth_invalid') {
			console.error('[Stratum] WS relay: HA auth_invalid — relay token rejected');
			browserWs.close(4401, 'HA auth_invalid');
			haWs.close();
			return;
		}

		if (msg?.type === 'result' && msg.success === false) {
			console.error(`[Stratum] WS relay: HA returned error for id=${msg.id}:`, JSON.stringify(msg.error));
		}

		if (browserWs.readyState === WebSocket.OPEN) {
			browserWs.send(isBinary ? data : data.toString());
		}
	});

	browserWs.on('message', (data, isBinary) => {
		let msg;
		try { msg = JSON.parse(data.toString()); } catch { /* non-JSON frames are relayed */ }
		if (msg?.type === 'auth') {
			if (haReady) return;
			if (!relayToken) {
				browserWs.close(4401, 'Token missing');
				return;
			}
			pendingAuthPayload = JSON.stringify({ type: 'auth', access_token: relayToken });
			if (haWs.readyState === WebSocket.OPEN && haAuthRequested) {
				haWs.send(pendingAuthPayload);
				pendingAuthPayload = null;
			}
			return;
		}
		const relayPayload = isBinary ? data : data.toString();
		if (!haReady) {
			pendingFromBrowser.push(relayPayload);
			return;
		}
		if (haWs.readyState === WebSocket.OPEN) {
			haWs.send(relayPayload);
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
	if (ADDON && req.url?.includes('/api/hassio_ingress/')) {
		const parts = req.url.split('/');
		req.url = '/' + parts.slice(4).join('/');
	}

	const pathname = req.url?.split('?')[0] ?? '';

	if (pathname === '/api-stratum/ws') {
		if (ADDON && !SUPERVISOR_TOKEN) {
			socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
			socket.destroy();
			return;
		}
		if (!ADDON) {
			const cfg = readAuthConfig();
			if (!cfg.hassUrl || !cfg.token) {
				socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
				socket.destroy();
				return;
			}
		}
		wss.handleUpgrade(req, socket, head, (ws) => {
			wss.emit('connection', ws, req);
		});
		return;
	}

	if (shouldProxy(pathname)) {
		haProxy.upgrade(req, socket, head);
		return;
	}

	socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
	socket.destroy();
});