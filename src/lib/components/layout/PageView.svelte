<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { activePageId, currentBreakpoint } from '$lib/stores/ui';
	import { isEditing, editMode } from '$lib/stores/editMode';
	import SectionGrid from './SectionGrid.svelte';
	import IntegratedNavRail from './IntegratedNavRail.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Page, PageTransitionType } from '$lib/types/dashboard';
	import { onMount, onDestroy } from 'svelte';
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

	const visibleSections = $derived(
		activePage ? activePage.sections.filter((section) => section.visibility[breakpoint]) : []
	);
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

	// Build inline background style from PageBackground config
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

		if (bg.blur) parts.push(`backdrop-filter: blur(${bg.blur}px)`);

		return parts.join('; ');
	}

	// ── Edit mode helpers ──────────────────────────────────────────────────────

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

	// ── Clock ────────────────────────────────────────────────────────────
	let clockTime = $state('');
	let clockDate = $state('');
	let clockTimer: ReturnType<typeof setInterval> | null = null;

	function updateClock() {
		const now = new Date();
		clockTime = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?[AP]M/i, '');
		clockDate = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
	}

	const weatherEntity = $derived($entities['weather.forecast_home']);
	const weatherStr = $derived(() => {
		if (!weatherEntity || weatherEntity.state === 'unknown' || weatherEntity.state === 'unavailable') return null;
		const temp = Math.round(Number(weatherEntity.attributes?.temperature || 0));
		const condition = weatherEntity.state.replace(/-/g, ' ');
		
		// Capitalize first letter of condition
		const capitalizedCondition = condition.charAt(0).toUpperCase() + condition.slice(1);
		
		return `Feels like ${temp}° — ${capitalizedCondition}`;
	});

	onMount(() => { updateClock(); clockTimer = setInterval(updateClock, 1000); });
	onDestroy(() => { if (clockTimer) clearInterval(clockTimer); });
</script>

{#if activePage}
	{#key activePage.id}
		<div
			class="page-frame"
			in:pageTransition={currentPageTransition}
			out:pageTransition={currentPageTransition}
		>
			<!-- Page background layer -->
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

			<!-- ── default / full layout ───────────────────────────────────────────── -->
			{#if activePage.layout === 'default' || activePage.layout === 'full'}
				<div class="page-stage">
					<div
						class="page-view"
						class:page-view--full={activePage.layout === 'full'}
						class:page-view--with-nav={showIntegratedNav}
					>
						{#if showIntegratedNav}
								<div class="page-view__dashboard">
									<div class="page-view__nav-panel">
										<IntegratedNavRail />
									</div>
								<div class="page-view__content">
									{#if showMobileClock}
										<div class="mobile-page-clock" aria-live="off">
											<span class="mobile-page-clock__time">{clockTime}</span>
											<div class="mobile-page-clock__sub">
												<span class="mobile-page-clock__date">{clockDate}</span>
												{#if weatherStr()}
													<span class="mobile-page-clock__weather"> • {weatherStr()}</span>
												{/if}
											</div>
										</div>
									{/if}

									{#each visibleSections as section (section.id)}
										<SectionGrid
											{section}
											pageId={activePage.id}
											onEditSection={onEditSection
												? () => onEditSection!(activePage.id, section.id)
												: undefined}
											onAddTile={onAddTile
												? (activeColumns) => onAddTile!(activePage.id, section.id, activeColumns)
												: undefined}
										/>
									{/each}

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
							{#if showMobileClock}
								<div class="mobile-page-clock" aria-live="off">
									<span class="mobile-page-clock__time">{clockTime}</span>
									<div class="mobile-page-clock__sub">
										<span class="mobile-page-clock__date">{clockDate}</span>
										{#if weatherStr()}
											<span class="mobile-page-clock__weather"> • {weatherStr()}</span>
										{/if}
									</div>
								</div>
							{/if}

							{#each visibleSections as section (section.id)}
								<SectionGrid
									{section}
									pageId={activePage.id}
									onEditSection={onEditSection
										? () => onEditSection!(activePage.id, section.id)
										: undefined}
									onAddTile={onAddTile
										? (activeColumns) => onAddTile!(activePage.id, section.id, activeColumns)
										: undefined}
								/>
							{/each}

							<!-- Add section + page settings bar (edit mode only) -->
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
	<!-- No pages configured yet -->
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

	/* Background layer */
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

	/* Default / full layout */
	.page-stage {
		position: relative;
		width: 100%;
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
	}

	.page-view {
		position: relative;
		z-index: 1;
		width: 100%;
		flex: 1 0 auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
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
		/* Keep the rail on a clearly visible responsive range so its width
		   actually changes with the desktop window instead of reading as fixed. */
		--rail-width: clamp(244px, calc(104px + 17vw), 360px);
		/* Sidebar sizing tokens, mirroring the tablet theme approach: one set of
		   explicit responsive values that the rail consumes consistently. */
		--rail-body-size: clamp(15px, 1.6vw, 20px);
		--rail-body-line: clamp(20px, 2.2vw, 28px);
		--rail-time-size: clamp(48px, 5.4vw, 82px);
		--rail-time-line: clamp(38px, 4.3vw, 64px);
		--rail-date-size: clamp(16px, 1.6vw, 21px);
		--rail-weather-size: clamp(15px, 1.38vw, 19px);
		--rail-nav-size: clamp(16px, 1.52vw, 21px);
		--rail-icon-size: clamp(14px, 1.5vw, 20px);
		--rail-link-gap: clamp(8px, 0.6vw, 12px);
		--rail-link-pad-y: clamp(7px, 0.5vw, 10px);
		--rail-list-gap: clamp(1px, 0.12vw, 3px);
		--rail-hero-gap: clamp(10px, 0.55vw, 14px);
		--rail-hero-top: 4px;
		--rail-hero-bottom: clamp(26px, 1.8vw, 40px);
		--rail-weather-top: 3px;
		--rail-nav-top: clamp(12px, 0.9vw, 18px);
		--rail-pad-top: clamp(14px, 1vw, 18px);
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

	/* The rail/page split belongs to the full dashboard column boundary, not the
	   sticky rail panel, so it runs the full layout height. */
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
		padding: 14px 12px 16px 0;
		background: transparent;
		overflow: visible;
	}

	.page-view__content {
		display: flex;
		flex-direction: column;
		gap: 16px;
		min-width: 0;
		padding: 18px 28px 24px 28px;
	}

	/* Empty state */
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
		gap: 2px;
		padding: 12px 16px 10px 1px; /* Align tight to the left boundary of the UI */
	}

	.mobile-page-clock__time {
		font-size: 4rem;
		font-weight: 500;
		letter-spacing: -0.06em;
		line-height: 1;
		color: var(--fg);
		font-variant-numeric: tabular-nums;
	}

	.mobile-page-clock__sub {
		display: flex;
		align-items: center;
		padding-left: 2px; /* optical alignment with the heavily tracked time */
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mobile-page-clock__date {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--fg-muted);
		opacity: 0.6;
		letter-spacing: 0.01em;
	}

	.mobile-page-clock__weather {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--fg-muted);
		opacity: 0.6;
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
