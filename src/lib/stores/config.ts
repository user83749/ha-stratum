import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface HAConfig {
	hassUrl: string;
	token: string;
}

function createConfigStore() {
	const initial: HAConfig = browser
		? {
				hassUrl: localStorage.getItem('ha_studio_url') ?? '',
				token: localStorage.getItem('ha_studio_token') ?? ''
			}
		: { hassUrl: '', token: '' };

	const { subscribe, set, update } = writable<HAConfig>(initial);

	return {
		subscribe,
		set: (value: HAConfig) => {
			if (browser) {
				localStorage.setItem('ha_studio_url', value.hassUrl);
				localStorage.setItem('ha_studio_token', value.token);
			}
			set(value);
		},
		update,
		clear: () => {
			if (browser) {
				localStorage.removeItem('ha_studio_url');
				localStorage.removeItem('ha_studio_token');
			}
			set({ hassUrl: '', token: '' });
		},
		isConfigured: () => {
			const { hassUrl, token } = get(configStore);
			return hassUrl.trim().length > 0 && token.trim().length > 0;
		}
	};
}

export const configStore = createConfigStore();
