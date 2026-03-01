// SSR Ghost Mocks — prevents crashes from dependencies using browser globals
try {
	Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true });
	Object.defineProperty(globalThis, 'navigator', {
		value: { userAgent: 'node', platform: 'node', serviceWorker: { register: () => Promise.resolve() } },
		writable: true,
		configurable: true
	});
	Object.defineProperty(globalThis, 'document', {
		value: {
			addEventListener: () => { },
			removeEventListener: () => { },
			documentElement: { style: { setProperty: () => { } }, classList: { toggle: () => { }, add: () => { }, remove: () => { } } }
		},
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

dotenv.config();

const app = express();

const PORT = parseInt(process.env.PORT ?? '5173', 10);
const ADDON = process.env.ADDON === 'true';

// Supervisor injects this when homeassistant_api is enabled.
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Proxy Helpers ──────────────────────────────────────────────────────────

const INTERNAL_API_PREFIXES = ['/api/config', '/api/ha', '/api/health'];

function resolveTarget(req) {
	const forwardedProto = req.headers['x-forwarded-proto'];
	const forwardedHost = req.headers['x-forwarded-host'];
	const source = req.headers['x-ingress-path'];

	// 1. Ingress Proxy Mode
	if (ADDON && source && forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	// 2. Local fallback / Configured URL
	return HASS_URL;
}

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

const haProxy = createProxyMiddleware({
	router: resolveTarget,
	changeOrigin: true,
	ws: true,
	headers: SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
		: undefined
});

// ─── Middleware ─────────────────────────────────────────────────────────────

// Add X-Proxy-Target for SvelteKit +page.server.ts load function
app.use((req, res, next) => {
	req.headers['X-Proxy-Target'] = resolveTarget(req);
	next();
});

// Proxy match for HA endpoints
app.use((req, res, next) => {
	if (!shouldProxy(req.path)) return next();
	haProxy(req, res, next);
});

// ─── Internal API ───────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/ha/info', (req, res) => {
	res.json({
		addon: ADDON,
		hassUrl: ADDON ? '' : resolveTarget(req),
		ingress: ADDON && !!SUPERVISOR_TOKEN
	});
});

// ─── SvelteKit ──────────────────────────────────────────────────────────────

app.use(handler);

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
	console.log(`[Stratum] Running on http://localhost:${PORT}`);
	console.log(`[Stratum] Mode: ${ADDON ? 'add-on' : 'standalone'} | HA: ${HASS_URL}`);
});
