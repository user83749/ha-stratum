<script lang="ts">
	// ── PageView ───────────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { activePageId, currentBreakpoint, uiStore } from '$lib/stores/ui';
	import { isEditing, editMode } from '$lib/stores/editMode';
	import { clockNow } from '$lib/stores/clock';
	import SectionList from './SectionList.svelte';
	import IntegratedNavRail from './IntegratedNavRail.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Page, PageTransitionType } from '$lib/types/dashboard';
	import { formatState } from '$lib/ha/entities';
	import { entities } from '$lib/ha/websocket';
	import { SYSTEM_THEMES } from '$lib/themes/presets';
	import { fade, fly, scale as scaleTransition } from 'svelte/transition';

	// ── Props ──────────────────────────────────────────────────────────────────

	interface Props {
		showIntegratedNav?: boolean;
		showMobileClock?: boolean;
		onEditSection?: (pageId: string, sectionId: string) => void;
		onEditPage?: (pageId: string) => void;
		onAddTile?: (pageId: string, sectionId: string, activeColumns?: number) => void;
		onAddSection?: (pageId: string) => void;
	}

	const {
		showIntegratedNav = false,
		showMobileClock = false,
		onEditSection,
		onEditPage,
		onAddTile,
		onAddSection
	}: Props = $props();

	// ── Derived ────────────────────────────────────────────────────────────────

	const cfg   = $derived($dashboardStore);
	const pages = $derived(cfg.pages);

	const currentPageId = $derived($activePageId);
	const breakpoint    = $derived($currentBreakpoint);
	const editing       = $derived($isEditing);

	const activePage = $derived(
		pages.find((p) => p.id === currentPageId) ?? pages[0] ?? null
	);

	function effectivePinMode(section: Page['sections'][number]): 'top' | 'none' | 'bottom' {
		if (section.layoutMode !== 'horizontal_chip_row') return 'none';
		return section.pinMode === 'top' || section.pinMode === 'bottom' ? section.pinMode : 'none';
	}

	const visibleSections = $derived.by(() => {
		if (!activePage) return [];
		const visible = activePage.sections.filter((section) => section.visibility[breakpoint]);
		const top = visible.filter((section) => effectivePinMode(section) === 'top');
		const middle = visible.filter((section) => effectivePinMode(section) === 'none');
		const bottom = visible.filter((section) => effectivePinMode(section) === 'bottom');
		return [...top, ...middle, ...bottom];
	});
	const currentPageTransition = $derived.by(() => ({
		type: activePage?.transition ?? cfg.display.pageTransition.type,
		duration: Math.max(0, cfg.display.pageTransition.duration)
	}));

	function pageTransition(
		node: Element,
		params: { type: PageTransitionType; duration: number }
	) {
		switch (params.type) {
			case 'slide':
				return fly(node, { x: 28, duration: params.duration, opacity: 0.18 });
			case 'scale':
				return scaleTransition(node, { duration: params.duration, start: 0.985, opacity: 0.2 });
			case 'none':
				return { duration: 0 };
			case 'fade':
			default:
				return fade(node, { duration: params.duration });
		}
	}

	function isThemeStampedBackground(page: Page): boolean {
		const bg = page.background;
		if (!bg || bg.type === 'none') return false;

		return SYSTEM_THEMES.some((theme) => {
			const themeBg = theme.defaultBackground;
			return (
				themeBg.type === bg.type &&
				(themeBg.value ?? '') === (bg.value ?? '') &&
				(themeBg.opacity ?? 1) === (bg.opacity ?? 1)
			);
		});
	}

	// ── Background Style Builder ───────────────────────────────────────────────
	function buildBgStyle(page: Page): string {
		const bg = page.background;
		if (!bg || bg.type === 'none' || isThemeStampedBackground(page)) return '';

		const parts: string[] = [];

		if (bg.opacity !== undefined && bg.opacity < 1) {
			parts.push(`opacity: ${bg.opacity}`);
		}

		switch (bg.type) {
			case 'color':
			case 'solid':
				if (bg.value) parts.push(`background-color: ${bg.value}`);
				break;
			case 'gradient':
				if (bg.value) parts.push(`background: ${bg.value}`);
				break;
			case 'image':
				if (bg.value) {
					parts.push(`background-image: url('${bg.value}')`);
					parts.push('background-size: cover');
					parts.push('background-position: center');
					if (bg.parallax) parts.push('background-attachment: fixed');
				}
				break;
		}

		if (bg.blur) parts.push(`filter: blur(${bg.blur}px)`);

		return parts.join('; ');
	}

	// ── Edit Mode Helpers ──────────────────────────────────────────────────────

	function handleAddSection() {
		if (!activePage) return;
		if (onAddSection) onAddSection(activePage.id);
	}

	function handleEditPage() {
		if (!activePage) return;
		if (onEditPage) {
			onEditPage(activePage.id);
		} else {
			editMode.openPageEditor(activePage.id);
		}
	}

	// ── Section drag-to-reorder ────────────────────────────────────────────────

	let sectionDragId   = $state<string | null>(null); // Section being dragged.
	let sectionDragPin  = $state<'top' | 'none' | 'bottom' | null>(null);
	let sectionDropIdx  = $state<number>(-1); // Nearest visible-section index for highlight.

	function canParticipateInSectionDrag(
		dragged: Page['sections'][number] | undefined,
		candidate: Page['sections'][number] | undefined
	): boolean {
		if (!dragged || !candidate) return false;
		// Horizontal Chip row position is controlled only by Pin Position, not drag.
		if (dragged.layoutMode !== 'grid' || candidate.layoutMode !== 'grid') return false;
		return effectivePinMode(candidate) === sectionDragPin;
	}

	function startSectionDrag(ev: PointerEvent, sectionId: string) {
		if (!editing) return;
		ev.stopPropagation();
		(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
		const dragged = visibleSections.find((s) => s.id === sectionId);
		sectionDragPin = dragged ? effectivePinMode(dragged) : 'none';
		sectionDragId  = sectionId;
		sectionDropIdx = visibleSections.findIndex(s => s.id === sectionId);
	}

	function moveSectionDrag(ev: PointerEvent, gridEl: HTMLElement) {
		if (!sectionDragId) return;
		ev.preventDefault();
		// Find the section element nearest to the pointer
		const children = Array.from(gridEl.children) as HTMLElement[];
		let nearest = sectionDropIdx;
		let minDist = Infinity;
		const dragged = visibleSections.find((s) => s.id === sectionDragId);
		children.forEach((el, i) => {
			const section = visibleSections[i];
			if (!canParticipateInSectionDrag(dragged, section)) return;
			const rect = el.getBoundingClientRect();
			const midX = rect.left + rect.width  / 2;
			const midY = rect.top  + rect.height / 2;
			const dist = Math.hypot(ev.clientX - midX, ev.clientY - midY);
			if (dist < minDist) { minDist = dist; nearest = i; }
		});
		sectionDropIdx = nearest;
	}

	function endSectionDrag() {
		if (!sectionDragId || !activePage) {
			sectionDragId = null;
			sectionDragPin = null;
			sectionDropIdx = -1;
			return;
		}
		const dragged = visibleSections.find((s) => s.id === sectionDragId);
		if (!dragged || dragged.layoutMode !== 'grid') {
			sectionDragId  = null;
			sectionDragPin = null;
			sectionDropIdx = -1;
			return;
		}

		const target = sectionDropIdx >= 0 ? visibleSections[sectionDropIdx] : undefined;
		const draggableGroup = visibleSections
			.filter((s) => canParticipateInSectionDrag(dragged, s))
			.map((s) => s.id);
		const fromIdx = draggableGroup.indexOf(sectionDragId);
		const toIdx = target ? draggableGroup.indexOf(target.id) : -1;
		if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
			const reorderedGroup = [...draggableGroup];
			reorderedGroup.splice(fromIdx, 1);
			reorderedGroup.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, sectionDragId);

			// Rebuild visible order: replace only draggable grid slots.
			const visibleIds = visibleSections.map((s) => s.id);
			let groupCursor = 0;
			const reorderedVisible = visibleIds.map((id) =>
				draggableGroup.includes(id) ? reorderedGroup[groupCursor++] : id
			);

			// Merge with invisible sections (preserved at original positions).
			const allIds = activePage.sections.map((s) => s.id);
			const visibleSet = new Set(reorderedVisible);
			const merged: string[] = [];
			let visIdx = 0;
			for (const id of allIds) {
				if (visibleSet.has(id)) merged.push(reorderedVisible[visIdx++]);
				else merged.push(id);
			}
			dashboardStore.reorderSections(activePage.id, merged);
		}

		sectionDragId  = null;
		sectionDragPin = null;
		sectionDropIdx = -1;
	}


	// ── Clock ─────────────────────────────────────────────────────────────────
	const clockDisplay = $derived.by(() => {
		const now = new Date($clockNow);
		const locale = cfg.settings.locale || undefined;
		const hour12 = cfg.settings.timeFormat === '12h';
		const time = now
			.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12 })
			.replace(/\s?[AP]M/i, '');
		const date = now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
		return { time, date };
	});

	// ── Weather Entity Cache ───────────────────────────────────────────────────
	let discoveredWeatherEntityId = $state('');

	$effect(() => {
		const configured = String(cfg.weather?.entityId ?? '').trim();
		if (configured) {
			discoveredWeatherEntityId = configured;
			return;
		}

		if ($entities['weather.forecast_home']) {
			discoveredWeatherEntityId = 'weather.forecast_home';
			return;
		}

		if (discoveredWeatherEntityId && $entities[discoveredWeatherEntityId]) return;

		const discovered = Object.keys($entities).find((id) => id.startsWith('weather.')) ?? '';
		if (discovered) discoveredWeatherEntityId = discovered;
	});

	const weatherEntityId = $derived.by(() => {
		const configured = cfg.weather?.entityId as string | undefined;
		if (configured) return configured;
		return $entities['weather.forecast_home']
			? 'weather.forecast_home'
			: discoveredWeatherEntityId;
	});

	const weatherEntity = $derived(
		weatherEntityId ? ($entities[weatherEntityId] ?? null) : null
	);
	const weatherStr = $derived.by(() => {
		if (!weatherEntity || weatherEntity.state === 'unknown' || weatherEntity.state === 'unavailable') return null;
		const feelsLike = weatherEntity.attributes?.apparent_temperature ?? weatherEntity.attributes?.temperature;
		const temp = Math.round(Number(feelsLike || 0));
		const unit = (weatherEntity.attributes?.temperature_unit as string | undefined) ?? '°';
		const condition = formatState(weatherEntity);
		return `Feels like ${temp}${unit} — ${condition}`;
	});

	const mobileHeroEntities = $derived(
		($dashboardStore.nav.heroEntities ?? []).filter(h => h.showOnMobile)
	);

