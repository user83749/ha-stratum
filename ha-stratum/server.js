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
const SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN ?? '';
const HASS_URL = process.env.HASS_URL
	?? (ADDON ? 'http://supervisor/core' : 'http://homeassistant.local:8123');

// ─── Entry Middleware ───────────────────────────────────────────────────────

const entryMiddleware = async (req, res, next) => {
	let target = HASS_URL;

	if (ADDON) {
		const {
			'x-forwarded-proto': proto,
			'x-forwarded-host': host,
			'x-ingress-path': source
		} = req.headers;

		// If we're behind ingress, the target for HA API calls is the ingress host
		if (source && proto && host) {
			target = `${proto}://${host}`;
		}
	}

	req.headers['X-Proxy-Target'] = target;
	req.target = target;
	next();
};

// ─── Proxy ──────────────────────────────────────────────────────────────────

const haProxy = createProxyMiddleware({
	pathFilter: (path) => {
		// Only proxy these specific HA prefixes
		return path.startsWith('/api/') || path.startsWith('/local/');
	},
	router: (req) => req.target,
	changeOrigin: true,
	ws: true,
	headers: SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${SUPERVISOR_TOKEN}` }
		: undefined
});

// Use ha-fusion order
app.use(entryMiddleware);
app.use(haProxy);

// ─── Internal API ───────────────────────────────────────────────────────────

app.get('/api-stratum/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api-stratum/ha/info', (req, res) => {
	res.json({
		addon: ADDON,
		hassUrl: ADDON ? '' : req.target,
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

