<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import { isEditing, editSelection, multiSelection, editMode } from '$lib/stores/editMode';
	import { isUnavailable, isActive } from '$lib/ha/entities';
	import { entities } from '$lib/ha/websocket';
	import { handleAction, lockService } from '$lib/ha/services';
	import { haptic, hapticDouble } from '$lib/utils/haptics';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getUpdateCount } from '$lib/ha/updateSummary';

	// ─── Props ───────────────────────────────────────────────────────────────

	interface Props {
		tile:       Tile;
		entity?:    HassEntity | null;
		pageId?:    string;
		sectionId?: string;
		preview?: boolean;
		onTap?:     () => void;
		onHold?:    () => void;
		onEditDragStart?: (event: PointerEvent) => void;
		onEditResizeStart?: (event: PointerEvent) => void;
		children:   Snippet;
	}

	const {
		tile,
		entity = null,
		pageId = '',
		sectionId = '',
		preview = false,
		onTap,
		onHold,
		onEditDragStart,
		onEditResizeStart,
		children
	}: Props = $props();

	// ─── Derived state ───────────────────────────────────────────────────────

	const editing = $derived($isEditing);

	const isSelected = $derived(
		editing && $editSelection.tileId === tile.id
	);

	const isMultiSelected = $derived(
		editing && $multiSelection.includes(tile.id)
	);

	const entityActive = $derived.by(() => {
		if (!entity) return false;

		// Match HA button-card "state_on" semantics for the standard Media Player tile:
		// treat any non-off-ish state as active so the tile "lights up" like the other tiles.
		if (tile.type === 'media_player') {
			const s = entity.state;
			return !['off', 'idle', 'standby', 'unknown', 'unavailable'].includes(s);
		}

		// Locks should "light up" when unlocked (not locked).
		if (tile.type === 'lock') {
			return entity.state === 'unlocked' || entity.state === 'unlocking';
		}

		// Update tiles can target update.* entities OR summary sensors (e.g. sensor.hassio_updates_available).
		// Treat them as active when updates are available.
		if (tile.type === 'update') {
			return getUpdateCount(entity, $entities) > 0;
		}

		return isActive(entity);
	});
	const entityDomain = $derived(entity?.entity_id?.split('.')[0] ?? tile.entity_id?.split('.')[0] ?? '');

	// ─── HA button-card compatible light color vars ───────────────────────────
	// Many of your custom SVG icons rely on `.light-color { fill: var(--light-color) }`
	// plus a per-card `--light-color` var. We set `--light-color` + `--lc` here
	// so the same SVGs behave like they do in HA button-card templates.
	let buttonCardLightTemp = $state('');
	let buttonCardLightColor = $state('');

	function readButtonCardVars() {
		if (typeof window === 'undefined') return;
		const style = getComputedStyle(document.documentElement);
		buttonCardLightTemp = style.getPropertyValue('--button-card-light-color-temp').trim();
		buttonCardLightColor = style.getPropertyValue('--button-card-light-color').trim();
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		readButtonCardVars();
		window.addEventListener('stratum:theme-applied', readButtonCardVars);
		return () => window.removeEventListener('stratum:theme-applied', readButtonCardVars);
	});

	function computeButtonCardHslTemp(brightnessPct: number, raw: string): string | null {
		const m = raw.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i);
		if (!m) return null;
		const h = m[1]!;
		const s = m[2]!;
		const baseL = Number(m[3]!);
		if (!Number.isFinite(baseL)) return null;
		const min = baseL - 10;
		const max = baseL + 10;
		const l = Math.max(0, Math.min(100, (brightnessPct * (max - min)) / 100 + min));
		return `hsl(${h}, ${s}%, ${l}%)`;
	}

	const buttonCardStyleVars = $derived.by(() => {
		if (!entity) return '';

		// Mirrors your HA base template `variables.state_on`.
		const stateOn = ['on', 'home', 'cool', 'fan_only', 'playing', 'open', 'opening', 'active', 'unlocked']
			.includes(entity.state);

		const attrs = entity.attributes ?? {};
		const brightness = attrs.brightness as number | undefined;
		const brightnessPct =
			typeof brightness === 'number'
				? Math.round(brightness / 2.54)
				: null;

		let lightColor: string;

		// Only lights participate in the brightness + color_temp lightness algorithm.
		if (
			stateOn &&
			entityDomain === 'light' &&
			brightnessPct !== null &&
			brightnessPct > 0
		) {
			const colorMode = attrs.color_mode as string | undefined;
			const wantsTemp = colorMode === 'color_temp';

			if (wantsTemp && buttonCardLightTemp.toLowerCase().startsWith('hsl(')) {
				lightColor =
					computeButtonCardHslTemp(brightnessPct, buttonCardLightTemp) ??
					(buttonCardLightColor || 'var(--button-card-light-color)');
			} else {
				lightColor = buttonCardLightColor || 'var(--button-card-light-color)';
			}
		} else if (stateOn) {
			lightColor = 'var(--state-icon-active-color)';
		} else {
			lightColor = 'var(--state-icon-color)';
		}

		return `--light-color:${lightColor};--lc:${lightColor};`;
	});

	const isButtonCardTile = $derived(
		[
			'input_select',
			'siren',
			'button',
			'vacuum',
			'water_heater',
			'timer',
			'alarm_panel',
			'light',
			'lock',
			'media_player',
			'energy',
			'lawn_mower',
			'fan'
		].includes(tile.type)
	);
		const useSharedActiveSurface = $derived.by(() => {
		// Shared active background only for the common control-style tiles.
		// Specialized tiles (weather, graph-backed tiles, climate, and
			// sensor-style entity tiles) own their visual treatment and should not
			// inherit this shared gray "on" surface.
			if (!entityActive) return false;
			if (['weather', 'history', 'gauge', 'statistic', 'climate', 'media_hero'].includes(tile.type)) return false;
			if (tile.type === 'entity' && entityDomain === 'sensor') return false;
			return true;
		});

	const showUnavailable = $derived(
		entity !== null &&
		entity !== undefined &&
		isUnavailable(entity) &&
		tile.config.show_unavailable !== false
	);

	/** Badge entities resolved from live store */
	const badgeEntities = $derived(
		(tile.badges ?? []).map((badge) => ({
			badge,
			entity: $entities[badge.entity_id] ?? null
		}))
	);

	// ─── Edit mode interaction ────────────────────────────────────────────────

	function handleEditClick(e: MouseEvent) {
		e.stopPropagation();
		if (!pageId || !sectionId) return;
		if (e.shiftKey) {
			editMode.toggleMultiSelect(tile.id);
		} else {
			editMode.selectTile(pageId, sectionId, tile.id);
		}
	}

	// ─── Hold / tap / double-tap logic ───────────────────────────────────────

	let holdTimer:     ReturnType<typeof setTimeout> | null = $state(null);
	let tapTimer:      ReturnType<typeof setTimeout> | null = $state(null);
	let didHold        = $state(false);
	let pointerDownAt  = $state(0);
	let clickCount     = $state(0);
	let pointerDownX   = $state(0);
	let pointerDownY   = $state(0);
	let didScroll      = $state(false);
	let controlPointerActive = $state(false);

	const HOLD_THRESHOLD_MS = 500;
	const DBL_TAP_WINDOW_MS = 300;
	const SCROLL_THRESHOLD_PX = 8;
	const INTERACTIVE_SELECTOR =
		'button, input, select, textarea, a, [role="button"], [role="slider"], [role="checkbox"], [role="switch"], [role="listbox"], [role="option"]';

	const tileDefaults = $derived($dashboardStore.tileDefaults);

	// Resolve actions: tile config takes priority, falls back to tileDefaults.
	const resolvedDblTap = $derived(
		tile.config.double_tap_action ?? tileDefaults?.double_tap_action
	);

	const hasDblTap = $derived(
		!!(resolvedDblTap && resolvedDblTap.type !== 'none')
	);

	function clearHold() {
		if (holdTimer !== null) { clearTimeout(holdTimer); holdTimer = null; }
	}
	function clearTapTimer() {
		if (tapTimer !== null) { clearTimeout(tapTimer); tapTimer = null; }
	}

	async function fireAction(type: 'tap' | 'hold' | 'double_tap') {
		if (editing) return;

		let action =
			type === 'tap'        ? (tile.config.tap_action   ?? tileDefaults?.tap_action)   :
			type === 'hold'       ? (tile.config.hold_action  ?? tileDefaults?.hold_action)  :
			                        resolvedDblTap;

		if (!action || action.type === 'none') return;

		// Prevent "toggle" on non-togglable domains regardless of config
		if (action.type === 'toggle' && entity) {
			const domain = entity.entity_id.split('.')[0] ?? '';
			const togglable = ['light', 'switch', 'input_boolean', 'fan', 'climate', 'cover', 'lock', 'vacuum', 'siren', 'humidifier', 'water_heater', 'media_player', 'alarm_control_panel', 'automation', 'script', 'scene', 'valve', 'button', 'input_button'];
			if (!togglable.includes(domain)) {
				action = { ...action, type: 'more-info' };
			}
		}

		if (tile.config.confirm_action) {
			const entityName = entity
				? (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id
				: tile.config.name ?? 'this tile';
			const confirmed = window.confirm(`Confirm action on "${entityName}"?`);
			if (!confirmed) return;
		}

		if (type === 'tap' && onTap) { onTap(); return; }
		if (type === 'hold' && onHold) { onHold(); return; }

		if (action.type === 'more-info') {
			uiStore.openDialog(tile.entity_id ?? entity?.entity_id ?? '', undefined, tile.type, tile.id);
			return;
		}

		// Home Assistant has no generic "toggle" for locks via homeassistant.toggle.
		// If the user configured tap=toggle (or defaults), map it to lock/unlock.
		if (action.type === 'toggle' && tile.type === 'lock') {
			const id = tile.entity_id ?? entity?.entity_id ?? '';
			const s = entity?.state ?? 'unknown';
			if (!id) return;
			if (s === 'locked') { lockService.unlock(id).catch(() => {}); return; }
			if (s === 'unlocked') { lockService.lock(id).catch(() => {}); return; }
			// Fallback: open more-info if state is nonstandard.
			uiStore.openDialog(id, undefined, tile.type, tile.id);
			return;
		}

		await handleAction(action, tile.entity_id ?? entity?.entity_id);
	}

	/** Returns true if the event originated from an interactive child element (button, input, etc). */
	function isInteractiveTarget(e: PointerEvent | MouseEvent): boolean {
		let t = e.target as Element | null;
		if (t && t.nodeType === 3) t = t.parentElement;
		if (!t || !t.closest) return false;
		const match = t.closest(INTERACTIVE_SELECTOR);
		return !!match && match !== e.currentTarget;
	}

	function onPointerDown(e: PointerEvent) {
		if (editing) { handleEditClick(e as unknown as MouseEvent); return; }
		if (e.button !== 0) return;
		controlPointerActive = false;

		// Suppress tile-level actions when clicking a child control.
		if (isInteractiveTarget(e)) {
			controlPointerActive = true;
			clearHold();
			clearTapTimer();
			clickCount = 0;
			didHold = false;
			didScroll = false;
			return;
		}

		didHold = false;
		didScroll = false;
		pointerDownAt = Date.now();
		pointerDownX = e.clientX;
		pointerDownY = e.clientY;

		holdTimer = setTimeout(() => {
			// Guard against the race where clearHold() (triggered by onPointerLeave)
			// ran and nulled holdTimer just before this callback executed.
			if (holdTimer === null) return;
			if (didScroll) return;
			didHold = true;
			holdTimer = null;
			clickCount = 0;
			clearTapTimer();
			haptic('medium');
			fireAction('hold');
		}, HOLD_THRESHOLD_MS);
	}

	function onPointerMove(e: PointerEvent) {
		if (didScroll) return;
		if (holdTimer === null && !didHold) return;
		const dx = Math.abs(e.clientX - pointerDownX);
		const dy = Math.abs(e.clientY - pointerDownY);
		if (dx > SCROLL_THRESHOLD_PX || dy > SCROLL_THRESHOLD_PX) {
			didScroll = true;
			clearHold();
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (editing) return;
		// If this pointer sequence started from an internal control (slider/button/etc),
		// never fire tile-level tap/hold/double-tap actions.
		if (controlPointerActive) {
			controlPointerActive = false;
			clearHold();
			didHold = false;
			didScroll = false;
			return;
		}
		if (isInteractiveTarget(e)) {
			clearHold();
			didHold = false;
			didScroll = false;
			return;
		}
		const elapsed = Date.now() - pointerDownAt;
		if (didScroll || didHold || elapsed >= HOLD_THRESHOLD_MS) {
			clearHold();
			didHold = false;
			didScroll = false;
			return;
		}

		clearHold();
		didHold = false;
		didScroll = false;

		spawnRipple(e);

		if (!hasDblTap) {
			haptic('light');
			// No double-tap configured — fire tap immediately
			fireAction('tap');
			return;
		}

		// Manual double-tap handling (pointer-based) so mobile/touch does not
		// depend on native dblclick synthesis.
		if (tapTimer !== null) {
			hapticDouble();
			clearTapTimer();
			clickCount = 0;
			fireAction('double_tap');
			return;
		}

		haptic('light');
		clickCount = 1;
		tapTimer = setTimeout(() => {
			tapTimer = null;
			clickCount = 0;
			fireAction('tap');
		}, DBL_TAP_WINDOW_MS);
	}

	function onPointerLeave() {
		if (editing) return;
		controlPointerActive = false;
		clearHold();
		didHold = false;
		didScroll = false;
	}

	function onPointerCancel() {
		controlPointerActive = false;
		clearHold();
		clearTapTimer();
		didHold = false;
		didScroll = false;
		clickCount = 0;
	}

	// (Variant system removed — styling is driven system-wide by the theme)

	// ─── Interactive: any non-'none' tap_action counts ───────────────────────

	const resolvedTapAction = $derived(
		tile.config.tap_action ?? tileDefaults?.tap_action
	);

	const isInteractive = $derived(
		!preview &&
		!editing &&
		!!(onTap || (resolvedTapAction && resolvedTapAction.type !== 'none'))
	);

	// ─── Ripple ───────────────────────────────────────────────────────────────

	let ripples: { id: number; x: number; y: number; size: number }[] = $state([]);
	let rippleCounter = 0;

	function spawnRipple(e: PointerEvent) {
		if (editing) return;
		const el = (e.currentTarget as HTMLElement);
		const rect = el.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const size = Math.max(rect.width, rect.height) * 2;
		const id = ++rippleCounter;
		ripples = [...ripples, { id, x, y, size }];
		setTimeout(() => { ripples = ripples.filter(r => r.id !== id); }, 700);
	}

	// ─── Badge position helpers ───────────────────────────────────────────────

	function badgePositionStyle(position: string): string {
		switch (position) {
			case 'top-left':     return 'top: 6px; left: 6px;';
			case 'top-right':    return 'top: 6px; right: 6px;';
			case 'bottom-left':  return 'bottom: 6px; left: 6px;';
			case 'bottom-right': return 'bottom: 6px; right: 6px;';
			default:             return 'top: 6px; right: 6px;';
		}
	}

	function getBadgeValue(badgeEntity: HassEntity | null, attribute?: string): string | null {
		if (!badgeEntity) return null;
		if (attribute) {
			const val = badgeEntity.attributes[attribute];
			return val !== undefined ? String(val) : null;
		}
		return badgeEntity.state;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="tile-wrapper"
	class:editing
	class:selected={isSelected}
	class:multi-selected={isMultiSelected}
	class:interactive={isInteractive}
	class:preview={preview}
	class:entity-active={useSharedActiveSurface}
	class:tile-wrapper--buttoncard={isButtonCardTile}
	style={buttonCardStyleVars}
	role={isInteractive ? 'button' : undefined}
	tabindex={isInteractive ? 0 : undefined}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointerleave={onPointerLeave}
	onpointercancel={onPointerCancel}
	onkeydown={(e) => {
		if (editing) return;
		const targetEl = e.target as Element | null;
		if (targetEl && targetEl !== e.currentTarget && targetEl.closest(INTERACTIVE_SELECTOR)) {
			return;
		}
		if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			fireAction('tap');
		}
	}}
>
	<!-- Tile content slot -->
	<div class="tile-inner" inert={editing ? true : undefined}>{@render children()}</div>

	<!-- Ripple overlays -->
	{#each ripples as ripple (ripple.id)}
		<span
			class="ripple"
			aria-hidden="true"
			style="left:{ripple.x}px; top:{ripple.y}px; width:{ripple.size}px; height:{ripple.size}px;"
		></span>
	{/each}

	<!-- Edit mode move/resize handles + selection indicators -->
	{#if editing}
		<button
			type="button"
			class="edit-handle"
			aria-label="Move tile"
			onclick={(e) => e.stopPropagation()}
			onpointerdown={(e) => {
				e.stopPropagation();
				onEditDragStart?.(e);
			}}
		>
			<Icon name="grip-vertical" size={14} />
		</button>
		{#if isMultiSelected}
			<div class="multi-ring" aria-hidden="true">
				<div class="multi-check">
					<Icon name="check" size={10} />
				</div>
			</div>
		{/if}
		<button
			type="button"
			class="resize-handle"
			aria-label="Resize tile"
			onclick={(e) => e.stopPropagation()}
			onpointerdown={(e) => {
				e.stopPropagation();
				onEditResizeStart?.(e);
			}}
		>
			<span class="resize-knob" aria-hidden="true"></span>
		</button>
	{/if}

	<!-- Unavailable overlay -->
	{#if showUnavailable}
		<div class="unavailable-overlay" aria-hidden="true">
			<span class="unavailable-label">Unavailable</span>
		</div>
	{/if}

	<!-- Badge overlays -->
	{#each badgeEntities as { badge, entity: badgeEntity } (badge.entity_id + badge.position)}
		{@const value = getBadgeValue(badgeEntity, badge.attribute)}
		{@const showState = badge.show_state && value !== null}
		<div
			class="badge"
			class:badge-chip={showState}
			style="{badgePositionStyle(badge.position)}{badge.color ? ` --badge-color: ${badge.color};` : ''}"
			title={badgeEntity ? `${badge.entity_id}: ${value}` : badge.entity_id}
			aria-hidden="true"
		>
			{#if showState}
				<span class="badge-state">{value}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* ─── Base wrapper ──────────────────────────────────────────────────────── */

	.tile-wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: var(--tile-padding-effective);
		border-radius: var(--tile-radius, var(--radius));
		border-width: 0;
		border-style: none;
			transition:
				box-shadow var(--transition),
				background-color var(--transition),
				transform var(--transition-hover, var(--transition)),
				filter var(--transition-hover, var(--transition)),
				opacity var(--transition);
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		container-type: inline-size;
		container-name: tile;
		text-rendering: auto;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* Tile previews in Add Tile: keep all token sizes bounded so every preset
	   (sm/md/lg/xl) fits cleanly in the preview slot without vw-based overflow. */
	.tile-wrapper.preview {
		--button-card-font-size:          12px;
		--tile-padding-effective:         10px;
		--tile-padding:                   10px;
		--hero-text-size:                 22px;
		--hero-icon-size:                 28px;
		--hero-icon-size-compact:         24px;
		--action-icon-size:               13px;
		--action-icon-size-sm:            11px;
		--action-icon-size-lg:            15px;
		--control-chip-size:              34px;
		--control-chip-radius:            10px;
		--control-chip-size-compact:      30px;
		--control-chip-radius-compact:    9px;
		--control-chip-icon-size:         14px;
		--control-chip-icon-size-compact: 13px;
		transition: none;
	}

	/* Preview hardening: keep dense layouts from clipping in the Add Tile slot. */
	.tile-wrapper.preview :global(.layout-lg) {
		padding: min(18px, 6%);
		gap: min(14px, 4%);
	}

	.tile-wrapper.preview :global(.layout-md) {
		gap: min(10px, 3%);
	}

	.tile-wrapper.preview :global(.mode-switcher) {
		padding: 6px;
	}

	.tile-wrapper.preview :global(.target-control) {
		gap: min(22px, 5%);
		padding: min(10px, 3.5%) min(20px, 6%);
	}

	/* ── Static card surface vars ────────────────────────────────────────── */
		.tile-wrapper {
			--control-active-surface:         rgba(255, 255, 255, 0.82);
			--control-label-weight:           500;
			--control-label-line-height:      1.15;
			--control-chip-border-width:      1.5px;
		--control-chip-fill-strength:     18%;
		--control-chip-border-strength:   35%;
		--control-active-name:            #4b5254;
		--control-active-state:           var(--control-active-name);
		--button-card-font-weight:        500;
		/* Match HA button-card theme tokens (tablet) */
		--button-card-letter-spacing:     -0.02vw;
			--button-card-font-size-base:     1.35vw;
			--button-card-font-size:          var(--button-card-font-size-base);
			--tile-active-opacity:            0.97;
			background: var(--tile-surface-off, rgba(115, 115, 115, 0.25));
			box-shadow: var(--tile-shadow, none);
			backdrop-filter: var(--tile-backdrop, none);
			-webkit-backdrop-filter: var(--tile-backdrop, none);
		}

	/* ── Fluid token system ────────────────────────────────────────────── */
	/* Pattern: --X-base (vw), multipliers, --X (effective output).        */
	/* Breakpoints override only the effective var. Components use only    */
	/* the effective var, never the base.                                  */
	.tile-wrapper {
		/* ── Tile padding ──────────────────────────────────── */
		--tile-padding-base:              0.85vw;
		--tile-padding-portrait:          1.4;
		--tile-padding-phone:             2.271;
		/* HA extra_styles: --card-portrait / --card-phone */
		--card-portrait:                  var(--tile-padding-portrait);
		--card-phone:                     var(--tile-padding-phone);
		--tile-padding-effective:         var(--tile-padding-base);
		--tile-padding:                   var(--tile-padding-effective);

		/* ── Tile gap (matches your HA button-card template) ─────── */
		--tile-gap:                       1.3%;

		/* Aliases — all label vars resolve to the button-card tokens */
		--control-label-size:             var(--button-card-font-size);
		--secondary-label-size:           var(--button-card-font-size);

		/* ── Hero / display text ─────────────────────────────── */
		--hero-text-base:                 2.8vw;
		--hero-text-portrait:             1.4;
		--hero-text-phone:                2.271;
		--hero-text-size:                 var(--hero-text-base);

		/* ── Control chip geometry (vw, no clamp) ─────────────────── */
		--control-chip-size:              3.5vw;
		--control-chip-radius:            1.1vw;
		--control-chip-size-compact:      3.0vw;
		--control-chip-radius-compact:    0.9vw;
		--control-chip-icon-size:         1.5vw;
		--control-chip-icon-size-compact: 1.3vw;
		--action-icon-size:               1.1vw;
		--action-icon-size-sm:            0.95vw;
		--action-icon-size-lg:            1.3vw;
		--hero-icon-size:                 2.5vw;
		--hero-icon-size-compact:         2.1vw;
	}

	/* ── Breakpoint: portrait / tablet (≤1200px) ────────────────────── */
	@media (max-width: 1200px) {
		.tile-wrapper {
			--button-card-font-size:     calc(var(--button-card-font-size-base) * var(--card-portrait));
			--tile-padding-effective:    calc(var(--tile-padding-base) * var(--tile-padding-portrait));
			--hero-text-size:            calc(var(--hero-text-base)    * var(--hero-text-portrait));
			--control-chip-size:              4.9vw;
			--control-chip-radius:            1.54vw;
			--control-chip-size-compact:      4.2vw;
			--control-chip-radius-compact:    1.26vw;
			--control-chip-icon-size:         2.1vw;
			--control-chip-icon-size-compact: 1.82vw;
			--action-icon-size:               1.54vw;
			--action-icon-size-sm:            1.33vw;
			--action-icon-size-lg:            1.82vw;
			--hero-icon-size:                 3.5vw;
			--hero-icon-size-compact:         2.94vw;
		}
	}

	/* ── Breakpoint: phone (≤800px) ────────────────────────────── */
	@media (max-width: 800px) {
		.tile-wrapper {
			--button-card-font-size:     calc(var(--button-card-font-size-base) * var(--card-phone));
			--tile-padding-effective:    calc(var(--tile-padding-base) * var(--tile-padding-phone));
			--hero-text-size:            calc(var(--hero-text-base)    * var(--hero-text-phone));
			--control-chip-size:              7.95vw;
			--control-chip-radius:            2.5vw;
			--control-chip-size-compact:      6.8vw;
			--control-chip-radius-compact:    2.05vw;
			--control-chip-icon-size:         3.41vw;
			--control-chip-icon-size-compact: 2.95vw;
			--action-icon-size:               2.5vw;
			--action-icon-size-sm:            2.16vw;
			--action-icon-size-lg:            2.95vw;
			--hero-icon-size:                 5.68vw;
			--hero-icon-size-compact:         4.77vw;
		}
	}

	/* .tile-inner stays display:contents for layout passthrough */
	.tile-inner {
		display: contents;
	}

	/* In edit mode, all inner tile controls are inert so taps only select/edit
	   and never trigger entity actions. Edit handles remain active because they
	   are outside `.tile-inner`. */
	.editing .tile-inner {
		pointer-events: none;
	}

	/* Button-card tiles: wrapper padding must be 0 so BaseTile's % padding matches HA. */
	.tile-wrapper--buttoncard {
		padding: 0;
		--tile-padding-effective: 0px;
		--tile-padding: 0px;
	}

	/* HA extra_styles: `.light-color { fill: var(--light-color) }` */
	.tile-wrapper :global(svg .light-color) {
		fill: var(--light-color, var(--fg-muted));
		transition: all 0.25s ease-out;
	}

	/* ─── Active entity state (entity is on/active) ─────────────────────────── */

		.entity-active {
			/* This is the shared "on" tile surface for common control tiles only.
			   It intentionally controls the tile face, not icon/text semantic colors,
			   icon-chip fills, or icon-chip borders. */
			background: var(--tile-surface-on, var(--control-active-surface));
			opacity: var(--tile-active-opacity, 1);
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
		}

	/* Shared icon sizing — all vw-based tokens defined above. */
	:global(.icon-wrap),
	:global(.icon-sq),
	:global(.icon-badge) {
		font-size: var(--control-chip-icon-size);
	}

	:global(.power-btn),
	:global(.ctrl),
	:global(.ctrl-btn),
	:global(.action-btn),
	:global(.step-btn),
	:global(.open-btn),
	:global(.act-btn),
	:global(.adj-btn),
	:global(.skip-btn),
	:global(.install-btn),
	:global(.ap__btn),
	:global(.ap__key) {
		font-size: var(--action-icon-size);
	}

	:global(.arrow-btn),
	:global(.dpad-btn),
	:global(.step-btn) {
		font-size: var(--action-icon-size-lg);
	}

	:global(.ctrl.stop) {
		font-size: var(--action-icon-size-sm);
	}

	:global(.vac-btn),
	:global(.mow-btn),
	:global(.avatar-wrap),
	:global(.icon-bubble),
	:global(.ap__icon-wrap),
	:global(.ap__micro-icon),
	:global(.update-tile > .icon-wrap),
	:global(.icon-circle),
	:global(.lock-icon),
	:global(.siren-icon),
	:global(.fan-icon),
	:global(.mp-icon-wrap) {
		font-size: var(--hero-icon-size);
	}

	/* ─── Interactive hover/active states ────────────────────────────────────── */

	.interactive {
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.interactive:hover {
		box-shadow: var(--tile-hover-shadow, var(--tile-shadow, none));
		transform: scale(1.02);
		filter: brightness(1.1);
		z-index: 10;
	}

	.interactive:active {
		box-shadow: var(--tile-hover-shadow, var(--tile-shadow, none));
	}

	/* ─── Edit mode ─────────────────────────────────────────────────────────── */

	.editing {
		cursor: pointer;
		user-select: none;
	}

	.editing:hover {
		box-shadow: 0 0 0 2px var(--accent) !important;
	}

	/* Selected tile: strong accent ring */
	.selected {
		box-shadow: 0 0 0 2px var(--accent) !important;
		background-color: color-mix(in srgb, var(--accent) 6%, var(--surface)) !important;
	}

	/* Multi-selected: accent ring with tint */
	.multi-selected {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 70%, transparent) !important;
		background-color: color-mix(in srgb, var(--accent) 10%, var(--surface)) !important;
	}

	/* ─── Edit handles (move + resize) ───────────────────────────────────────── */

	.edit-handle {
		position: absolute;
		top: 6px;
		right: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: none;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--bg) 80%, transparent);
		color: var(--fg-subtle);
		opacity: 0;
		transition: opacity var(--transition);
		pointer-events: auto;
		z-index: 6;
		cursor: grab;
		appearance: none;
	}

	.editing:hover .edit-handle {
		opacity: 1;
	}

	.resize-handle {
		position: absolute;
		right: 6px;
		bottom: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: none;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg) 80%, transparent);
		opacity: 0;
		transition: opacity var(--transition);
		z-index: 6;
		cursor: nwse-resize;
		appearance: none;
	}

	.resize-knob {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg) 55%, transparent);
	}

	.editing:hover .resize-handle {
		opacity: 1;
	}

	/* ─── Multi-select check badge ───────────────────────────────────────────── */

	.multi-ring {
		position: absolute;
		top: 6px;
		left: 6px;
		z-index: 7;
		pointer-events: none;
	}

	.multi-check {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-fg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* ─── Unavailable overlay ───────────────────────────────────────────────── */

	.unavailable-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: color-mix(in srgb, var(--bg) 55%, transparent);
		border-radius: var(--radius);
		backdrop-filter: blur(1.5px);
		-webkit-backdrop-filter: blur(1.5px);
		pointer-events: none;
		z-index: 10;
	}

	.unavailable-label {
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--fg-muted);
		padding: 3px 9px;
		border-radius: var(--radius-sm);
		background-color: color-mix(in srgb, var(--bg) 70%, transparent);
		border: 1px solid var(--border);
	}

	/* ─── Badges ────────────────────────────────────────────────────────────── */

	.badge {
		position: absolute;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: var(--badge-color, var(--accent));
		border: 1.5px solid var(--surface);
		box-shadow: 0 1px 3px color-mix(in srgb, var(--bg) 50%, transparent);
		pointer-events: none;
		z-index: 5;
		transition: transform var(--transition);
	}

	.badge-chip {
		width: auto;
		height: auto;
		border-radius: 999px;
		padding: 2px 5px;
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.badge-state {
		font-size: 10px;
		font-weight: 500;
		line-height: 1;
		color: var(--accent-fg);
		white-space: nowrap;
	}

	/* ─── Keyboard focus ring ───────────────────────────────────────────────── */

	.tile-wrapper:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	/* ─── Ripple ────────────────────────────────────────────────────────────── */

	.ripple {
		position: absolute;
		border-radius: 50%;
		transform: translate(-50%, -50%) scale(0);
		background: color-mix(in srgb, var(--fg) 10%, transparent);
		pointer-events: none;
		animation: ripple-expand 650ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
		z-index: 8;
	}

	@keyframes ripple-expand {
		to {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0;
		}
	}

</style>
