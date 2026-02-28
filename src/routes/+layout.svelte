<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { connect, connectionStatus } from '$lib/ha/websocket';
	import { get } from 'svelte/store';
	import { configStore } from '$lib/stores/config';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { applyTheme, watchSystemScheme } from '$lib/themes/apply';
	import { loadDemoIfActive, isDemoMode } from '$lib/demo/index';

	let { children } = $props();

	const PUBLIC_ROUTES = ['/connect'];
	let dashboardLoaded = $state(false);
	let connecting = false;
	let loadingDashboard = false;
	let loadedMode = $state<'demo' | 'live' | null>(null);

	// Reactively re-apply theme whenever dashboard config changes
	$effect(() => {
		if (!browser) return;
		applyTheme($dashboardStore.theme, $dashboardStore.settings.reducedMotion);
	});

	let stopWatchingScheme: (() => void) | null = null;

	onMount(() => {
		// Apply default theme immediately to avoid flash of unstyled content
		applyTheme($dashboardStore.theme, $dashboardStore.settings.reducedMotion);

		// Watch system dark/light preference for 'system' scheme
		stopWatchingScheme = watchSystemScheme(() => ({
			theme: $dashboardStore.theme,
			reducedMotion: $dashboardStore.settings.reducedMotion
		}));
	});

	onDestroy(() => {
		stopWatchingScheme?.();
	});

	$effect(() => {
		if (!browser) return;
		void syncAppState();
	});

	async function syncAppState() {
		const isPublic = PUBLIC_ROUTES.includes($page.url.pathname);

		if (isDemoMode()) {
			if (loadedMode !== 'demo') {
				loadDemoIfActive();
				dashboardLoaded = true;
				loadedMode = 'demo';
			}
			if (isPublic) await goto('/');
			return;
		}

		if (loadedMode === 'demo') {
			dashboardLoaded = false;
			loadedMode = null;
		}

		if (!configStore.isConfigured()) {
			dashboardLoaded = false;
			loadedMode = null;
			if (!isPublic) await goto('/connect');
			return;
		}

		if ($connectionStatus === 'error') {
			dashboardLoaded = false;
			loadedMode = null;
			if (!isPublic) await goto('/connect');
			return;
		}

		if ($connectionStatus === 'disconnected' && !connecting) {
			connecting = true;
			try {
				const { hassUrl, token } = $configStore;
				await connect(hassUrl, token);
			} finally {
				connecting = false;
			}
		}

		if ($connectionStatus === 'connected' && !dashboardLoaded && !loadingDashboard) {
			loadingDashboard = true;
			try {
				await dashboardStore.load();
				dashboardLoaded = true;
				loadedMode = 'live';
				applyTheme(get(dashboardStore).theme, get(dashboardStore).settings.reducedMotion);
			} finally {
				loadingDashboard = false;
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Stratum</title>
</svelte:head>

<div
	style="font-family: var(--font-family); font-size: var(--font-size);"
	class="contents"
>
	{@render children()}
</div>
