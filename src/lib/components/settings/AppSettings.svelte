<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — AppSettings.svelte
	// Locale, time format, temperature unit.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import type { AppSettings as AppSettingsType } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore.settings);

	function set(patch: Partial<AppSettingsType>) {
		dashboardStore.setSettings(patch);
	}
</script>

<div class="as">

	<!-- Locale -->
	<div class="as__group">
		<span class="s-label">Locale</span>
		<input
			class="as__input"
			type="text"
			placeholder="en"
			value={cfg.locale}
			oninput={(e) => set({ locale: (e.target as HTMLInputElement).value || 'en' })}
		/>
		<span class="as__hint">BCP 47 language tag, e.g. en, de, fr, ar</span>
	</div>

	<!-- Time format -->
	<div class="as__group">
		<span class="s-label">Time format</span>
		<div class="as__pills">
			{#each [['12h','12-hour'],['24h','24-hour']] as [val, label]}
				<button
					class="as__pill"
					class:as__pill--active={cfg.timeFormat === val}
					onclick={() => set({ timeFormat: val as AppSettingsType['timeFormat'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Temperature unit -->
	<div class="as__group">
		<span class="s-label">Temperature unit</span>
		<div class="as__pills">
			{#each [['auto','Auto (HA)'],['c','Celsius'],['f','Fahrenheit']] as [val, label]}
				<button
					class="as__pill"
					class:as__pill--active={cfg.temperatureUnit === val}
					onclick={() => set({ temperatureUnit: val as AppSettingsType['temperatureUnit'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Number format -->
	<div class="as__group">
		<span class="s-label">Number format</span>
		<div class="as__pills">
			{#each [['dot','1,234.56'],['comma','1.234,56']] as [val, label]}
				<button
					class="as__pill"
					class:as__pill--active={cfg.numberFormat === val}
					onclick={() => set({ numberFormat: val as AppSettingsType['numberFormat'] })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- First day of week -->
	<div class="as__group">
		<span class="s-label">First day of week</span>
		<div class="as__pills">
			{#each [[1,'Monday'],[0,'Sunday']] as [val, label]}
				<button
					class="as__pill"
					class:as__pill--active={cfg.firstDayOfWeek === val}
					onclick={() => set({ firstDayOfWeek: val as 0 | 1 })}
				>{label}</button>
			{/each}
		</div>
	</div>

	<!-- Currency -->
	<div class="as__group">
		<span class="s-label">Currency</span>
		<input
			class="as__input"
			type="text"
			placeholder="USD"
			maxlength="3"
			value={cfg.currency}
			oninput={(e) => set({ currency: ((e.target as HTMLInputElement).value || 'USD').toUpperCase() })}
			style="width: 80px; text-transform: uppercase"
		/>
		<span class="as__hint">ISO 4217 code, e.g. USD, EUR, GBP</span>
	</div>

</div>

<style>
	.as {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.as__group {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	.as__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.as__pill {
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

	.as__pill:hover { color: var(--fg); border-color: var(--fg-muted); }

	.as__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.as__input {
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

	.as__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	.as__hint {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.4;
	}
</style>
