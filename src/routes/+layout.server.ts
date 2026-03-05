import type { LayoutServerLoad } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ADDON = process.env.ADDON === 'true';
const CONFIG_PATH = ADDON
    ? '/data/stratum-config.json'
    : join(process.cwd(), 'data', 'stratum-config.json');

export const load: LayoutServerLoad = async () => {
    let config = { hassUrl: '', token: '' };
    try {
        if (existsSync(CONFIG_PATH)) {
            const raw = readFileSync(CONFIG_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            config = {
                hassUrl: parsed.hassUrl ?? '',
                token: parsed.token ?? ''
            };
        }
    } catch (e) {
        console.error('[Stratum] layout.server: Failed to load config:', e);
    }

    return {
        config,
        isAddon: ADDON
    };
};
