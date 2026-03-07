import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Keep dev/preview behavior aligned with server.js:
// - In add-on mode: persist under /data
// - Otherwise: persist under ./data
const DATA_DIR =
	process.env.ADDON === 'true' ? '/data' : join(process.cwd(), 'data');

const CONFIG_PATH = process.env.ADDON === 'true'
	? '/data/stratum-config.json'
	: join(DATA_DIR, 'stratum-config.json');

function ensureDir() {
	try {
		if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
	} catch (err) {
		console.error('[stratum] Failed to create data dir:', err);
	}
}

export const GET: RequestHandler = () => {
	ensureDir();
	try {
		if (!existsSync(CONFIG_PATH)) {
			return json({ hassUrl: '', token: '' });
		}
		const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as { hassUrl?: string; token?: string };
		return json({ hassUrl: raw.hassUrl ?? '', token: raw.token ?? '' });
	} catch (err) {
		console.error('[stratum] Failed to read auth config:', err);
		return json({ hassUrl: '', token: '' });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	ensureDir();

	let body: { hassUrl?: string; token?: string };
	try {
		body = (await request.json()) as { hassUrl?: string; token?: string };
	} catch {
		error(400, 'Invalid JSON body');
	}

	try {
		const hassUrl = (body.hassUrl ?? '').trim();
		const token = (body.token ?? '').trim();
		writeFileSync(CONFIG_PATH, JSON.stringify({ hassUrl, token }, null, 2), 'utf-8');
		return json({ ok: true });
	} catch (err) {
		console.error('[stratum] Failed to write auth config:', err);
		error(500, 'Failed to save auth config');
	}
};

