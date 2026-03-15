<script lang="ts">
	// ── DialogSettings ────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import type { DialogConfig } from '$lib/types/dashboard';

	// ── Derived State ─────────────────────────────────────────────────────────
	let cfg = $derived($dashboardStore.dialog);

	// ── Actions ───────────────────────────────────────────────────────────────
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
				['panel',  'Panel',        'Docked side panel'],
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

	<!-- Drawer side -->
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
</style>
