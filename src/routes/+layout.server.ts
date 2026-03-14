import type { LayoutServerLoad } from './$types';

const ADDON = process.env.ADDON === 'true';

export const load: LayoutServerLoad = async ({ fetch }) => {
    let config = { hassUrl: '', token: '' };
    try {
        const res = await fetch('/api-stratum/auth-config');
        if (res.ok) {
            const parsed = await res.json();
            config = {
                hassUrl: String(parsed?.hassUrl ?? '').trim(),
                token: String(parsed?.token ?? '').trim().replace(/^Bearer\s+/i, '')
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
