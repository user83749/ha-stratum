// ── Imports ────────────────────────────────────────────────────────────────

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HAConfig {
	hassUrl: string;
	token: string;
}

const defaultConfig: HAConfig = { hassUrl: '', token: '' };

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns the Ingress path prefix (e.g. /api/hassio_ingress/{token}) or '' */
function ingressPrefix(): string {
	if (!browser) return '';
	const m = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
	return m ? m[1] : '';
}

// ── Store ──────────────────────────────────────────────────────────────────

function createConfigStore() {
	const store = writable<HAConfig>(defaultConfig);

	/** Fire-and-forget: persist config to server disk. */
	function saveToServer(value: HAConfig) {
		if (!browser) return;
		fetch(`${ingressPrefix()}/api-stratum/auth-config`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(value)
		}).catch((e) => console.error('[App] Failed to save config:', e));
	}

	return {
		subscribe: store.subscribe,

		/** Called once on mount from +layout.svelte with server-loaded data — does NOT re-persist. */
		init(value: HAConfig) {
			store.set(value);
		},

		/** Update store AND persist to server. */
		set(value: HAConfig) {
			store.set(value);
			saveToServer(value);
		},

		/** Clear credentials from store and server. */
		clear() {
			store.set(defaultConfig);
			saveToServer(defaultConfig);
		},

		isConfigured() {
			const { hassUrl, token } = get(store);
			return hassUrl.trim().length > 0 && token.trim().length > 0;
		}
	};
}

// ── Public Store ────────────────────────────────────────────────────────────

export const configStore = createConfigStore();
