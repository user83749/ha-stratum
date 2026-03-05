<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — NavSettings.svelte
	// Navigation style, toggles, mobile behaviour, sidebar entities.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { generateId } from '$lib/utils/uuid';
	import type { NavConfig, NavHeroEntity } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore.nav);

	function set(patch: Partial<NavConfig>) {
		dashboardStore.setNav(patch);
	}

	function addHeroEntity() {
		const next = [...(cfg.heroEntities ?? []), {
			id: generateId(),
			entityId: '',
			label: '',
			showOnDesktop: true,
			showOnMobile: true
		}];
		set({ heroEntities: next });
	}

	function updateHeroEntity(id: string, patch: Partial<NavHeroEntity>) {
		const next = (cfg.heroEntities ?? []).map(h => h.id === id ? { ...h, ...patch } : h);
		set({ heroEntities: next });
	}

	function removeHeroEntity(id: string) {
		set({ heroEntities: (cfg.heroEntities ?? []).filter(h => h.id !== id) });
	}
</script>

<div class="ns">

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
			['showLabels',           'Show labels',           'Show page names next to icons (desktop)'],
			['showLabelsOnMobile',   'Show labels on mobile', 'Show page names in the mobile bottom bar'],
			['showConnectionStatus', 'Connection status',     'Show HA connection indicator'],
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

	<!-- Sidebar entities -->
	<div class="ns__group">
		<div class="ns__group-header">
			<span class="s-label">Sidebar entities</span>
			<button class="ns__add-btn" onclick={addHeroEntity}>
				<Icon name="plus" size={13} strokeWidth={2.5} />
				Add entity
			</button>
		</div>
		<span class="ns__group-hint">Entities shown below the clock in the sidebar and mobile header.</span>

		{#each (cfg.heroEntities ?? []) as hero (hero.id)}
			<div class="ns__hero-card">
				<div class="ns__hero-top">
					<input
						class="ns__input ns__input--flex"
						type="text"
						placeholder="entity_id (e.g. sensor.temp)"
						value={hero.entityId}
						oninput={(e) => updateHeroEntity(hero.id, { entityId: (e.target as HTMLInputElement).value.trim() })}
					/>
					<button class="ns__remove-btn" onclick={() => removeHeroEntity(hero.id)} title="Remove">
						<Icon name="x" size={14} strokeWidth={2.5} />
					</button>
				</div>
				<input
					class="ns__input"
					type="text"
					placeholder="Custom label (optional)"
					value={hero.label ?? ''}
					oninput={(e) => updateHeroEntity(hero.id, { label: (e.target as HTMLInputElement).value || undefined })}
				/>
				<div class="ns__hero-visibility">
					<button
						class="ns__vis-pill"
						class:ns__vis-pill--active={hero.showOnDesktop}
						onclick={() => updateHeroEntity(hero.id, { showOnDesktop: !hero.showOnDesktop })}
					>Desktop</button>
					<button
						class="ns__vis-pill"
						class:ns__vis-pill--active={hero.showOnMobile}
						onclick={() => updateHeroEntity(hero.id, { showOnMobile: !hero.showOnMobile })}
					>Mobile</button>
				</div>
			</div>
		{/each}
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

	.ns__group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ns__group-hint {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
		margin-top: -2px;
	}

	.ns__add-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}

	.ns__add-btn:hover {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ns__hero-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.ns__hero-top {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.ns__input--flex {
		flex: 1;
		width: auto;
	}

	.ns__remove-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition);
	}

	.ns__remove-btn:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
	}

	.ns__hero-visibility {
		display: flex;
		gap: 5px;
	}

	.ns__vis-pill {
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 0.73rem;
		font-weight: 500;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-subtle);
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.ns__vis-pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
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
