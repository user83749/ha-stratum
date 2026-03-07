<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — DisplaySettings.svelte
	// Default page, animation options, theme schedule.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { ThemeScheduleMode } from '$lib/types/dashboard';
	import { THEME_PRESETS } from '$lib/themes/presets';

	let cfg      = $derived($dashboardStore);
	let display  = $derived(cfg.display);
	let theme    = $derived(cfg.theme);
	let pages    = $derived(cfg.pages);
	let schedule = $derived(display.themeSchedule);
</script>

<div class="ds">

	<!-- Default page -->
	<div class="ds__group">
		<span class="s-label">Default page</span>
		<select
			class="ds__select"
			value={display.defaultPageId ?? ''}
			onchange={(e) => dashboardStore.setDisplay({
				defaultPageId: (e.target as HTMLSelectElement).value || undefined
			})}
		>
			<option value="">First page</option>
			{#each pages as page}
				<option value={page.id}>{page.name}</option>
			{/each}
		</select>
	</div>

	<!-- Toggles -->
	<div class="ds__group">
		<span class="s-label">Options</span>

		<div class="ds__toggle-row">
			<div class="ds__toggle-info">
				<span class="ds__toggle-label">Swipe navigation</span>
				<span class="ds__toggle-desc">Horizontal swipe gestures to change pages</span>
			</div>
			<Toggle
				checked={display.swipeNavigation}
				onchange={(v) => dashboardStore.setDisplay({ swipeNavigation: v })}
				label="Swipe navigation"
			/>
		</div>

		<div class="ds__toggle-row">
			<div class="ds__toggle-info">
				<span class="ds__toggle-label">Animations</span>
				<span class="ds__toggle-desc">Enable UI transition animations</span>
			</div>
			<Toggle
				checked={theme.animations ?? true}
				onchange={(v) => dashboardStore.setTheme({ animations: v })}
				label="Animations"
			/>
		</div>

		<div class="ds__toggle-row">
			<div class="ds__toggle-info">
				<span class="ds__toggle-label">Reduced motion</span>
				<span class="ds__toggle-desc">Minimize motion for accessibility</span>
			</div>
			<Toggle
				checked={cfg.settings.reducedMotion}
				onchange={(v) => dashboardStore.setSettings({ reducedMotion: v })}
				label="Reduced motion"
			/>
		</div>

	</div>

	<!-- Theme schedule -->
	<div class="ds__group">
		<div class="ds__group-header">
			<span class="s-label">Theme Schedule</span>
			<Toggle
				checked={schedule.enabled}
				onchange={(v) => dashboardStore.setThemeSchedule({ enabled: v })}
				label="Enable theme schedule"
			/>
		</div>

		{#if schedule.enabled}
			<!-- Mode -->
			<div class="ds__pills">
				{#each [['sun','Based on sun position'],['time','Based on clock time']] as [val, label]}
					<button
						class="ds__pill"
						class:ds__pill--active={schedule.mode === val}
						onclick={() => dashboardStore.setThemeSchedule({ mode: val as ThemeScheduleMode })}
					>{label}</button>
				{/each}
			</div>

			{#if schedule.mode === 'time'}
				<div class="ds__row">
					<div class="ds__field">
						<label class="ds__field-label" for="sched-day-start">Day starts at</label>
						<input
							id="sched-day-start"
							class="ds__input"
							type="time"
							value={schedule.dayStart ?? '07:00'}
							onchange={(e) => dashboardStore.setThemeSchedule({ dayStart: (e.target as HTMLInputElement).value })}
						/>
					</div>
					<div class="ds__field">
						<label class="ds__field-label" for="sched-night-start">Night starts at</label>
						<input
							id="sched-night-start"
							class="ds__input"
							type="time"
							value={schedule.nightStart ?? '20:00'}
							onchange={(e) => dashboardStore.setThemeSchedule({ nightStart: (e.target as HTMLInputElement).value })}
						/>
					</div>
				</div>
			{:else}
				<div class="ds__field">
					<label class="ds__field-label" for="sched-sun">Sun entity</label>
					<input
						id="sched-sun"
						class="ds__input"
						type="text"
						value={schedule.sunEntityId}
						oninput={(e) => dashboardStore.setThemeSchedule({ sunEntityId: (e.target as HTMLInputElement).value })}
					/>
				</div>
				<div class="ds__row">
					<div class="ds__field">
						<label class="ds__field-label" for="sched-day-offset">Day offset (min after sunrise)</label>
						<input
							id="sched-day-offset"
							class="ds__input ds__input--num"
							type="number"
							value={schedule.dayOffset}
							oninput={(e) => dashboardStore.setThemeSchedule({ dayOffset: parseInt((e.target as HTMLInputElement).value) || 0 })}
						/>
					</div>
					<div class="ds__field">
						<label class="ds__field-label" for="sched-night-offset">Night offset (min after sunset)</label>
						<input
							id="sched-night-offset"
							class="ds__input ds__input--num"
							type="number"
							value={schedule.nightOffset}
							oninput={(e) => dashboardStore.setThemeSchedule({ nightOffset: parseInt((e.target as HTMLInputElement).value) || 0 })}
						/>
					</div>
				</div>
			{/if}

			<!-- Preset pickers -->
			<div class="ds__row">
				<div class="ds__field ds__field--grow">
					<label class="ds__field-label" for="sched-day-preset">Day theme</label>
					<select
						id="sched-day-preset"
						class="ds__select"
						value={schedule.dayPresetId}
						onchange={(e) => dashboardStore.setThemeSchedule({ dayPresetId: (e.target as HTMLSelectElement).value })}
					>
						{#each THEME_PRESETS as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
				<div class="ds__field ds__field--grow">
					<label class="ds__field-label" for="sched-night-preset">Night theme</label>
					<select
						id="sched-night-preset"
						class="ds__select"
						value={schedule.nightPresetId}
						onchange={(e) => dashboardStore.setThemeSchedule({ nightPresetId: (e.target as HTMLSelectElement).value })}
					>
						{#each THEME_PRESETS as p}
							<option value={p.id}>{p.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}
	</div>

</div>

<style>
	.ds {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ds__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ds__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.ds__pill {
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

	.ds__pill:hover { color: var(--fg); border-color: var(--fg-muted); }

	.ds__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.ds__select {
		padding: 7px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		cursor: pointer;
		box-sizing: border-box;
		width: 100%;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ds__select:focus {
		border-color: var(--accent);
		outline: none;
	}

	.ds__input {
		padding: 7px 11px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		box-sizing: border-box;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ds__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	.ds__input--num {
		text-align: center;
	}

	.ds__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
	}

	.ds__toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.ds__toggle-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--fg);
	}

	.ds__toggle-desc {
		font-size: 0.73rem;
		color: var(--fg-subtle);
		line-height: 1.3;
	}

	.ds__group-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.ds__row {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.ds__field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ds__field--grow { flex: 1; min-width: 120px; }

	.ds__field-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--fg-muted);
	}
</style>
