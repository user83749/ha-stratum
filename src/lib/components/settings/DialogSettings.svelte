<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — DialogSettings.svelte
	// More-info style, drawer side, related entities toggle.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { DialogConfig } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore.dialog);

	function set(patch: Partial<DialogConfig>) {
		dashboardStore.setDialog(patch);
	}
</script>

<div class="dgs">

	<!-- More-info style -->
	<div class="dgs__group">
		<span class="s-label">More-info style</span>
		<div class="dgs__pills">
			{#each [
				['modal',  'Modal',        'Centered overlay dialog'],
				['drawer', 'Drawer',       'Side panel drawer'],
				['panel',  'Panel',        'Docked panel'],
			] as [val, label, desc]}
				<button
					class="dgs__style-card"
					class:dgs__style-card--active={cfg.moreInfoStyle === val}
					onclick={() => set({ moreInfoStyle: val as DialogConfig['moreInfoStyle'] })}
				>
					<span class="dgs__style-label">{label}</span>
					<span class="dgs__style-desc">{desc}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Drawer side (only relevant for drawer mode) -->
	{#if cfg.moreInfoStyle === 'drawer'}
		<div class="dgs__group">
			<span class="s-label">Drawer side</span>
			<div class="dgs__pills-row">
				{#each [['left','Left'],['right','Right'],['bottom','Bottom']] as [val, label]}
					<button
						class="dgs__pill"
						class:dgs__pill--active={cfg.drawerSide === val}
						onclick={() => set({ drawerSide: val as DialogConfig['drawerSide'] })}
					>{label}</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Related entities toggle -->
	<div class="dgs__group">
		<span class="s-label">Options</span>
		<div class="dgs__toggle-row">
			<div class="dgs__toggle-info">
				<span class="dgs__toggle-label">Related entities</span>
				<span class="dgs__toggle-desc">
					Show other entities in the same area or device in more-info
				</span>
			</div>
			<Toggle
				checked={cfg.showRelatedEntities}
				onchange={(v) => set({ showRelatedEntities: v })}
				label="Related entities"
			/>
		</div>
	</div>

</div>

<style>
	.dgs {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.dgs__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Style cards */
	.dgs__pills {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.dgs__style-card {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 10px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--transition),
			border-color var(--transition);
	}

	.dgs__style-card:hover {
		border-color: var(--fg-muted);
	}

	.dgs__style-card--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.dgs__style-label {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--fg);
	}

	.dgs__style-card--active .dgs__style-label {
		color: var(--accent);
	}

	.dgs__style-desc {
		font-size: 0.7rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}

	/* Pills row */
	.dgs__pills-row {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.dgs__pill {
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

	.dgs__pill:hover { color: var(--fg); border-color: var(--fg-muted); }

	.dgs__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	/* Toggle row */
	.dgs__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.dgs__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.dgs__toggle-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg);
	}

	.dgs__toggle-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}
</style>
