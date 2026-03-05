<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { connect, connectAddon, connectionStatus, disconnect } from '$lib/ha/websocket';
	import { get } from 'svelte/store';
	import { configStore } from '$lib/stores/config';
	import { isAddon as isAddonStore } from '$lib/stores/app';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { applyTheme, watchSystemScheme } from '$lib/themes/apply';
	import { loadDemoIfActive, isDemoMode } from '$lib/demo/index';

	let { data, children } = $props();

	// ── Boot: init config store and isAddon from server-side data ────────────
	if (browser) {
		configStore.init(untrack(() => data?.config ?? { hassUrl: '', token: '' }));
		isAddonStore.set(untrack(() => data?.isAddon ?? false));
	}

	const isAddon = $derived(data?.isAddon ?? false);

	// ── Theme ─────────────────────────────────────────────────────────────────
	$effect(() => {
		if (!browser) return;
		applyTheme($dashboardStore.theme, $dashboardStore.settings.reducedMotion);
	});

	let stopWatchingScheme: (() => void) | null = null;
	let loadedMode = $state<'demo' | 'live' | null>(null);

	onMount(() => {
		applyTheme($dashboardStore.theme, $dashboardStore.settings.reducedMotion);
		stopWatchingScheme = watchSystemScheme(() => ({
			theme:        $dashboardStore.theme,
			reducedMotion: $dashboardStore.settings.reducedMotion
		}));

		if (!isDemoMode()) {
			dashboardStore.load().then(() => {
				loadedMode = 'live';
				applyTheme($dashboardStore.theme, $dashboardStore.settings.reducedMotion);
			});
		}
	});

	onDestroy(() => {
		stopWatchingScheme?.();
		clearInterval(retryInterval);
	});

	// ── Connection waterfall ──────────────────────────────────────────────────
	//
	//   Priority 1: Manual LLAT — if hassUrl + token set, always use them.
	//               This is the most reliable path and takes precedence over
	//               everything else, including the addon relay.
	//
	//   Priority 2: Addon relay — SUPERVISOR_TOKEN based, no browser token needed.
	//               Used when no manual LLAT is configured.
	//
	//   Priority 3: Nothing configured — wait for user to enter credentials in
	//               Settings → Connection.
	//
	// Reconnect fires: (a) on startup, (b) every 5 s if not connected,
	// (c) immediately when credentials change (via $effect below).

	let isConnecting = false;
	let retryInterval: ReturnType<typeof setInterval>;

	if (browser) {
		doConnect();
		retryInterval = setInterval(() => {
			if ($connectionStatus !== 'connected' && $connectionStatus !== 'connecting') {
				doConnect();
			}
		}, 5000);
	}

	/** Called when credentials change — disconnect first, then reconnect. */
	function onCredentialsChange() {
		if (!browser) return;
		disconnect();
		clearInterval(retryInterval);
		doConnect();
		retryInterval = setInterval(() => {
			if ($connectionStatus !== 'connected' && $connectionStatus !== 'connecting') {
				doConnect();
			}
		}, 5000);
	}

	// Track credential changes. untrack() prevents stale reactive loops.
	$effect(() => {
		if (!browser) return;
		// Read these so Svelte tracks them as dependencies
		const _token   = $configStore.token;
		const _hassUrl = $configStore.hassUrl;
		untrack(() => onCredentialsChange());
	});

	async function doConnect() {
		if (isDemoMode()) {
			if (loadedMode !== 'demo') { loadDemoIfActive(); loadedMode = 'demo'; }
			return;
		}
		if (loadedMode === 'demo') loadedMode = null;
		if (isConnecting) return;
		if ($connectionStatus === 'connected') return;

		isConnecting = true;
		const { hassUrl, token } = $configStore;

		try {
			// ── Priority 1: Manual LLAT — if hassUrl + token set, always use them. ──
			if (hassUrl.trim() && token.trim()) {
				await connect(hassUrl.trim(), token.trim());
				if (get(connectionStatus) === 'connected') { clearInterval(retryInterval); return; }
			}

			// ── Priority 2: Addon relay — SUPERVISOR_TOKEN based, no browser token. ─
			if (isAddon) {
				await connectAddon();
				if (get(connectionStatus) === 'connected') { clearInterval(retryInterval); return; }
			}

			// ── Priority 3: Nothing configured / still failing — wait for user. ────
		} catch (e) {
			console.warn('[Stratum] Connection attempt failed:', e);
		} finally {
			isConnecting = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Stratum</title>
</svelte:head>

<div
	style="font-family: var(--font-family); font-size: var(--font-size); height: 100dvh; width: 100vw; overflow: hidden;"
	class="contents"
>
	{@render children()}
</div>
