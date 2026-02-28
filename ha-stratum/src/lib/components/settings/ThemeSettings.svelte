<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { SYSTEM_THEMES, type ThemeDefinition } from '$lib/themes/presets';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import type { RadiusScale } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore.theme);

	const activeId = $derived(cfg.themeId ?? 'onyx');

	function applyTheme(theme: ThemeDefinition) {
		// Set the theme ID — apply.ts resolves the full definition from this
		dashboardStore.setTheme({ themeId: theme.id });
		// Clear per-page wallpapers so the actual theme background is visible.
		// Previous builds stamped theme backgrounds into pages, which overrides
		// the shell-level theme wallpaper and makes theme changes appear ignored.
		for (const page of $dashboardStore.pages) {
			dashboardStore.updatePage(page.id, { background: { type: 'none' } });
		}
	}

	const RADIUS_OPTIONS: { val: RadiusScale; label: string; px: string }[] = [
		{ val: 'none', label: 'None', px: '2px'   },
		{ val: 'sm',   label: 'SM',   px: '4px'   },
		{ val: 'md',   label: 'MD',   px: '8px'   },
		{ val: 'lg',   label: 'LG',   px: '12px'  },
		{ val: 'xl',   label: 'XL',   px: '16px'  },
		{ val: 'full', label: 'pill', px: '999px' }
	];

	const FONTS = ['Inter', 'Plus Jakarta Sans', 'Geist', 'DM Sans'];
</script>

