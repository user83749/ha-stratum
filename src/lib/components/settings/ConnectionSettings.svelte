<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — ConnectionSettings.svelte
	// ─────────────────────────────────────────────────────────────────────────

	import Icon from '$lib/components/ui/Icon.svelte';
	import { configStore } from '$lib/stores/config';
	import { connectionStatus, disconnect as disconnectHA, pauseReconnect } from '$lib/ha/websocket';
	import { isAddon as isAddonStore } from '$lib/stores/app';

	const isAddon = $derived($isAddonStore);

	// Returns the Ingress path prefix or '' for direct access
	function prefix(): string {
		const m = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
		return m ? m[1] : '';
	}

	// ── State ──────────────────────────────────────────────────────────────

	let url   = $state($configStore.hassUrl);
	let token = $state($configStore.token);
	let testing     = $state(false);
	let testResult  = $state<'idle' | 'success' | 'error'>('idle');
	let testMessage = $state('');

	// Keep local fields in sync when the store changes externally
	$effect(() => {
		if (!testing) {
			url   = $configStore.hassUrl;
			token = $configStore.token;
		}
	});

	const hasCredentials = $derived(
		$configStore.hassUrl.trim().length > 0 && $configStore.token.trim().length > 0
	);

	const isLiveConnected = $derived(
		$connectionStatus === 'connected' || $connectionStatus === 'connecting'
	);

	// ── Handlers ───────────────────────────────────────────────────────────

	async function testConnection() {
		if (!url || !token) {
			testResult  = 'error';
			testMessage = 'Please enter both URL and access token.';
			return;
		}
		testing    = true;
		testResult = 'idle';
		try {
			const res = await fetch(`${prefix()}/api-stratum/ha/test`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ url, token })
			});
			if (res.ok) {
				testResult  = 'success';
				testMessage = 'Connection successful!';
				// Save credentials (also triggers layout $effect → reconnect)
				configStore.set({ hassUrl: url.trim(), token: token.trim() });
			} else {
				const data = await res.json().catch(() => ({}));
				testResult  = 'error';
				testMessage = (data as { message?: string }).message ?? `HTTP ${res.status}`;
			}
		} catch (err) {
			testResult  = 'error';
			testMessage = err instanceof Error ? err.message : 'Connection failed';
		} finally {
			testing = false;
		}
	}

	function saveCredentials() {
		configStore.set({ hassUrl: url.trim(), token: token.trim() });
	}

	function disconnect() {
		// Prevent the auto-reconnect loop (especially in add-on mode) from
		// immediately reconnecting and making this button feel non-functional.
		pauseReconnect(30_000);
		disconnectHA();
		configStore.clear();
		testResult  = 'idle';
		testMessage = '';
	}
</script>

