import { browser } from '$app/environment';
import { readable } from 'svelte/store';

function createTickStore(intervalMs: number) {
	return readable<number>(Date.now(), (set) => {
		if (!browser) return () => {};
		set(Date.now());
		const id = setInterval(() => set(Date.now()), intervalMs);
		return () => clearInterval(id);
	});
}

export const clockNow = createTickStore(1000);
export const relativeNow = createTickStore(30_000);