<div class="ts">

	<!-- ══ Six themes ══════════════════════════════════════════════════════════ -->
	<div class="ts__section">
		<header class="ts__head">
			<span class="ts__label">Theme</span>
			<span class="ts__active-name">
				{SYSTEM_THEMES.find(t => t.id === activeId)?.name ?? ''}
			</span>
		</header>

		<div class="ts__grid">
			{#each SYSTEM_THEMES as theme (theme.id)}
				{@const active = theme.id === activeId}
				<button
					class="ts__card"
					class:ts__card--active={active}
					onclick={() => applyTheme(theme)}
					aria-pressed={active}
					title={theme.description}
				>
					<!-- Canvas preview -->
					<div
						class="ts__canvas"
						style="background: {theme.preview.canvas}"
					>
						<!-- Two fake tiles -->
						<div class="ts__fake-tile ts__fake-tile--a"
							style="background: {theme.preview.card}; border-color: {theme.preview.card}">
							<div class="ts__fake-dot" style="background: {theme.preview.accent}"></div>
							<div class="ts__fake-line" style="background: {theme.preview.text}; opacity: 0.5"></div>
							<div class="ts__fake-line ts__fake-line--short" style="background: {theme.preview.text}; opacity: 0.3"></div>
						</div>
						<div class="ts__fake-tile ts__fake-tile--b"
							style="background: {theme.preview.card}">
							<div class="ts__fake-dot ts__fake-dot--lg" style="background: {theme.preview.accent}; opacity: 0.7"></div>
						</div>
					</div>

					<!-- Label -->
					<div class="ts__card-foot">
						<span class="ts__card-name"
							style:color={active ? theme.preview.accent : undefined}>
							{theme.name}
						</span>
						<span class="ts__scheme-badge"
							style="background: {theme.preview.accent}20; color: {theme.preview.accent}">
							{theme.colorScheme}
						</span>
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- ══ Corner radius ═══════════════════════════════════════════════════════ -->
	<div class="ts__section">
		<span class="ts__label">Corner radius</span>
		<div class="ts__radius-row">
			{#each RADIUS_OPTIONS as r (r.val)}
				<button
					class="ts__radius"
					class:ts__radius--active={cfg.radius === r.val}
					onclick={() => dashboardStore.setTheme({ radius: r.val })}
					aria-pressed={cfg.radius === r.val}
				>
					<div class="ts__r-box" style="border-radius: {r.px}"></div>
					<span>{r.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- ══ Font ════════════════════════════════════════════════════════════════ -->
	<div class="ts__section">
		<span class="ts__label">Font</span>
		<div class="ts__fonts">
			{#each FONTS as f (f)}
				<button
					class="ts__font"
					class:ts__font--active={cfg.font?.family === f}
					onclick={() => dashboardStore.setTheme({ font: { ...cfg.font, family: f } })}
					style="font-family: '{f}', system-ui"
					aria-pressed={cfg.font?.family === f}
				>{f}</button>
			{/each}
		</div>
	</div>

	<!-- ══ Options ═════════════════════════════════════════════════════════════ -->
	<div class="ts__section">
		<span class="ts__label">Options</span>
		<div class="ts__toggles">
			<div class="ts__toggle-row">
				<div>
					<div class="ts__tl">Dense tiles</div>
					<div class="ts__td">Compact padding</div>
				</div>
				<Toggle
					checked={cfg.dense ?? false}
					onchange={(v) => dashboardStore.setTheme({ dense: v })}
					label="Dense mode"
				/>
			</div>
			<div class="ts__toggle-row">
				<div>
					<div class="ts__tl">Animations</div>
					<div class="ts__td">Transitions and motion</div>
				</div>
				<Toggle
					checked={cfg.animations ?? true}
					onchange={(v) => dashboardStore.setTheme({ animations: v })}
					label="Animations"
				/>
			</div>
		</div>
	</div>

</div>

<style>
	.ts {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.ts__section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.ts__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ts__label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.09em;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.ts__active-name {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		padding: 2px 9px;
		border-radius: 999px;
	}

	/* ── Theme grid ─────────────────────────────── */

	.ts__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.ts__card {
		display: flex;
		flex-direction: column;
		gap: 7px;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.ts__canvas {
		width: 100%;
		aspect-ratio: 5 / 3;
		border-radius: var(--radius-sm);
		border: 2px solid transparent;
		display: flex;
		align-items: flex-end;
		gap: 5px;
		padding: 8px;
		box-sizing: border-box;
		position: relative;
		overflow: hidden;
		transition: border-color var(--transition), box-shadow var(--transition);
	}

	.ts__card:hover .ts__canvas {
		border-color: var(--fg-subtle);
	}

	.ts__card--active .ts__canvas {
		border-color: var(--accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
	}

	/* Fake tiles inside the canvas preview */
	.ts__fake-tile {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 5px;
		border-radius: 4px;
		border: 1px solid transparent;
		backdrop-filter: blur(4px);
	}

	.ts__fake-tile--a {
		flex: 1.4;
		height: 52%;
	}

	.ts__fake-tile--b {
		flex: 1;
		height: 40%;
		align-items: center;
		justify-content: center;
	}

	.ts__fake-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ts__fake-dot--lg {
		width: 14px;
		height: 14px;
	}

	.ts__fake-line {
		height: 3px;
		border-radius: 2px;
		width: 80%;
	}

	.ts__fake-line--short {
		width: 50%;
	}

	/* Card label row */
	.ts__card-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
	}

	.ts__card-name {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--fg-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color var(--transition);
	}

	.ts__scheme-badge {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 1px 5px;
		border-radius: 999px;
		flex-shrink: 0;
	}

	/* ── Radius ─────────────────────────────────── */

	.ts__radius-row {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.ts__radius {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		font-size: 0.68rem;
		font-weight: 500;
		transition: all var(--transition);
		min-width: 44px;
	}

	.ts__radius:hover { color: var(--fg); border-color: var(--fg-subtle); }

	.ts__radius--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.ts__r-box {
		width: 18px;
		height: 18px;
		background: currentColor;
		opacity: 0.55;
	}

	/* ── Font ───────────────────────────────────── */

	.ts__fonts {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ts__font {
		padding: 9px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		text-align: left;
		transition: all var(--transition);
	}

	.ts__font:hover { color: var(--fg); border-color: var(--fg-subtle); }

	.ts__font--active {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 38%, transparent);
		font-weight: 600;
	}

	/* ── Options / toggles ──────────────────────── */

	.ts__toggles {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ts__toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--surface) 60%, transparent);
		border: 1px solid var(--border);
	}

	.ts__tl {
		font-size: 0.84rem;
		font-weight: 500;
		color: var(--fg);
	}

	.ts__td {
		font-size: 0.7rem;
		color: var(--fg-subtle);
		line-height: 1.3;
		margin-top: 2px;
	}
</style>
