import { json, error } from '@sveltejs/kit';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { migrateConfig, defaultConfig } from '$lib/types/dashboard';
import type { RequestHandler } from './$types';

// In add-on mode /data is the HA persistent data dir; otherwise use local ./data
const DATA_DIR =
    process.env.ADDON === 'true' ? '/data' : join(process.cwd(), 'data');

const CONFIG_PATH = join(DATA_DIR, 'dashboard.json');

function ensureDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export const GET: RequestHandler = () => {
    ensureDir();

    if (!existsSync(CONFIG_PATH)) {
        const fresh = defaultConfig();
        writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2), 'utf-8');
        return json(fresh);
    }

    try {
        const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
        return json(migrateConfig(raw));
    } catch {
        error(500, 'Failed to read dashboard config');
    }
};

export const POST: RequestHandler = async ({ request }) => {
    ensureDir();

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        error(400, 'Invalid JSON body');
    }

    try {
        const config = migrateConfig(body);
        writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        return json({ ok: true });
    } catch {
        error(500, 'Failed to write dashboard config');
    }
};
