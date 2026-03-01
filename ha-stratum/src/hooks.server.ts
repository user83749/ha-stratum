import type { Handle } from '@sveltejs/kit';

/**
 * Remove large sveltekit `link` header to be able to run behind reverse proxy
 * `upstream sent too big header while reading response header from upstream`
 */
export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);
    response.headers.delete('link');
    return response;
};
