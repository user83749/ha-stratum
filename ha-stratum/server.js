import { handler } from './build/handler.js';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

const ADDON = process.env.ADDON === 'true';
const PORT = process.env.PORT || 5173;

// environment-aware proxy target resolution
const entryMiddleware = async (req, res, next) => {
	// default to Home Assistant local
	let target = process.env.HASS_URL || 'http://homeassistant.local:8123';

	if (ADDON) {
		const {
			'x-hass-source': source,
			'x-forwarded-proto': forwardedProto,
			'x-forwarded-host': forwardedHost
		} = req.headers;

		// Ingress provides headers to point back to HA cleanly
		if (source && forwardedProto && forwardedHost) {
			target = `${forwardedProto}://${forwardedHost}`;
		} else if (process.env.SUPERVISOR_TOKEN) {
			target = 'http://supervisor/core';
		}
	}

	// add header for +page.server.ts
	req.headers['X-Proxy-Target'] = target;
	req.target = target;
	next();
};

const haProxy = createProxyMiddleware({
	pathFilter: ['/api/', '/local/'],
	router: (req) => req.target,
	changeOrigin: true,
	ws: true,
	headers: process.env.SUPERVISOR_TOKEN
		? { Authorization: `Bearer ${process.env.SUPERVISOR_TOKEN}` }
		: undefined
});

// health
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ha info
app.get('/api/ha/info', (req, res) => {
	res.json({
		addon: ADDON,
		hassUrl: req.target,
		ingress: ADDON && !!process.env.SUPERVISOR_TOKEN
	});
});

app.use(entryMiddleware, haProxy);

// SvelteKit
app.use(handler);

app.listen(PORT, '0.0.0.0', () => {
	console.log(`[Stratum] Server building ${ADDON ? 'ADD-ON' : 'STANDALONE'}...`);
	console.log(`[Stratum] Port: ${PORT} | Target: ${process.env.HASS_URL || 'auto'}`);
});
