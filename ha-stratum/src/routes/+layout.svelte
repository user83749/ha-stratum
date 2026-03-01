<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { connect, connectionStatus } from '$lib/ha/websocket';
	import { get } from 'svelte/store';
	import { configStore } from '$lib/stores/config';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { applyTheme, watchSystemScheme } from '$lib/themes/apply';
	import { loadDemoIfActive, isDemoMode } from '$lib/demo/index';

	let { children } = $props();

	let connecting = false;
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

		stopWatchingScheme = watchSystemScheme(() => ({
			theme: $dashboardStore.theme,
			reducedMotion: $dashboardStore.settings.reducedMotion
		}));

		if (!isDemoMode()) {
			dashboardStore.load().then(() => {
				loadedMode = 'live';
				applyTheme(get(dashboardStore).theme, get(dashboardStore).settings.reducedMotion);
			});
		}
	});

	onDestroy(() => {
		stopWatchingScheme?.();
	});

	// ── Add-on ingress auto-connect ──────────────────────────────────────────
	// When running as an HA add-on via ingress, HA handles auth at the proxy
	// level. We detect this and use the ingress path as the WebSocket URL so
	// the user never has to manually enter a URL or token.
	let addonAuthAttempted = false;
	async function tryAddonAutoConnect(): Promise<boolean> {
		if (!browser) return false;
		try {
			// USES RELATIVE PATH to stay inside Ingress tunnel
			const res = await fetch(`${base}/api-stratum/ha/info`);
			if (!res.ok) return false;
			const info = await res.json();
			if (!info.addon) return false;

			// In ingress mode the browser talks to HA through the same origin.
			// The ingress path is already the HA base URL from the browser's
			// perspective so we use window.location.origin.
			const hassUrl = window.location.origin;

			// Fetch a long-lived token using the ingress auth endpoint.
			// HA injects a one-time token we can exchange for a bearer token.
			// Note: This path is specifically for the Ingress session validator.
			const tokenRes = await fetch(`${base}/api/hassio_ingress/validate_session`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			// If session validation works, use the ingress connection directly.
			// Otherwise fall back to connecting via the origin with no token —
			// HA's ingress proxy automatically attaches the auth headers.
			const token = tokenRes.ok
				? ((await tokenRes.json()) as { token?: string }).token ?? ''
				: '';

			if (!token) return false;

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
		if (isDemoMode()) {
			if (loadedMode !== 'demo') {
				loadDemoIfActive();
				loadedMode = 'demo';
			}
			return;
		}

		if (loadedMode === 'demo') {
			loadedMode = null;
		}

		const hasCreds = $configStore.hassUrl.trim().length > 0 && $configStore.token.trim().length > 0;

		if (!hasCreds && !addonAuthAttempted) {
			addonAuthAttempted = true;
			await tryAddonAutoConnect();
		}

		if (hasCreds && ($connectionStatus === 'error' || $connectionStatus === 'disconnected') && !connecting) {
			connecting = true;
			try {
				const { hassUrl, token } = $configStore;
				await connect(hassUrl, token);
			} catch (e) {
				console.error('[stratum] Connection failed in syncAppState', e);
			} finally {
				connecting = false;
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Stratum</title>
</svelte:head>

<div
	style="font-family: var(--font-family); font-size: var(--font-size); height: 100vh; width: 100vw; overflow: hidden;"
	class="contents"
>
	{@render children()}
</div>
