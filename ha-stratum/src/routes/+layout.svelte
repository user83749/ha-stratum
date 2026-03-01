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

	// ── Add-on ingress auto-connect ──────────────────────────────────────────
	// When running as an HA add-on via ingress, HA handles auth at the proxy
	// level. We detect this and use the ingress path as the WebSocket URL so
	// the user never has to manually enter a URL or token.
	async function tryAddonAutoConnect(): Promise<boolean> {
		if (!browser) return false;
		try {
			const res = await fetch('api/ha/info');
			if (!res.ok) return false;
			const info = await res.json();
			if (!info.addon) return false;

			// In ingress mode the browser talks to HA through the same origin.
			// The ingress path is already the HA base URL from the browser's
			// perspective so we use window.location.origin.
			const hassUrl = window.location.origin;

			// Fetch a long-lived token using the ingress auth endpoint.
			// HA injects a one-time token we can exchange for a bearer token.
			const tokenRes = await fetch('/api/hassio_ingress/validate_session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			// If session validation works, use the ingress connection directly.
			// Otherwise fall back to connecting via the origin with no token —
			// HA's ingress proxy automatically attaches the auth headers.
			const token = tokenRes.ok
				? ((await tokenRes.json()) as { token?: string }).token ?? ''
				: '';

			configStore.set({ hassUrl, token });
			return true;
		} catch {
			return false;
		}
	}

	$effect(() => {
		if (!browser) return;
		void syncAppState();
	});

	async function syncAppState() {
		const isPublic = PUBLIC_ROUTES.includes($page.url.pathname);
		console.log('[Stratum] Syncing app state, path:', $page.url.pathname, 'demo:', isDemoMode(), 'configured:', configStore.isConfigured());

		if (isDemoMode()) {
			if (loadedMode !== 'demo') {
				console.log('[Stratum] Loading demo...');
				loadDemoIfActive();
				dashboardLoaded = true;
				loadedMode = 'demo';
			}
			if (isPublic) await goto('.');
			return;
		}

		if (loadedMode === 'demo') {
			dashboardLoaded = false;
			loadedMode = null;
		}

		if (!configStore.isConfigured()) {
			console.log('[Stratum] Not configured, trying auto-connect...');
			const autoConnected = await tryAddonAutoConnect();
			if (!autoConnected) {
				console.log('[Stratum] Auto-connect failed, redirecting...');
				dashboardLoaded = false;
				loadedMode = null;
				return;
			}
		}

		if ($connectionStatus === 'error') {
			console.log('[Stratum] WS Error, redirecting...');
			dashboardLoaded = false;
			loadedMode = null;
			return;
		}

		if ($connectionStatus === 'disconnected' && !connecting) {
			console.log('[Stratum] WS Disconnected, connecting to:', $configStore.hassUrl);
			connecting = true;
			try {
				const { hassUrl, token } = $configStore;
				await connect(hassUrl, token);
			} finally {
				connecting = false;
			}
		}

		if ($connectionStatus === 'connected' && !dashboardLoaded && !loadingDashboard) {
			console.log('[Stratum] Connected, loading dashboard...');
			loadingDashboard = true;
			try {
				await dashboardStore.load();
				dashboardLoaded = true;
				loadedMode = 'live';
				console.log('[Stratum] Dashboard loaded.');
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
	{#if dashboardLoaded || isPublic}
		{@render children()}
	{:else}
		<div style="display: flex; height: 100vh; width: 100vw; align-items: center; justify-content: center; background: #000; color: #fff;">
			<div style="text-align: center;">
				<div style="margin-bottom: 20px; font-size: 24px; font-weight: 600;">Stratum</div>
				<div style="font-size: 14px; opacity: 0.5;">Connecting to Home Assistant...</div>
			</div>
		</div>
	{/if}
</div>