</script>

<!-- ── Page Content ───────────────────────────────────────────────────────────── -->
{#if activePage}
	{#key activePage.id}
		<div
			class="page-frame"
			in:pageTransition={currentPageTransition}
			out:pageTransition={currentPageTransition}
		>
			<!-- ── Page Background Layer ───────────────────────────────────────── -->
			{#if activePage.background.type !== 'none' && !isThemeStampedBackground(activePage)}
				<div class="page-bg" style={buildBgStyle(activePage)} aria-hidden="true">
					{#if activePage.background.type === 'video' && activePage.background.value}
						<video
							class="page-bg__video"
							src={activePage.background.value}
							autoplay
							muted
							loop
							playsinline
						></video>
					{/if}
				</div>
			{/if}

			<!-- ── default / full layout ──────────────────────────────────────── -->
			{#if activePage.layout === 'default' || activePage.layout === 'full'}
				<div class="page-stage">
					<div
						class="page-view"
						class:page-view--full={activePage.layout === 'full'}
						class:page-view--with-nav={showIntegratedNav}
					>
						{#if showIntegratedNav}
							<!-- ── Desktop: Sidebar Rail + Content ───────────────────────────── -->
							<div class="page-view__dashboard">
								<div class="page-view__nav-panel">
									<IntegratedNavRail />
								</div>
								<div class="page-view__content">
									{#if !editing}
										<div class="page-view__actions">
											<button class="page-view__btn" onclick={() => uiStore.toggleNotifications()} title="Notifications">
												<Icon name="bell" size={18} />
											</button>
											<button class="page-view__btn" onclick={() => editMode.toggle()} title="Edit dashboard">
												<Icon name="pencil" size={18} />
											</button>
											<button class="page-view__btn" onclick={() => uiStore.openSettings()} title="Settings">
												<Icon name="settings" size={18} />
											</button>
										</div>
									{/if}

									<!-- ── Sections ───────────────────────────────────────────────────────────── -->
									<SectionList
										sections={visibleSections}
										pageId={activePage.id}
										{sectionDragId}
										{sectionDropIdx}
										onEditSection={onEditSection ?? null}
										onAddTile={onAddTile ?? null}
										onSectionDragStart={editing ? startSectionDrag : null}
										onSectionDragMove={moveSectionDrag}
										onSectionDragEnd={endSectionDrag}
									/>

									{#if editing}
										<div class="page-edit-bar">
											<button class="page-add-section" onclick={handleAddSection}>
												<Icon name="plus" size={15} strokeWidth={2} />
												Add Section
											</button>
											<button class="page-edit-btn" onclick={handleEditPage}>
												<Icon name="file-pen" size={14} strokeWidth={1.75} />
												Page settings
											</button>
										</div>
									{/if}
								</div>
							</div>
						{:else}
							<!-- ── Mobile: No Nav Rail ────────────────────────────────────────── -->
							<div
								class="mobile-page-clock"
								class:mobile-page-clock--clock-hidden={!showMobileClock}
								aria-live="off"
							>
								{#if showMobileClock}
									<span class="mobile-page-clock__time">{clockDisplay.time}</span>
								{/if}
								<div class="mobile-page-clock__sub">
									<span class="mobile-page-clock__date">{clockDisplay.date}</span>
									{#if weatherStr}
										<span class="mobile-page-clock__weather">{weatherStr}</span>
									{/if}
								</div>
								{#each mobileHeroEntities as hero (hero.id)}
									{@const ent = $entities[hero.entityId]}
									{@const state = ent?.state ?? '—'}
									{@const unit = ent?.attributes?.unit_of_measurement ?? ''}
									{@const label = hero.label || ent?.attributes?.friendly_name || hero.entityId}
									<div class="mobile-page-clock__hero">
										<span class="mobile-page-clock__hero-label">{label}</span>
										<span class="mobile-page-clock__hero-value">{state}{unit}</span>
									</div>
								{/each}
							</div>

							<!-- ── Sections ───────────────────────────────────────────────────────────── -->
							<SectionList
								sections={visibleSections}
								pageId={activePage.id}
								{sectionDragId}
								{sectionDropIdx}
								onEditSection={onEditSection ?? null}
								onAddTile={onAddTile ?? null}
								onSectionDragStart={editing ? startSectionDrag : null}
								onSectionDragMove={moveSectionDrag}
								onSectionDragEnd={endSectionDrag}
							/>

							{#if editing}
								<div class="page-edit-bar">
									<button class="page-add-section" onclick={handleAddSection}>
										<Icon name="plus" size={15} strokeWidth={2} />
										Add Section
									</button>
									<button class="page-edit-btn" onclick={handleEditPage}>
										<Icon name="file-pen" size={14} strokeWidth={1.75} />
										Page settings
									</button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/key}
{:else}
	<!-- ── Empty Page State ───────────────────────────────────────────────────── -->
	<div class="page-empty">
		{#if editing}
			<button class="page-add-first" onclick={handleAddSection}>
				<Icon name="circle-plus" size={24} strokeWidth={1.5} />
				Add your first section
			</button>
		{:else}
			<p>No pages configured.</p>
		{/if}
	</div>
{/if}

<style>
	.page-frame {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	/* ── Background Layer ────────────────────────────────────────────────────── */
	.page-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}

	.page-bg__video {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* ── Default / Full Layout ──────────────────────────────────────────────── */
	.page-stage {
		position: relative;
		width: 100%;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		-webkit-overflow-scrolling: touch;
		overscroll-behavior: contain;
		display: flex;
		flex-direction: column;
		background: transparent;
	}

	.page-view {
		position: relative;
		z-index: 1;
		width: 100%;
		flex: 1;
		min-height: 100%;
		padding: var(--custom-layout-card-padding);
		display: flex;
		flex-direction: column;
		gap: 1.5vw;
	}

	.page-view--with-nav {
		padding: 0;
		gap: 0;
	}

	.page-view--full {
		padding: 0;
		gap: 0;
	}

	.page-view__dashboard {
		flex: 1 0 auto;
		--rail-width: clamp(244px, calc(104px + 17vw), 360px);
		--rail-body-size: clamp(15px, 1.6vw, 20px);
		--rail-body-line: clamp(20px, 2.2vw, 28px);
		--rail-time-size: clamp(54px, 5.9vw, 92px);
		--rail-time-line: clamp(42px, 4.7vw, 72px);
		--rail-date-size: clamp(18px, 1.75vw, 24px);
		--rail-weather-size: clamp(16px, 1.5vw, 21px);
		--rail-nav-size: clamp(18px, 1.7vw, 24px);
		--rail-icon-size: clamp(16px, 1.7vw, 22px);
		--rail-link-gap: clamp(8px, 0.6vw, 12px);
		--rail-link-pad-y: clamp(7px, 0.5vw, 10px);
		--rail-list-gap: clamp(1px, 0.12vw, 3px);
		--rail-hero-gap: clamp(10px, 0.55vw, 14px);
		--rail-hero-top: 0;
		--rail-hero-bottom: clamp(26px, 1.8vw, 40px);
		--rail-weather-top: 3px;
		--rail-nav-top: clamp(12px, 0.9vw, 18px);
		--rail-pad-top: 3.3vw;
		--rail-pad-left: clamp(38px, 2.4vw, 54px);
		--rail-pad-bottom: clamp(18px, 1.2vw, 24px);
		--rail-active-offset: 6px;
		--rail-active-height: clamp(11px, 0.85vw, 15px);
		--rail-badge-size: clamp(6px, 0.45vw, 8px);
		position: relative;
		display: grid;
		grid-template-columns: var(--rail-width) minmax(0, 1fr);
		align-items: stretch;
		gap: 0;
		width: 100%;
		min-height: 100%;
	}

	.page-view__dashboard::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: var(--rail-width);
		pointer-events: none;
		background:
			linear-gradient(
				90deg,
				color-mix(in srgb, black 9%, transparent) 0%,
				color-mix(in srgb, black 5%, transparent) 58%,
				color-mix(in srgb, black 2%, transparent) 82%,
				transparent 100%
			);
	}

	.page-view__dashboard::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--rail-width) - 1px);
		width: 8px;
		pointer-events: none;
		border-left: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
		box-sizing: border-box;
		background:
			linear-gradient(
				90deg,
				color-mix(in srgb, black 10%, transparent) 0%,
				color-mix(in srgb, black 4%, transparent) 36%,
				color-mix(in srgb, var(--bg) 2%, transparent) 68%,
				transparent 100%
			);
	}

	.page-view__nav-panel {
		position: sticky;
		top: 0;
		align-self: start;
		width: var(--rail-width);
		min-height: 100%;
		padding: 0 12px 16px 0;
		background: transparent;
		overflow: visible;
	}

	.page-view__content {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.5vw;
		min-width: 0;
		padding: 3.3vw;
	}

	.page-view__actions {
		position: absolute;
		top: var(--custom-layout-card-padding);
		right: var(--custom-layout-card-padding);
		display: flex;
		align-items: center;
		gap: 4px;
		z-index: 50;
	}

	.page-view__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius);
		border: none;
		background: transparent;
		color: var(--fg-muted);
		opacity: 0.35;
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition), opacity var(--transition);
	}
	.page-view__btn:hover {
		background-color: var(--hover);
		color: var(--fg);
		opacity: 1;
	}


	/* ── Empty State ─────────────────────────────────────────────────────────── */
	.page-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--fg-subtle);
		font-size: 0.875rem;
	}

	/* ── Mobile Clock ──────────────────────────────────────────────────────── */

	.mobile-page-clock {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		padding: 3.3vw 0 0.5vw 0;
	}

	.mobile-page-clock--clock-hidden {
		/* Keep header block while removing extra top space when clock is hidden. */
		padding-top: 1.2vw;
	}

	.mobile-page-clock__time {
		font-size: 4rem;
		font-weight: 500;
		letter-spacing: -0.06em;
		line-height: 1;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
	}

	/* ── Mobile Clock Date / Weather ────────────────────────────────────────── */
	.mobile-page-clock__sub {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding-left: 2px;
		gap: 2px;
	}

	.mobile-page-clock__date {
		font-size: 1.1rem;
		font-weight: 540;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	.mobile-page-clock__weather {
		font-size: 1.1rem;
		font-weight: 200;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	@media (max-width: 800px) {
		.mobile-page-clock__sub {
			gap: 4px;
		}
		.mobile-page-clock__date {
			font-size: 1.16rem;
		}
		.mobile-page-clock__weather {
			font-size: 1.16rem;
		}
	}

	/* ── Mobile Clock Hero Rows ─────────────────────────────────────────────── */
	.mobile-page-clock__hero {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding-top: 6px;
	}


	.mobile-page-clock__hero-label {
		font-size: 1rem;
		font-weight: 200;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	.mobile-page-clock__hero-value {
		font-size: 1.1rem;
		font-weight: 540;
		color: var(--fg-muted);
		opacity: 0.8;
		letter-spacing: 0.01em;
	}

	/* ── Edit mode bar ─────────────────────────────────────────────────────── */

	.page-edit-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0 8px;
	}

	.page-add-section {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 34px;
		padding: 0 14px;
		border-radius: var(--radius);
		border: 1px dashed var(--border-strong, var(--border));
		background: transparent;
		color: var(--fg-muted);
		font-size: 0.82rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			border-color var(--transition),
			color var(--transition),
			background-color var(--transition);
	}

	.page-add-section:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 6%, transparent);
	}

	.page-edit-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 34px;
		padding: 0 10px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.page-edit-btn:hover { background: var(--active); color: var(--fg); }

	.page-add-first {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px 32px;
		border-radius: var(--radius);
		border: 2px dashed var(--border);
		background: transparent;
		color: var(--fg-subtle);
		font-size: 0.875rem;
		cursor: pointer;
		transition:
			border-color var(--transition),
			color var(--transition);
	}

	.page-add-first:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

</style>
