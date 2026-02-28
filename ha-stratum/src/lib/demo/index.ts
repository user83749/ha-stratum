import { browser } from '$app/environment';
import { dashboardStore } from '$lib/stores/dashboard';
import { demoDashboardConfig } from '$lib/demo/dashboard';
import { DEMO_ENTITIES } from '$lib/demo/entities';
import { entities } from '$lib/ha/websocket';

const DEMO_KEY = 'ha_studio_demo';
const DEMO_STATE_KEY = 'ha_studio_demo_state';
// Bump this whenever the demo dashboard layout changes — forces cache invalidation
const DEMO_VERSION = '32';

export function isDemoMode(): boolean {
	if (!browser) return false;
	const params = new URLSearchParams(window.location.search);
	if (params.get('demo') === 'true') return true;
	return localStorage.getItem(DEMO_KEY) === 'true';
}

export function loadDemoIfActive() {
	if (isDemoMode()) {
		activateDemo();
	}
}

export function activateDemo() {
	if (!browser) return;
	localStorage.setItem(DEMO_KEY, 'true');

	// Populate the fake websocket with our mock states
	entities.set(DEMO_ENTITIES);

	const lastVersion = localStorage.getItem(`${DEMO_STATE_KEY}_version`);
	if (lastVersion !== DEMO_VERSION) {
		const freshConfig = demoDashboardConfig();
		dashboardStore.seed(freshConfig);
		localStorage.setItem(`${DEMO_STATE_KEY}_data`, JSON.stringify(freshConfig));
		localStorage.setItem(`${DEMO_STATE_KEY}_version`, DEMO_VERSION);
	} else {
		try {
			const saved = localStorage.getItem(`${DEMO_STATE_KEY}_data`);
			if (saved) {
				dashboardStore.seed(JSON.parse(saved));
			} else {
				throw new Error('No saved demo state found despite matching version');
			}
		} catch (e) {
			console.warn('[Demo] Failed to load saved demo state, regenerating...', e);
			const freshConfig = demoDashboardConfig();
			dashboardStore.seed(freshConfig);
			localStorage.setItem(`${DEMO_STATE_KEY}_data`, JSON.stringify(freshConfig));
		}
	}

	const url = new URL(window.location.href);
	url.searchParams.delete('demo');
	window.history.replaceState({}, '', url);
}

export function deactivateDemo() {
	if (!browser) return;
	localStorage.removeItem(DEMO_KEY);
	localStorage.removeItem(`${DEMO_STATE_KEY}_data`);
	localStorage.removeItem(`${DEMO_STATE_KEY}_version`);
	window.location.reload();
}
