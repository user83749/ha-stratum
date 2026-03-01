import type { Handle } from '@sveltejs/kit';

/**
 * Remove large sveltekit `link` header to be able to run behind reverse proxy
 * `upstream sent too big header while reading response header from upstream`
 */
export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // SvelteKit 2.x injects a huge 'link' header for asset preloading.
    // Home Assistant's Ingress (Nginx) proxy has a default limit for headers 
    // that this frequently exceeds, causing a 502/504 Bad Gateway.
    response.headers.delete('link');

    return response;
};
