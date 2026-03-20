<script lang="ts">
	// ── CustomPopupMoreInfo ──────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { formatState, getEntityIcon, getEntityName, getStateColor } from '$lib/ha/entities';
	import { dashboardStore } from '$lib/stores/dashboard';
	import type { Tile, CustomPopupConfig, CustomPopupSectionConfig, CustomPopupSectionEntityConfig } from '$lib/types/dashboard';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		entityId: string;
		tile: Tile | null;
	}
	const { entityId, tile }: Props = $props();

	// ── Viewport State ────────────────────────────────────────────────────────
	let windowWidth = $state(browser ? window.innerWidth : 1280);
	$effect(() => {
		if (!browser) return;
		const onResize = () => {
			windowWidth = window.innerWidth;
		};
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	// ── Config ────────────────────────────────────────────────────────────────
	const navCfg = $derived($dashboardStore.nav);
	const mobileBreakpoint = $derived(navCfg.mobileBreakpoint ?? 800);
	const isMobile = $derived(windowWidth <= mobileBreakpoint);
	const popupCfg = $derived((tile?.config.custom_popup as CustomPopupConfig | undefined) ?? undefined);

	function normalizeSections(rawSections: CustomPopupConfig['sections']): CustomPopupSectionConfig[] {
		const sections = Array.isArray(rawSections) ? rawSections : [];
		return sections
			.slice(0, 3)
			.map((section, sectionIndex) => ({
				id: String(section.id ?? `section-${sectionIndex}`),
				title: String(section.title ?? '').trim() || undefined,
				entities: (Array.isArray(section.entities) ? section.entities : [])
					.map((entry, entryIndex) => ({
						id: String(entry.id ?? `${String(section.id ?? sectionIndex)}-entry-${entryIndex}`),
						entity_id: String(entry.entity_id ?? '').trim(),
						name: String(entry.name ?? '').trim() || undefined,
						icon: String(entry.icon ?? '').trim() || undefined
					}))
					.filter((entry) => entry.entity_id.length > 0)
			}))
				.filter((section) => section.entities.length > 0 || String(section.title ?? '').trim().length > 0);
	}

	const sections = $derived(normalizeSections(popupCfg?.sections));
	const multiSectionDesktop = $derived(!isMobile && sections.length > 1);
	const desktopSectionColumns = $derived.by(() => {
		if (isMobile) return 1;
		return Math.max(1, Math.min(3, sections.length));
	});

	// ── Header ────────────────────────────────────────────────────────────────
	const sourceEntity = $derived($optimisticEntities[entityId] ?? null);
	const configuredHeaderTitle = $derived((popupCfg?.header_title ?? '').trim());
	const headerSubtitle = $derived((popupCfg?.header_subtitle ?? '').trim());
	const configuredHeaderIcon = $derived((popupCfg?.header_icon ?? '').trim());
	const showHeader = $derived(
		configuredHeaderTitle.length > 0 || headerSubtitle.length > 0 || configuredHeaderIcon.length > 0
	);
	const headerTitle = $derived(configuredHeaderTitle);
	const headerIcon = $derived(
		configuredHeaderIcon
			|| ((tile?.config?.icon as string | undefined)?.trim() ?? '')
			|| (sourceEntity ? getEntityIcon(sourceEntity) : 'layout-grid')
	);

	// ── Entity Rendering ──────────────────────────────────────────────────────
	function entryName(entry: CustomPopupSectionEntityConfig): string {
		const override = String(entry.name ?? '').trim();
		if (override) return override;
		const entity = $optimisticEntities[entry.entity_id];
		return entity ? getEntityName(entity) : entry.entity_id;
	}

	function entryIcon(entry: CustomPopupSectionEntityConfig): string {
		const override = String(entry.icon ?? '').trim();
		if (override) return override;
		const entity = $optimisticEntities[entry.entity_id];
		return entity ? getEntityIcon(entity) : 'circle-help';
	}

	function entryState(entry: CustomPopupSectionEntityConfig): string {
		const entity = $optimisticEntities[entry.entity_id];
		if (!entity || entity.state === 'unavailable') return 'Unavailable';
		return formatState(entity);
	}

	function entryColor(entry: CustomPopupSectionEntityConfig): string {
		const entity = $optimisticEntities[entry.entity_id];
		if (!entity || entity.state === 'unavailable') return 'var(--fg-subtle)';
		return getStateColor(entity);
	}
</script>

<div class="cpm">
	<!-- ── Header ───────────────────────────────────────────────────────────── -->
	{#if showHeader}
		<div class="cpm__header">
			<div class="cpm__header-icon">
				<Icon name={headerIcon} entity={sourceEntity} size={22} />
			</div>
			<div class="cpm__header-copy">
				{#if headerTitle}
					<div class="cpm__header-title">{headerTitle}</div>
				{/if}
				{#if headerSubtitle}
					<div class="cpm__header-subtitle">{headerSubtitle}</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── Sections ─────────────────────────────────────────────────────────── -->
	{#if sections.length === 0}
		<div class="cpm__empty">
			<Icon name="layout-grid" size={20} />
			<span>No custom sections configured.</span>
		</div>
	{:else}
		<div
			class="cpm__sections"
			class:cpm__sections--desktop={multiSectionDesktop}
			style={!isMobile ? `--cpm-desktop-columns: ${desktopSectionColumns};` : undefined}
		>
			{#each sections as section, i (section.id)}
				<section class="cpm__section" class:cpm__section--desktop={multiSectionDesktop} class:cpm__section--divided={i > 0}>
					{#if section.title}
						<h3 class="cpm__section-title">{section.title}</h3>
					{/if}
					<div class="cpm__rows">
						{#each section.entities as entry (entry.id)}
							<div class="cpm__row">
								<div class="cpm__row-icon">
									<Icon name={entryIcon(entry)} entity={$optimisticEntities[entry.entity_id] ?? null} size={18} />
								</div>
								<div class="cpm__row-copy">
									<div class="cpm__row-name">{entryName(entry)}</div>
								</div>
								<div class="cpm__row-state" style={`--row-state-color: ${entryColor(entry)};`}>
									{entryState(entry)}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* ── Root ───────────────────────────────────────────────────────────────── */
	.cpm {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.cpm__header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 18px 14px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.cpm__header-icon {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		flex-shrink: 0;
	}
	.cpm__header-copy {
		min-width: 0;
	}
	.cpm__header-title {
		font-size: 0.96rem;
		font-weight: 700;
		color: var(--fg);
		line-height: 1.2;
	}
	.cpm__header-subtitle {
		margin-top: 3px;
		font-size: 0.76rem;
		color: var(--fg-subtle);
	}

	/* ── Empty ──────────────────────────────────────────────────────────────── */
	.cpm__empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--fg-subtle);
		font-size: 0.86rem;
		padding: 24px;
		text-align: center;
	}

	/* ── Sections Layout ────────────────────────────────────────────────────── */
	.cpm {
		--cpm-desktop-spacing: 24px;
		--cpm-divider-inset-mobile: 34px;
		--cpm-divider-inset-desktop: 30px;
	}
	.cpm__sections {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.cpm__sections:not(.cpm__sections--desktop) {
		gap: 10px;
		padding-bottom: 10px;
	}
	.cpm__sections--desktop {
		display: grid;
		grid-template-columns: repeat(var(--cpm-desktop-columns, 2), minmax(0, 1fr));
		padding: 0 0 16px;
	}

	.cpm__section {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 14px 12px;
	}
	.cpm__sections:not(.cpm__sections--desktop) .cpm__section {
		flex: 0 0 auto;
	}
	.cpm__section--desktop {
		padding: 14px var(--cpm-desktop-spacing);
	}
	.cpm__section--divided {
		position: relative;
	}
	.cpm__section--divided::before {
		content: '';
		position: absolute;
		pointer-events: none;
	}
	.cpm__sections:not(.cpm__sections--desktop) .cpm__section--divided::before {
		left: var(--cpm-divider-inset-mobile);
		right: var(--cpm-divider-inset-mobile);
		top: 0;
		height: 1px;
		background: var(--border);
	}
	.cpm__section--desktop.cpm__section--divided {
		border-top: none;
	}
	.cpm__section--desktop.cpm__section--divided::before {
		left: 0;
		top: var(--cpm-divider-inset-desktop);
		bottom: var(--cpm-divider-inset-desktop);
		width: 1px;
		background: var(--border);
	}
	.cpm__section-title {
		margin: 0 0 8px;
		font-size: 0.86rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	/* ── Rows ───────────────────────────────────────────────────────────────── */
	.cpm__rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow-y: auto;
		min-height: 0;
		padding-right: 1px;
	}
	.cpm__row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
		padding: 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.cpm__row-icon {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-muted);
		background: color-mix(in srgb, var(--fg) 8%, transparent);
		flex-shrink: 0;
	}
	.cpm__row-copy {
		min-width: 0;
	}
	.cpm__row-name {
		font-size: 0.84rem;
		font-weight: 650;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cpm__row-state {
		font-size: 0.77rem;
		font-weight: 600;
		color: var(--row-state-color);
		text-align: right;
		white-space: nowrap;
		padding-left: 8px;
	}

	/* ── Mobile ─────────────────────────────────────────────────────────────── */
	@media (max-width: 800px) {
		.cpm__header {
			padding: 14px 14px 12px;
		}
		.cpm__sections:not(.cpm__sections--desktop) {
			gap: 22px;
			padding: 0 18px 16px;
		}
		.cpm__section {
			padding: 16px 16px;
		}
		.cpm__row {
			padding: 9px;
		}
	}
</style>
