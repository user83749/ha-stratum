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

dotenv.config();

const app = express();

const PORT = parseInt(process.env.PORT ?? '8099', 10);
const ADDON = process.env.ADDON === 'true';

// Supervisor injects this when homeassistant_api is enabled.
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Proxy Helpers ──────────────────────────────────────────────────────────

const INTERNAL_API_PREFIXES = ['/api-stratum'];

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

const haProxy = createProxyMiddleware({
	router: resolveTarget,
	changeOrigin: true,
	ws: true,
	headers: SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
		: undefined
});

// ─── Middleware ─────────────────────────────────────────────────────────────

// Robust Ingress prefix stripping
app.use((req, res, next) => {
	const ingressPath = req.headers['x-ingress-path'] || '';
	const pathToCheck = req.url;

	if (ADDON) {
		let stripped = req.url;
		// 1. Try stripping via X-Ingress-Path header
		if (ingressPath && stripped.startsWith(ingressPath)) {
			stripped = stripped.slice(ingressPath.length) || '/';
		}
		// 2. Fallback: Strip anything that looks like the ingress pattern if still stuck
		if (stripped.startsWith('/api/hassio_ingress/')) {
			const parts = stripped.split('/');
			if (parts.length >= 5 && parts[1] === 'api' && parts[2] === 'hassio_ingress') {
				stripped = '/' + parts.slice(4).join('/');
			}
		}

		if (stripped !== req.url) {
			console.log(`[Stratum] Ingress Strip: ${req.url} -> ${stripped}`);
			req.url = stripped.startsWith('/') ? stripped : '/' + stripped;
		}
	}
	next();
});

// Add X-Proxy-Target for SvelteKit +page.server.ts load function
app.use((req, res, next) => {
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

app.get('/api-stratum/ha/info', (req, res) => {
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