<div class="cs">
	<!-- Addon mode -->
	{#if isAddon}
		{#if isLiveConnected}
			<div class="cs__banner cs__banner--connected">
				<Icon name="circle-check" size={15} />
				<span>Connected to Home Assistant</span>
			</div>
		{:else if $connectionStatus === 'connecting'}
			<div class="cs__banner cs__banner--connecting">
				<span class="cs__spin"><Icon name="loader-circle" size={15} /></span>
				<span>Connecting to Home Assistant…</span>
			</div>
		{:else}
			<div class="cs__banner cs__banner--disconnected">
				<Icon name="wifi-off" size={15} />
				<span>Not connected — retrying automatically</span>
			</div>
		{/if}

		<p class="cs__addon-note">
			In add-on mode, Stratum connects automatically. If auto-connect fails
			(e.g. when accessing remotely via Nabu Casa), enter your HA URL and a
			long-lived token below — this takes priority over the automatic relay.
		</p>
	{:else}
		<!-- Standalone mode banner -->
		{#if isLiveConnected}
			<div class="cs__banner cs__banner--connected">
				<Icon name="circle-check" size={15} />
				<span>Connected to <strong>{$configStore.hassUrl}</strong></span>
			</div>
		{:else if hasCredentials}
			<div class="cs__banner cs__banner--disconnected">
				<Icon name="plug" size={15} />
				<span>Credentials saved — not connected</span>
			</div>
		{:else}
			<div class="cs__banner cs__banner--disconnected">
				<Icon name="wifi-off" size={15} />
				<span>Not connected</span>
			</div>
		{/if}
	{/if}

	<!-- URL + Token entry (shown in both modes) -->
	<div class="cs__group">
		<span class="s-label">{isAddon ? 'Manual override — Home Assistant URL' : 'Home Assistant URL'}</span>
		<input
			class="cs__input"
			type="url"
			placeholder="http://homeassistant.local:8123"
			bind:value={url}
			onchange={saveCredentials}
		/>
		<span class="cs__hint">The base URL of your Home Assistant instance.</span>
	</div>

	<div class="cs__group">
		<span class="s-label">Long-lived access token</span>
		<input
			class="cs__input"
			type="password"
			placeholder="eyJ0eXAiOiJKV1QiLCJhbGci..."
			bind:value={token}
			onchange={saveCredentials}
			autocomplete="off"
		/>
		<span class="cs__hint">
			Create one in HA under Profile → Long-lived access tokens.
			{#if isAddon} When set, this overrides the automatic relay.{/if}
		</span>
	</div>

	<!-- Test result -->
	{#if testResult !== 'idle'}
		<div
			class="cs__result"
			class:cs__result--success={testResult === 'success'}
			class:cs__result--error={testResult === 'error'}
		>
			<Icon name={testResult === 'success' ? 'circle-check' : 'circle-alert'} size={14} />
			{testMessage}
		</div>
	{/if}

	<!-- Actions -->
	<div class="cs__actions">
		<button
			class="cs__btn cs__btn--primary"
			onclick={testConnection}
			disabled={testing}
		>
			{#if testing}
				<span class="cs__spin"><Icon name="loader-circle" size={14} /></span>
				Testing…
			{:else}
				<Icon name="plug" size={14} />
				Test &amp; save
			{/if}
		</button>

		{#if hasCredentials}
			<button class="cs__btn cs__btn--danger" onclick={disconnect}>
				<Icon name="log-out" size={14} />
				Disconnect
			</button>
		{/if}
	</div>
</div>

<style>
	.cs {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	/* ── Banner ────────────────────────────────────────────────────────────── */

	.cs__banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: var(--radius);
		font-size: 0.82rem;
		font-weight: 500;
	}

	.cs__banner--connected {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border: 1px solid color-mix(in srgb, var(--color-on) 25%, transparent);
	}

	.cs__banner--connecting {
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
		color: var(--color-warning);
		border: 1px solid color-mix(in srgb, var(--color-warning) 25%, transparent);
	}

	.cs__banner--disconnected {
		background: color-mix(in srgb, var(--color-off) 12%, transparent);
		color: var(--fg-muted);
		border: 1px solid var(--border);
	}

	/* ── Addon note ────────────────────────────────────────────────────────── */

	.cs__addon-note {
		font-size: 0.8rem;
		color: var(--fg-subtle);
		line-height: 1.5;
		margin: 0;
	}

	/* ── Spinning loader ───────────────────────────────────────────────────── */

	.cs__spin {
		display: inline-flex;
		animation: cs-spin 1s linear infinite;
	}

	@keyframes cs-spin {
		to { transform: rotate(360deg); }
	}

	/* ── Group ─────────────────────────────────────────────────────────────── */

	.cs__group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* ── Label (shared across all settings) ───────────────────────────────── */

	:global(.s-label) {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	/* ── Input ─────────────────────────────────────────────────────────────── */

	.cs__input {
		width: 100%;
		padding: 8px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg);
		font-size: 0.875rem;
		transition:
			border-color var(--transition),
			background-color var(--transition);
		box-sizing: border-box;
	}

	.cs__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	/* ── Hint ──────────────────────────────────────────────────────────────── */

	.cs__hint {
		font-size: 0.75rem;
		color: var(--fg-subtle);
		line-height: 1.4;
	}

	/* ── Test result ───────────────────────────────────────────────────────── */

	.cs__result {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 13px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 500;
	}

	.cs__result--success {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border: 1px solid color-mix(in srgb, var(--color-on) 25%, transparent);
	}

	.cs__result--error {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
	}

	/* ── Actions ───────────────────────────────────────────────────────────── */

	.cs__actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.cs__btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition:
			background-color var(--transition),
			opacity var(--transition);
	}

	.cs__btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.cs__btn--primary {
		background: var(--accent);
		color: var(--accent-fg);
	}

	.cs__btn--primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 85%, var(--fg));
	}

	.cs__btn--danger {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
	}

	.cs__btn--danger:hover {
		background: color-mix(in srgb, var(--color-danger) 20%, transparent);
	}
</style>
