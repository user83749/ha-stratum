<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activePageId } from '$lib/stores/ui';
	import { editMode, isEditing, editSelection, editorOpen } from '$lib/stores/editMode';
	import { undoStore } from '$lib/stores/undoStore';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import AppNav from '$lib/components/layout/AppNav.svelte';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import MobileNav from '$lib/components/layout/MobileNav.svelte';
	import PageView from '$lib/components/layout/PageView.svelte';
	import MoreInfoDialog from '$lib/components/dialogs/MoreInfoDialog.svelte';
	import EditFab from '$lib/components/edit/EditFab.svelte';
	import EditToolbar from '$lib/components/edit/EditToolbar.svelte';
	import TileEditor from '$lib/components/edit/TileEditor.svelte';
	import SectionEditor from '$lib/components/edit/SectionEditor.svelte';
	import PageEditor from '$lib/components/edit/PageEditor.svelte';
import TilePicker from '$lib/components/edit/TilePicker.svelte';
import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
import NotificationsPanel from '$lib/components/ui/NotificationsPanel.svelte';
import { isSettingsOpen, isSearchOpen, isNotificationsOpen } from '$lib/stores/ui';
import { THEME_PRESETS } from '$lib/themes/presets';
import { entities } from '$lib/ha/websocket';
import type { Section } from '$lib/types/dashboard';
import { getAdaptiveColumns, getSectionMaxColumns, MOBILE_SECTION_COLS } from '$lib/layout/sectionLayout';
import { getAllowedPresets } from '$lib/layout/tileSizing';
import { configStore } from '$lib/stores/config';
import { isDemoMode } from '$lib/demo';
import ConnectScreen from '$lib/components/setup/ConnectScreen.svelte';

	const isConfigured = $derived($configStore.hassUrl && $configStore.token);
	const showSetup = $derived(!isConfigured && !isDemoMode());

	const cfg    = $derived($dashboardStore);
	const navCfg = $derived(cfg.nav);
	const editing = $derived($isEditing);

	// ── Responsive ─────────────────────────────────────────────────────────────

	let windowWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1280);

	$effect(() => {
		function onResize() { windowWidth = window.innerWidth; }
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	});

	$effect(() => {
		const bp = windowWidth < 640 ? 'sm' : windowWidth < 1024 ? 'md' : 'lg';
		uiStore.setBreakpoint(bp);
	});

	// Let the integrated desktop rail yield a bit earlier so the layout switches
	// to the mobile nav before the left rail starts feeling cramped.
	const SIDEBAR_HIDE_EARLY_PX = 32;
	const mobileNavBreakpoint = $derived(
		navCfg.position === 'left'
			? navCfg.mobileBreakpoint + SIDEBAR_HIDE_EARLY_PX
			: navCfg.mobileBreakpoint
	);
	const isMobile = $derived(windowWidth < mobileNavBreakpoint);
	const showMobileNav = $derived(isMobile && navCfg.mobileStyle !== 'hidden');
	const useIntegratedDesktopNav = $derived(navCfg.position === 'left' && !showMobileNav);

	// ── Init ───────────────────────────────────────────────────────────────────

	onMount(() => {
		const display = cfg.display;
		const firstId = cfg.pages[0]?.id;
		uiStore.initPage(display.defaultPageId, firstId);
	});

	// ── Edit state ─────────────────────────────────────────────────────────────

	const editorState  = $derived($editorOpen);
	const selection    = $derived($editSelection);

	// Computed objects for the open editors
	const editingTile = $derived(() => {
		if (editorState !== 'tile' || !selection.pageId || !selection.sectionId || !selection.tileId) return null;
		const page    = cfg.pages.find((p) => p.id === selection.pageId);
		const section = page?.sections.find((s) => s.id === selection.sectionId);
		return section?.tiles.find((t) => t.id === selection.tileId) ?? null;
	});

	const editingSection = $derived(() => {
		if (editorState !== 'section' || !selection.pageId || !selection.sectionId) return null;
		const page = cfg.pages.find((p) => p.id === selection.pageId);
		return page?.sections.find((s) => s.id === selection.sectionId) ?? null;
	});

	const editingPage = $derived(() => {
		if (editorState !== 'page' || !selection.pageId) return null;
		return cfg.pages.find((p) => p.id === selection.pageId) ?? null;
	});

	// ── TilePicker state ───────────────────────────────────────────────────────

	let tilePickerOpen    = $state(false);
	let tilePickerPageId  = $state('');
	let tilePickerSectId  = $state('');
	let tilePickerCols    = $state(0);

	function estimateSectionColumns(section: Section): number {
		const maxCols = getSectionMaxColumns(section);
		const breakpoint = windowWidth < 640 ? 'sm' : windowWidth < 1024 ? 'md' : 'lg';
		if (breakpoint === 'sm') return Math.min(maxCols, MOBILE_SECTION_COLS);

		// Mirror the integrated rail width used by PageView so non-inline add
		// entry points normalize against the same effective desktop content width.
		const railWidth = useIntegratedDesktopNav ? Math.round(Math.min(360, Math.max(244, 104 + windowWidth * 0.17))) : 0;
		const shellPadding = useIntegratedDesktopNav ? 76 : 48;
		const estimatedWidth = Math.max(240, windowWidth - railWidth - shellPadding);
		return getAdaptiveColumns(estimatedWidth, section.grid.baseSize, section.grid.gap, maxCols);
	}

	function openTilePicker(pageId: string, sectionId: string, activeColumns = 0) {
		const section = cfg.pages
			.find((p) => p.id === pageId)
			?.sections.find((s) => s.id === sectionId) ?? null;
		tilePickerPageId = pageId;
		tilePickerSectId = sectionId;
		tilePickerCols   = activeColumns || (section ? estimateSectionColumns(section) : 0);
		tilePickerOpen   = true;
	}

	// ── Add section ────────────────────────────────────────────────────────────

	function addSection(pageId: string) {
		const current = get(dashboardStore);
		undoStore.push(current);
		const newSectionId = crypto.randomUUID();
		dashboardStore.addSection(pageId, {
			id:          newSectionId,
			title:       'New Section',
			icon:        '',
			role:        'main',
			visibility:  { lg: true, md: true, sm: true },
			collapsible: false,
			collapsed:   false,
			grid: { baseSize: 160, gap: 8 },
			tiles:       []
		});
		// Open SectionEditor so user can see it was created
		editMode.selectSection(pageId, newSectionId);
	}

	// ── Keyboard navigation ────────────────────────────────────────────────────

	function handleKeydown(e: KeyboardEvent) {
		// Always: Escape closes overlays / deselects
		if (e.key === 'Escape') {
			if (editing && editorState) {
				editMode.closeEditor();
			} else {
				uiStore.closeAll();
			}
			return;
		}

		const ctrl = e.ctrlKey || e.metaKey;

		// Ctrl+E — toggle edit mode
		if (ctrl && e.key === 'e') {
			e.preventDefault();
			editMode.toggle();
			return;
		}

		// Ctrl+, — open settings
		if (ctrl && e.key === ',') {
			e.preventDefault();
			uiStore.toggleSettings();
			return;
		}

		if (!editing) return;

		// Ctrl+Z — undo
		if (ctrl && !e.shiftKey && e.key === 'z') {
			e.preventDefault();
			const current = get(dashboardStore);
			const restored = undoStore.undo(current);
			if (restored) dashboardStore.seed(restored);
			return;
		}

		// Ctrl+Shift+Z — redo
		if (ctrl && e.shiftKey && e.key === 'z') {
			e.preventDefault();
			const current = get(dashboardStore);
			const restored = undoStore.redo(current);
			if (restored) dashboardStore.seed(restored);
			return;
		}

		// Ctrl+D — duplicate selected tile
		if (ctrl && e.key === 'd' && selection.tileId && selection.pageId && selection.sectionId) {
			e.preventDefault();
			duplicateTile(selection.pageId, selection.sectionId, selection.tileId);
			return;
		}

		// Delete / Backspace — delete selected tile
		if ((e.key === 'Delete' || e.key === 'Backspace') && selection.tileId) {
			// Only if not in an input/textarea
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			e.preventDefault();
			if (selection.pageId && selection.sectionId && selection.tileId) {
				const current = get(dashboardStore);
				undoStore.push(current);
				dashboardStore.deleteTile(selection.pageId, selection.sectionId, selection.tileId);
				editMode.closeEditor();
			}
			return;
		}

		// Shift+Arrow keys — step the selected tile through semantic sizes
		if (e.shiftKey && selection.tileId && selection.pageId && selection.sectionId) {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

			const page    = cfg.pages.find((p) => p.id === selection.pageId);
			const section = page?.sections.find((s) => s.id === selection.sectionId);
			const tile    = section?.tiles.find((t) => t.id === selection.tileId);
			if (!tile) return;

			const allowed = getAllowedPresets(tile.type);
			const currentPreset = tile.sizePreset ?? 'md';
			const currentIndex = Math.max(0, allowed.indexOf(currentPreset));
			let nextIndex = currentIndex;
			let moved = false;

			if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
				nextIndex = Math.min(currentIndex + 1, allowed.length - 1);
				moved = nextIndex !== currentIndex;
			}
			if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
				nextIndex = Math.max(currentIndex - 1, 0);
				moved = nextIndex !== currentIndex;
			}

			if (moved && allowed[nextIndex]) {
				e.preventDefault();
				const current = get(dashboardStore);
				undoStore.push(current);
				dashboardStore.setTileSizePreset(selection.pageId, selection.sectionId, selection.tileId, allowed[nextIndex]);
			}
		}
	}

	// ── Tile actions ───────────────────────────────────────────────────────────

	function duplicateTile(pageId: string, sectionId: string, tileId: string) {
		const page    = cfg.pages.find((p) => p.id === pageId);
		const section = page?.sections.find((s) => s.id === sectionId);
		const tile    = section?.tiles.find((t) => t.id === tileId);
		if (!tile) return;

		const current = get(dashboardStore);
		undoStore.push(current);

		const copy = {
			...structuredClone(tile),
			id: crypto.randomUUID()
		};
		dashboardStore.addTile(pageId, sectionId, copy);
	}

	function deleteTile(pageId: string, sectionId: string, tileId: string) {
		const current = get(dashboardStore);
		undoStore.push(current);
		dashboardStore.deleteTile(pageId, sectionId, tileId);
		editMode.closeEditor();
	}

	// ── Top-bar height offset ──────────────────────────────────────────────────
	// EditToolbar is 52px; AppHeader is typically 56px (set by config).
	// When editing, we push content down by 52px to avoid the toolbar overlapping.
	const editingTopOffset = $derived(editing ? '52px' : '0px');

	// ── Swipe gesture navigation ────────────────────────────────────────────────

	let _touchStartX = 0;
	let _touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		if (!cfg.display.swipeNavigation) return;
		_touchStartX = e.touches[0].clientX;
		_touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		if (!cfg.display.swipeNavigation) return;
		const dx = e.changedTouches[0].clientX - _touchStartX;
		const dy = e.changedTouches[0].clientY - _touchStartY;
		// Only trigger horizontal swipe if horizontal dominates
		if (Math.abs(dx) < cfg.display.swipeThreshold || Math.abs(dy) > Math.abs(dx)) return;

		const currentId = $activePageId ?? cfg.pages[0]?.id;
		const idx = cfg.pages.findIndex((p) => p.id === currentId);
		if (idx === -1) return;

		if (dx < 0 && idx < cfg.pages.length - 1) {
			// Swipe left → next page
			uiStore.navigateTo(cfg.pages[idx + 1].id);
		} else if (dx > 0 && idx > 0) {
			// Swipe right → previous page
			uiStore.navigateTo(cfg.pages[idx - 1].id);
		}
	}

	// ── Theme schedule ──────────────────────────────────────────────────────────

	let _scheduleTimer: ReturnType<typeof setTimeout> | null = null;

	function parseDateValue(value: unknown): Date | null {
		if (typeof value !== 'string' || !value) return null;
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function applyScheduledTheme() {
		const schedule = cfg.display.themeSchedule;
		if (!schedule.enabled) return;

		let isDayTime: boolean;
		if (schedule.mode === 'time') {
			const now = new Date();
			const [dh, dm] = (schedule.dayStart ?? '07:00').split(':').map(Number);
			const [nh, nm] = (schedule.nightStart ?? '20:00').split(':').map(Number);
			const minutes  = now.getHours() * 60 + now.getMinutes();
			const dayMins  = dh * 60 + dm;
			const nightMins = nh * 60 + nm;
			isDayTime = minutes >= dayMins && minutes < nightMins;
		} else {
			const sunEntity = $entities[schedule.sunEntityId || 'sun.sun'];
			if (!sunEntity) {
				isDayTime = true;
			} else {
				const now = new Date();
				const nowMs = now.getTime();
				const dayOffsetMs = (schedule.dayOffset ?? 0) * 60_000;
				const nightOffsetMs = (schedule.nightOffset ?? 0) * 60_000;
				const nextRising = parseDateValue(sunEntity.attributes.next_rising);
				const nextSetting = parseDateValue(sunEntity.attributes.next_setting);
				const dayMs = 24 * 60 * 60 * 1000;
				const sunIsUp = sunEntity.state === 'above_horizon';

				if (!nextRising || !nextSetting) {
					isDayTime = sunIsUp;
				} else if (sunIsUp) {
					const switchToDayAt = nextRising.getTime() - dayMs + dayOffsetMs;
					const switchToNightAt = nextSetting.getTime() + nightOffsetMs;
					isDayTime = nowMs >= switchToDayAt && nowMs < switchToNightAt;
				} else {
					const switchToNightAt = nextSetting.getTime() - dayMs + nightOffsetMs;
					const switchToDayAt = nextRising.getTime() + dayOffsetMs;
					isDayTime = !(nowMs >= switchToNightAt && nowMs < switchToDayAt);
				}
			}
		}

		const presetId = isDayTime ? schedule.dayPresetId : schedule.nightPresetId;
		const preset   = THEME_PRESETS.find((p) => p.id === presetId);
		if (preset && cfg.theme.themeId !== preset.id) {
			dashboardStore.setTheme({ themeId: preset.id });
		}
	}

	$effect(() => {
		const schedule = cfg.display.themeSchedule;
		if (!schedule.enabled) {
			if (_scheduleTimer) { clearTimeout(_scheduleTimer); _scheduleTimer = null; }
			return;
		}
		// Check immediately, then every minute
		applyScheduledTheme();
		function tick() {
			applyScheduledTheme();
			_scheduleTimer = setTimeout(tick, 60_000);
		}
		_scheduleTimer = setTimeout(tick, 60_000);
		return () => {
			if (_scheduleTimer) { clearTimeout(_scheduleTimer); _scheduleTimer = null; }
		};
	});
</script>

<svelte:window
	onkeydown={handleKeydown}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
/>

{#if showSetup}
	<ConnectScreen />
{:else}
	<AppShell integratedLeftNav={useIntegratedDesktopNav}>
{/if}
		{#snippet nav()}
			{#if !useIntegratedDesktopNav && !showMobileNav && navCfg.position !== 'bottom'}
				<AppNav />
			{/if}
		{/snippet}

	{#snippet header()}
		<AppHeader />
	{/snippet}

	{#snippet children()}
		<!-- EditToolbar — fixed top bar in edit mode -->
		{#if editing}
			{@const activePgId = $activePageId ?? cfg.pages[0]?.id}
			{@const activePg = cfg.pages.find((p) => p.id === activePgId) ?? cfg.pages[0]}
			<EditToolbar
				onAddSection={() => {
					if (activePg) addSection(activePg.id);
				}}
				onAddTile={() => {
					const sect = activePg?.sections[0];
					if (activePg && sect) openTilePicker(activePg.id, sect.id);
				}}
			/>
		{/if}

		<!-- Main page content — offset if edit toolbar is shown -->
		<div
			style={editing ? `padding-top: ${editingTopOffset}; height: 100%; display: flex; flex-direction: column;` : 'height: 100%; display: flex; flex-direction: column;'}
		>
				<div
					style={
						showMobileNav
							? 'padding-bottom: 64px; flex: 1; display: flex; flex-direction: column;'
							: 'flex: 1; display: flex; flex-direction: column;'
					}
				>
						<PageView
							showIntegratedNav={useIntegratedDesktopNav}
							showMobileClock={showMobileNav}
					onEditSection={(pageId, sectionId) => {
						editMode.selectSection(pageId, sectionId);
					}}
					onEditPage={(pageId) => {
						editMode.openPageEditor(pageId);
					}}
					onAddTile={(pageId, sectionId, activeColumns) => {
						openTilePicker(pageId, sectionId, activeColumns);
					}}
					onAddSection={(pageId) => {
						addSection(pageId);
					}}
				/>
			</div>
		</div>

			{#if showMobileNav}
				<MobileNav />
			{/if}

		<!-- More-info dialog — mounted once, opens on tile tap -->
		<MoreInfoDialog />

		<!-- Edit FAB (bottom-right) -->
		<EditFab />

		<!-- Settings panel -->
		<SettingsPanel
			open={$isSettingsOpen}
			onclose={() => uiStore.closeSettings()}
		/>

		<!-- Command palette (Cmd+K search) -->
		<CommandPalette
			open={$isSearchOpen}
			onclose={() => uiStore.closeSearch()}
		/>

		<!-- Notifications panel -->
		<NotificationsPanel
			open={$isNotificationsOpen}
			onclose={() => uiStore.closeNotifications()}
		/>

		<!-- TilePicker dialog -->
		<TilePicker
			open={tilePickerOpen}
			pageId={tilePickerPageId}
			sectionId={tilePickerSectId}
			columnHint={tilePickerCols}
			onclose={() => (tilePickerOpen = false)}
		/>

		<!-- TileEditor right drawer -->
		{#if editing}
			<TileEditor
				open={editorState === 'tile'}
				tile={editingTile()}
				pageId={selection.pageId ?? ''}
				sectionId={selection.sectionId ?? ''}
				onclose={() => editMode.closeEditor()}
				onDelete={() => {
					if (selection.pageId && selection.sectionId && selection.tileId) {
						deleteTile(selection.pageId, selection.sectionId, selection.tileId);
					}
				}}
				onDuplicate={() => {
					if (selection.pageId && selection.sectionId && selection.tileId) {
						duplicateTile(selection.pageId, selection.sectionId, selection.tileId);
					}
				}}
			/>

			<!-- SectionEditor right drawer -->
			<SectionEditor
				open={editorState === 'section'}
				section={editingSection()}
				pageId={selection.pageId ?? ''}
				onclose={() => editMode.closeEditor()}
				onDelete={() => {
					if (selection.pageId && selection.sectionId) {
						const current = get(dashboardStore);
						undoStore.push(current);
						dashboardStore.deleteSection(selection.pageId, selection.sectionId);
						editMode.closeEditor();
					}
				}}
				onAddTile={() => {
					if (selection.pageId && selection.sectionId) {
						openTilePicker(selection.pageId, selection.sectionId);
					}
				}}
			/>

			<!-- PageEditor right drawer -->
			<PageEditor
				open={editorState === 'page'}
				page={editingPage()}
				onclose={() => editMode.closeEditor()}
				onDelete={() => {
					if (selection.pageId) {
						const current = get(dashboardStore);
						undoStore.push(current);
						dashboardStore.deletePage(selection.pageId);
						editMode.closeEditor();
					}
				}}
			/>
		{/if}
	{/snippet}
	</AppShell>
{/if}
