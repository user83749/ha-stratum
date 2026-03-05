<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — ResetSettings.svelte
	// Export, import, reset, factory reset.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import { defaultConfig, migrateConfig } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';

	let cfg = $derived($dashboardStore);

	// ── Export ─────────────────────────────────────────────────────────────

	function exportConfig() {
		const json = JSON.stringify(cfg, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `stratum-config-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ── Import ─────────────────────────────────────────────────────────────

	let importError = $state('');
	let importSuccess = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	function triggerImport() {
		fileInput?.click();
	}

	async function handleImport(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;

		importError = '';
		importSuccess = false;

		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const parsed = JSON.parse(reader.result as string);
				await dashboardStore.replace(migrateConfig(parsed));
				importSuccess = true;
				setTimeout(() => (importSuccess = false), 3000);
			} catch {
				importError = 'Invalid JSON file — could not parse configuration.';
			}
		};
		reader.readAsText(file);

		// Reset input so the same file can be imported again
		(e.target as HTMLInputElement).value = '';
	}

	// ── Reset ──────────────────────────────────────────────────────────────

	let resetConfirm = $state(false);

	async function resetToDefaults() {
		if (!resetConfirm) {
			resetConfirm = true;
			setTimeout(() => (resetConfirm = false), 4000);
			return;
		}
		const fresh = defaultConfig();
		// Preserve pages from current config
		fresh.pages = cfg.pages;
		await dashboardStore.replace(fresh);
		resetConfirm = false;
	}

	// ── Factory reset ──────────────────────────────────────────────────────

	let factoryStep = $state(0);

	async function factoryReset() {
		if (factoryStep === 0) {
			factoryStep = 1;
			setTimeout(() => {
				if (factoryStep === 1) factoryStep = 0;
			}, 4000);
			return;
		}
		if (factoryStep === 1) {
			factoryStep = 2;
			setTimeout(() => {
				if (factoryStep === 2) factoryStep = 0;
			}, 4000);
			return;
		}
		await dashboardStore.replace(defaultConfig());
		factoryStep = 0;
	}
</script>

<div class="rs">

	<!-- ── Export / Import ──────────────────────────────────────────────────── -->
	<div class="rs__group">
		<span class="s-label">Configuration backup</span>

		<div class="rs__row">
			<button class="rs__btn rs__btn--secondary" onclick={exportConfig}>
				<Icon name="download" size={14} />
				Export config
			</button>

			<button class="rs__btn rs__btn--secondary" onclick={triggerImport}>
				<Icon name="upload" size={14} />
				Import config
			</button>
			<input
				bind:this={fileInput}
				type="file"
				accept=".json,application/json"
				style="display: none"
				onchange={handleImport}
			/>
		</div>

		{#if importError}
			<div class="rs__feedback rs__feedback--error">
				<Icon name="circle-alert" size={14} />
				{importError}
			</div>
		{/if}

		{#if importSuccess}
			<div class="rs__feedback rs__feedback--success">
				<Icon name="circle-check" size={14} />
				Configuration imported successfully.
			</div>
		{/if}

		<span class="rs__hint">
			Export your current configuration as a JSON file for backup or transfer.
			Importing will replace your current configuration.
		</span>
	</div>

	<!-- ── Danger zone ──────────────────────────────────────────────────────── -->
	<div class="rs__danger-zone">
		<div class="rs__danger-header">
			<Icon name="triangle-alert" size={14} />
			<span>Danger zone</span>
		</div>

		<!-- Reset to defaults -->
		<div class="rs__danger-item">
			<div class="rs__danger-info">
				<span class="rs__danger-title">Reset to defaults</span>
				<span class="rs__danger-desc">
					Resets theme, navigation, and app settings to defaults. Pages are preserved.
				</span>
			</div>
			<button
				class="rs__btn rs__btn--danger"
				class:rs__btn--danger-confirm={resetConfirm}
				onclick={resetToDefaults}
			>
				{#if resetConfirm}
					<Icon name="triangle-alert" size={14} />
					Confirm reset
				{:else}
					<Icon name="rotate-ccw" size={14} />
					Reset
				{/if}
			</button>
		</div>

		<!-- Factory reset -->
		<div class="rs__danger-item">
			<div class="rs__danger-info">
				<span class="rs__danger-title">Factory reset</span>
				<span class="rs__danger-desc">
					Wipes everything — all pages, tiles, and settings. Cannot be undone.
				</span>
			</div>
			<button
				class="rs__btn rs__btn--danger rs__btn--factory"
				class:rs__btn--danger-confirm={factoryStep > 0}
				onclick={factoryReset}
			>
				{#if factoryStep === 0}
					<Icon name="trash-2" size={14} />
					Factory reset
				{:else if factoryStep === 1}
					<Icon name="triangle-alert" size={14} />
					Are you sure?
				{:else}
					<Icon name="octagon-alert" size={14} />
					Last chance — confirm
				{/if}
			</button>
		</div>
	</div>

</div>

<style>
	.rs {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.rs__group {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.rs__row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* ── Buttons ───────────────────────────────────────────────────────────── */

	.rs__btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.rs__btn--secondary {
		background: var(--hover);
		color: var(--fg-muted);
		border: 1px solid var(--border);
	}

	.rs__btn--secondary:hover {
		background: var(--active);
		color: var(--fg);
	}

	.rs__btn--danger {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
	}

	.rs__btn--danger:hover {
		background: color-mix(in srgb, var(--color-danger) 18%, transparent);
	}

	.rs__btn--danger-confirm {
		background: var(--color-danger);
		color: var(--accent-fg);
		border-color: var(--color-danger);
	}

	.rs__btn--danger-confirm:hover {
		background: color-mix(in srgb, var(--color-danger) 85%, #000);
	}

	/* ── Feedback ──────────────────────────────────────────────────────────── */

	.rs__feedback {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.82rem;
		font-weight: 500;
	}

	.rs__feedback--success {
		background: color-mix(in srgb, var(--color-on) 12%, transparent);
		color: var(--color-on);
		border: 1px solid color-mix(in srgb, var(--color-on) 25%, transparent);
	}

	.rs__feedback--error {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
		border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
	}

	/* ── Hint ──────────────────────────────────────────────────────────────── */

	.rs__hint {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.5;
	}

	/* ── Danger zone ───────────────────────────────────────────────────────── */

	.rs__danger-zone {
		border: 1px solid color-mix(in srgb, var(--color-danger) 40%, transparent);
		border-radius: var(--radius);
		overflow: hidden;
	}

	.rs__danger-header {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 14px;
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		color: var(--color-danger);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border-bottom: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
	}

	.rs__danger-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 14px;
		border-bottom: 1px solid color-mix(in srgb, var(--color-danger) 15%, transparent);
	}

	.rs__danger-item:last-child {
		border-bottom: none;
	}

	.rs__danger-info {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.rs__danger-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg);
	}

	.rs__danger-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.4;
	}
</style>
