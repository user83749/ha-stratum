import { writable } from 'svelte/store';

/** Set once at startup from +layout.svelte based on server-side ADDON env var. */
export const isAddon = writable<boolean>(false);
