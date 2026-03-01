import type { PageServerLoad } from './$types';

/**
 * Server load function to pass the current proxy target to the client.
 * This ensures the frontend doesn't have to guess or wait for an extra fetch 
 * to know which Home Assistant instance it should talk to.
 */
export const load: PageServerLoad = async ({ request }) => {
    const hassUrl = process.env.HASS_URL || request.headers.get('X-Proxy-Target') || '';

    return {
        config: {
            hassUrl,
            addon: process.env.ADDON === 'true'
        }
    };
};
