<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { connect, connectAddon, connectionStatus, disconnect, reconnectAllowed } from '$lib/ha/websocket';
	import { get } from 'svelte/store';
	import { configStore } from '$lib/stores/config';
	import { isAddon as isAddonStore } from '$lib/stores/app';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { applyTheme, watchSystemScheme } from '$lib/themes/apply';

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
		applyTheme($dashboardStore.theme);
	});

	let stopWatchingScheme: (() => void) | null = null;
	let stopViewportHeightWatch: (() => void) | null = null;

	onMount(() => {
		// Mobile Safari + iframes (HA dashboard/kiosk) can report viewport heights that
		// drift and leave a blank gap. Track the *visual* viewport and expose it as
		// a CSS var used by our root/shell containers.
		// NOTE: visualViewport resize is unreliable inside HA Ingress on iOS when
		// kiosk mode toggles the top bar. We use three complementary triggers:
		//   1. visualViewport resize + scroll
		//   2. window resize
		//   3. ResizeObserver on <html> (catches ingress iframe relays)
		let rafPending = false;
		const applyVh = () => {
			const raw = window.visualViewport?.height ?? window.innerHeight;
			const px = Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
			if (!px) return;
			document.documentElement.style.setProperty('--stratum-vh', `${px}px`);
			// Mobile bottom-sheet target height (MoreInfoShell)
			document.documentElement.style.setProperty('--stratum-sheet-h', `${Math.max(0, Math.round(px * 0.94))}px`);
		};
		const setVh = () => {
			if (rafPending) return;
			rafPending = true;
			requestAnimationFrame(() => {
				rafPending = false;
				applyVh();
			});
		};
		applyVh();
		const vv = window.visualViewport;
		vv?.addEventListener('resize', setVh);
		vv?.addEventListener('scroll', setVh);
		window.addEventListener('resize', setVh);

		// ResizeObserver backup: catches HA ingress iframe viewport changes that
		// don't propagate to visualViewport on iOS Safari.
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== 'undefined') {
			ro = new ResizeObserver(setVh);
			ro.observe(document.documentElement);
		}

		stopViewportHeightWatch = () => {
			vv?.removeEventListener('resize', setVh);
			vv?.removeEventListener('scroll', setVh);
			window.removeEventListener('resize', setVh);
			ro?.disconnect();
		};

		applyTheme($dashboardStore.theme);
		stopWatchingScheme = watchSystemScheme(() => ({
			theme: $dashboardStore.theme
		}));

		dashboardStore.load().then(() => {
			applyTheme($dashboardStore.theme);
		});
	});

	onDestroy(() => {
		stopWatchingScheme?.();
		stopViewportHeightWatch?.();
		if (retryInterval) clearInterval(retryInterval);
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
	let retryInterval: ReturnType<typeof setInterval> | null = null;
	let lastCredentialKey = '';

	function ensureReconnectLoop() {
		if (!browser) return;
		if (retryInterval) return;
		retryInterval = setInterval(() => {
			if (!reconnectAllowed()) return;
			if ($connectionStatus !== 'connected' && $connectionStatus !== 'connecting') {
				void doConnect();
			}
		}, 5000);
	}

	onMount(() => {
		if (!browser) return;
		void doConnect();
		ensureReconnectLoop();
	});

	/** Called when credentials change — disconnect first, then reconnect. */
	function onCredentialsChange() {
		if (!browser) return;
		if (!reconnectAllowed()) return;
		disconnect();
		void doConnect();
		ensureReconnectLoop();
	}

	// Track credential changes. untrack() prevents stale reactive loops.
	$effect(() => {
		if (!browser) return;
		// Read these so Svelte tracks them as dependencies
		const token = $configStore.token;
		const hassUrl = $configStore.hassUrl;
		const credentialKey = `${hassUrl.trim()}::${token.trim()}`;
		if (!lastCredentialKey) {
			lastCredentialKey = credentialKey;
			return;
		}
		if (credentialKey === lastCredentialKey) return;
		lastCredentialKey = credentialKey;
		untrack(() => onCredentialsChange());
	});

	async function doConnect() {
		if (isConnecting) return;
		if ($connectionStatus === 'connected') return;

		isConnecting = true;
		const { hassUrl, token } = $configStore;

		try {
			// ── Priority 1: Manual LLAT — if hassUrl + token set, always use them. ──
			if (hassUrl.trim() && token.trim()) {
				await connect(hassUrl.trim(), token.trim());
				if (get(connectionStatus) === 'connected') return;
			}

			// ── Priority 2: Addon relay — SUPERVISOR_TOKEN based, no browser token. ─
			if (isAddon) {
				await connectAddon();
				if (get(connectionStatus) === 'connected') return;
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
	style="font-family: var(--font-family); font-size: var(--font-size); height: var(--stratum-vh, 100dvh); width: 100vw; overflow: hidden;"
	class="contents"
>
	{@render children()}
</div>
