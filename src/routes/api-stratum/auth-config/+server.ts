import { json, error } from '@sveltejs/kit';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

const DATA_DIR =
	process.env.ADDON === 'true' ? '/data' : join(process.cwd(), 'data');

const CONFIG_PATH = join(DATA_DIR, 'stratum-config.json');

interface AuthConfig {
	hassUrl: string;
	token: string;
}

const DEFAULT_CONFIG: AuthConfig = { hassUrl: '', token: '' };

function ensureDir() {
	if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function sanitizeToken(raw: string): string {
	const trimmed = raw.trim();
	return trimmed.replace(/^Bearer\s+/i, '');
}

export const GET: RequestHandler = () => {
	ensureDir();
	if (!existsSync(CONFIG_PATH)) return json(DEFAULT_CONFIG);

	try {
		const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as Partial<AuthConfig>;
		return json({
			hassUrl: String(parsed.hassUrl ?? '').trim(),
			token: sanitizeToken(String(parsed.token ?? ''))
		});
	} catch {
		error(500, 'Failed to read auth config');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	ensureDir();

	let body: Partial<AuthConfig>;
	try {
		body = (await request.json()) as Partial<AuthConfig>;
	} catch {
		error(400, 'Invalid JSON body');
	}

	const next: AuthConfig = {
		hassUrl: String(body.hassUrl ?? '').trim(),
		token: sanitizeToken(String(body.token ?? ''))
	};

	try {
		writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
		return json({ ok: true });
	} catch {
		error(500, 'Failed to write auth config');
	}
};
