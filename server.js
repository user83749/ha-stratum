import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { handler } from './build/handler.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if present (standalone mode)
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
		// Strip surrounding quotes
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		// Strip inline comments
		val = val.split(/\s+#/)[0].trim();
		if (key) process.env[key] = val;
	}
}

const PORT = parseInt(process.env.PORT ?? '5173', 10);
const ADDON = process.env.ADDON === 'true';
const HASS_URL = process.env.HASS_URL ?? 'http://homeassistant.local:8123';
const EXPOSED_PORT = process.env.EXPOSED_PORT;
const HASS_PORT = process.env.HASS_PORT;

const app = express();
const INTERNAL_API_PREFIXES = ['/api/config', '/api/ha/test'];

// Resolve HA target URL based on deployment mode
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
	ws: true
});

// Proxy /api and /local to HA
app.use((req, res, next) => {
	if (!shouldProxy(req.path)) return next();
	return haProxy(req, res, next);
});

// SvelteKit handler
app.use(handler);

app.listen(PORT, () => {
	console.log(`stratum running on http://localhost:${PORT}`);
	console.log(`Mode: ${ADDON ? 'add-on' : 'standalone'} | HA: ${HASS_URL}`);
});
