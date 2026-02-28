// SSR Ghost Mocks — prevents crashes from dependencies using browser globals
try {
	if (typeof window === 'undefined') {
		global.window = global;
		global.document = {
			addEventListener: () => { },
			removeEventListener: () => { },
			documentElement: { style: { setProperty: () => { } }, classList: { toggle: () => { }, add: () => { }, remove: () => { } } }
		};
	}
	if (typeof navigator === 'undefined') {
		global.navigator = { userAgent: '', platform: '' };
	}
} catch (e) {
	// Fallback for modern Node where some globals are read-only
}

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { handler } from './build/handler.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Environment ────────────────────────────────────────────────────────────

// Load .env if present (standalone / dev mode only)
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
	const lines = readFileSync(envPath, 'utf-8').split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let val = trimmed.slice(eqIdx + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		val = val.split(/\s+#/)[0].trim();
		if (key) process.env[key] = val;
	}
}

const PORT = parseInt(process.env.PORT ?? '5173', 10);
const ADDON = process.env.ADDON === 'true';
const EXPOSED_PORT = process.env.EXPOSED_PORT;
const HASS_PORT = process.env.HASS_PORT;

// HA Supervisor injects SUPERVISOR_TOKEN automatically when homeassistant_api
// is enabled in config.yaml. This lets us talk to HA Core at http://supervisor/core
// without the user needing to configure anything.
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Express app ────────────────────────────────────────────────────────────

const app = express();

// ─── Health endpoint (used by HA watchdog) ──────────────────────────────────
app.get('/api/health', (_req, res) => {
	res.status(200).json({ status: 'ok' });
});

// ─── HA info endpoint (client can fetch HA connection details) ──────────────
// The client-side app can call this to auto-configure the HA websocket
// connection without the user having to manually enter URL + token.
app.get('/api/ha/info', (_req, res) => {
	res.json({
		addon: ADDON,
		hassUrl: ADDON ? '' : HASS_URL,
		// In add-on/ingress mode, the browser talks to HA via the same origin.
		// The Supervisor token is server-side only (never sent to browser).
		ingress: ADDON && !!SUPERVISOR_TOKEN
	});
});

// ─── Proxy /api and /local to HA ────────────────────────────────────────────

const INTERNAL_API_PREFIXES = ['/api/config', '/api/ha', '/api/health'];

function resolveTarget(req) {
	const forwardedProto = req.headers['x-forwarded-proto'];
	const forwardedHost = req.headers['x-forwarded-host'];
	const source = req.headers['x-ingress-path'];

	// HA add-on ingress mode
	if (ADDON && source && forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	// Exposed port mode (HA add-on, direct port)
	if (ADDON && EXPOSED_PORT && HASS_PORT) {
		const host = req.headers.host ?? '';
		const proto = req.secure ? 'https' : 'http';
		return `${proto}://${host.replace(EXPOSED_PORT, HASS_PORT)}`;
	}

	// Standalone Docker / dev mode
	return HASS_URL;
}

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

const haProxy = createProxyMiddleware({
	router: resolveTarget,
	changeOrigin: true,
	ws: true,
	headers: SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
		: undefined
});

// Proxy /api and /local to HA
app.use((req, res, next) => {
	if (!shouldProxy(req.path)) return next();
	return haProxy(req, res, next);
});

// SvelteKit handler
app.use(handler);

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
	console.log(`stratum running on http://localhost:${PORT}`);
	console.log(`Mode: ${ADDON ? 'add-on' : 'standalone'} | HA: ${HASS_URL}`);
	if (ADDON && SUPERVISOR_TOKEN) {
		console.log('[Stratum] Supervisor token detected — HA API access enabled.');
	}
});
