<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — NavSettings.svelte
	// Navigation position, style, toggles, mobile behaviour.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { NavConfig } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore.nav);

	function set(patch: Partial<NavConfig>) {
		dashboardStore.setNav(patch);
	}
</script>

<div class="ns">

	<!-- Position -->
	<div class="ns__group">
		<span class="s-label">Position</span>
		<div class="ns__pills">
			{#each [['left','Left'],['top','Top'],['bottom','Bottom']] as [val, label]}
				<button
					class="ns__pill"
					class:ns__pill--active={cfg.position === val}
					onclick={() => set({ position: val as NavConfig['position'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Style -->
	<div class="ns__group">
		<span class="s-label">Style</span>
		<div class="ns__pills">
			{#each [['default','Default'],['floating','Floating'],['minimal','Minimal']] as [val, label]}
				<button
					class="ns__pill"
					class:ns__pill--active={cfg.style === val}
					onclick={() => set({ style: val as NavConfig['style'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	{#if cfg.position === 'left'}
		<div class="ns__group">
			<span class="s-label">Integrated rail</span>
			<div class="ns__note">
				Left navigation is now rendered as a fixed split rail inside the dashboard layout.
				Width and collapse controls are disabled for this mode.
			</div>
		</div>
	{/if}

	<!-- Header title -->
	<div class="ns__group">
		<span class="s-label">Header title</span>
		<input
			class="ns__input"
			type="text"
			placeholder="Stratum"
			value={cfg.headerTitle ?? ''}
			oninput={(e) => set({ headerTitle: (e.target as HTMLInputElement).value || undefined })}
		/>
	</div>

	<!-- Toggles -->
	<div class="ns__group">
		<span class="s-label">Options</span>

		{#each [
			['showLabels',           'Show labels',       'Show page names next to icons'],
			['showHeader',           'Show header',       'Show app name / logo in the nav'],
			['showConnectionStatus', 'Connection status', 'Show HA connection indicator'],
		] as [key, label, desc]}
			<div class="ns__toggle-row">
				<div class="ns__toggle-info">
					<span class="ns__toggle-label">{label}</span>
					<span class="ns__toggle-desc">{desc}</span>
				</div>
				<Toggle
					checked={cfg[key as keyof NavConfig] as boolean}
					onchange={(v) => set({ [key]: v })}
					label={label}
				/>
			</div>
		{/each}

	</div>

	<!-- Mobile style -->
	<div class="ns__group">
		<span class="s-label">Mobile navigation</span>
		<div class="ns__pills">
			{#each [['bottom-bar','Bottom bar'],['drawer','Drawer'],['hidden','Hidden']] as [val, label]}
				<button
					class="ns__pill"
					class:ns__pill--active={cfg.mobileStyle === val}
					onclick={() => set({ mobileStyle: val as NavConfig['mobileStyle'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Mobile breakpoint -->
	<div class="ns__group">
		<span class="s-label">Mobile breakpoint (px)</span>
		<input
			class="ns__input ns__input--num"
			type="number"
			min="320"
			max="1280"
			value={cfg.mobileBreakpoint}
			oninput={(e) => set({ mobileBreakpoint: parseInt((e.target as HTMLInputElement).value) || 768 })}
			style="width: 100px"
		/>
	</div>

</div>

<style>
	.ns {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ns__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ns__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.ns__pill {
		padding: 5px 12px;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 500;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.ns__pill:hover { color: var(--fg); border-color: var(--fg-muted); }

	.ns__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ns__input {
		padding: 7px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		box-sizing: border-box;
		width: 100%;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ns__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	.ns__input--num {
		text-align: center;
	}

	.ns__note {
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--hover) 84%, transparent);
		color: var(--fg-subtle);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.ns__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.ns__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ns__toggle-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg);
	}

	.ns__toggle-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}
</style>
