<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import { isEditing, editSelection, multiSelection, editMode } from '$lib/stores/editMode';
	import { isUnavailable, isActive } from '$lib/ha/entities';
	import { entities } from '$lib/ha/websocket';
	import { handleAction } from '$lib/ha/services';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import Icon from '$lib/components/ui/Icon.svelte';

	// ─── Props ───────────────────────────────────────────────────────────────

	interface Props {
		tile:       Tile;
		entity?:    HassEntity | null;
		pageId?:    string;
		sectionId?: string;
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

	const entityActive = $derived(entity ? isActive(entity) : false);
	const entityDomain = $derived(entity?.entity_id?.split('.')[0] ?? tile.entity_id?.split('.')[0] ?? '');
	const useSharedActiveSurface = $derived.by(() => {
		// Shared active background only for the common control-style tiles.
		// Specialized tiles (weather, graph-backed tiles, climate, and
		// sensor-style entity tiles) own their visual treatment and should not
		// inherit this shared gray "on" surface.
		if (!entityActive) return false;
		if (['weather', 'history', 'gauge', 'statistic', 'climate'].includes(tile.type)) return false;
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

	let holdTimer:    ReturnType<typeof setTimeout> | null = $state(null);
	let tapTimer:     ReturnType<typeof setTimeout> | null = $state(null);
	let didHold       = $state(false);
	let pointerDownAt = $state(0);
	let clickCount    = $state(0);

	const HOLD_THRESHOLD_MS = 500;
	const DBL_TAP_WINDOW_MS = 300;

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

		await handleAction(action, tile.entity_id ?? entity?.entity_id);
	}

	/** Returns true if the event originated from an interactive child element (button, input, etc). */
	function isInteractiveTarget(e: PointerEvent | MouseEvent): boolean {
		let t = e.target as Element | null;
		if (t && t.nodeType === 3) t = t.parentElement;
		if (!t || !t.closest) return false;
		const match = t.closest('button, input, select, textarea, a, [role="button"], [role="slider"], [role="checkbox"], [role="switch"], [role="listbox"], [role="option"]');
		return !!match && match !== e.currentTarget;
	}

	function onPointerDown(e: PointerEvent) {
		if (editing) { handleEditClick(e as unknown as MouseEvent); return; }
		if (e.button !== 0) return;
		
		// Suppress tile-level actions when clicking a child control.
		if (isInteractiveTarget(e)) return;

		// Show ripple only for actual touches on the tile surface.
		spawnRipple(e);

		didHold = false;
		pointerDownAt = Date.now();

		holdTimer = setTimeout(() => {
			didHold = true;
			holdTimer = null;
			clickCount = 0;
			fireAction('hold');
		}, HOLD_THRESHOLD_MS);
	}

	function onPointerUp(e: PointerEvent) {
		if (editing) return;
		if (isInteractiveTarget(e)) return;

		const elapsed = Date.now() - pointerDownAt;
		if (didHold || elapsed >= HOLD_THRESHOLD_MS) { clearHold(); didHold = false; return; }

		clearHold();
		didHold = false;

		if (!hasDblTap) {
			// No double-tap configured — fire tap immediately
			fireAction('tap');
			return;
		}

		// Double-tap is handled by onDoubleClick (native dblclick event).
		// Here we just fire the tap after the double-tap window if no second click comes.
		clickCount++;
		if (clickCount === 1) {
			tapTimer = setTimeout(() => {
				tapTimer = null;
				clickCount = 0;
				fireAction('tap');
			}, DBL_TAP_WINDOW_MS);
		} else {
			// onDoubleClick will handle this — reset clickCount
			clickCount = 0;
		}
	}

	function onPointerLeave() {
		if (editing) return;
		clearHold();
		didHold = false;
	}

	// Native dblclick bubbles up even from child buttons/inputs — guard against that.
	function onDoubleClick(e: MouseEvent) {
		if (editing) return;
		if (!hasDblTap) return;
		if (isInteractiveTarget(e)) return;
		clearTapTimer();
		clickCount = 0;
		fireAction('double_tap');
	}

	// (Variant system removed — styling is driven system-wide by the theme)

	// ─── Interactive: any non-'none' tap_action counts ───────────────────────

	const resolvedTapAction = $derived(
		tile.config.tap_action ?? tileDefaults?.tap_action
	);

	const isInteractive = $derived(
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
	class:entity-active={useSharedActiveSurface}
	role={isInteractive ? 'button' : undefined}
	tabindex={isInteractive ? 0 : undefined}
	onpointerdown={onPointerDown}
	onpointerup={onPointerUp}
	onpointerleave={onPointerLeave}
	ondblclick={onDoubleClick}
	onkeydown={(e) => {
		if (editing) return;
		if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			fireAction('tap');
		}
	}}
>
	<!-- Tile content slot -->
	{@render children()}

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
		padding: var(--tile-padding);
		border-radius: var(--radius);
		transition:
			box-shadow var(--transition),
			background-color var(--transition),
			border-color var(--transition),
			opacity var(--transition);
		overflow: hidden;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		/* Container queries — tiles query their own rendered size, not the viewport */
		container-type: size;
		container-name: tile;
	}

	@container tile (max-width: 119px) {
		.tile-wrapper {
			padding: calc(var(--tile-padding) / 2);
		}
	}

	@container tile (max-width: 80px) {
		.tile-wrapper {
			padding: calc(var(--tile-padding) / 3);
		}
	}

	/* ─── Theme-driven card style ──────────────────────────────────────────── */
	/* All visual styling comes from CSS vars set by applyTheme():
	   --tile-bg, --tile-border, --tile-shadow, --tile-backdrop              */

	.tile-wrapper {
		/* Shared control-tile on-state face. Reuse this in control tile components
		   when they need their own root background while active.
		   This variable changes the outer tile face only. */
		--control-active-surface: rgba(224, 227, 231, 0.97);
		/* Shared control-tile label typography. Use these instead of one-off
		   component font values when a tile wants the same label styling as the
		   standard entity/control tiles. */
		--control-label-size: 0.85rem;
		--control-label-weight: 800;
		--control-label-line-height: 1.15;
		/* Shared rounded-square control chip metrics for the generic control
		   buttons used by entity/timer/lock-style tiles. */
		--control-chip-size: 42px;
		--control-chip-radius: 12px;
		--control-chip-size-compact: 38px;
		--control-chip-radius-compact: 10px;
		--control-chip-border-width: 1.5px;
		--control-chip-fill-strength: 18%;
		--control-chip-border-strength: 35%;
		/* Shared icon size inside the standard chip wrappers (`.icon-wrap`,
		   `.icon-sq`, `.icon-badge`). This prevents per-tile hard-coded icon
		   sizes from drifting when users pick different icons. */
		--control-chip-icon-size: 20px;
		--control-chip-icon-size-compact: 18px;
		/* Shared action-button icon roles. These cover the common small icons
		   inside power/step/control buttons across tiles. */
		--action-icon-size: 14px;
		--action-icon-size-sm: 12px;
		--action-icon-size-lg: 16px;
		/* Shared hero/display icon roles for large, decorative icon wrappers. */
		--hero-icon-size: 32px;
		--hero-icon-size-compact: 28px;
		/* Shared active label colors for control tiles. These change text only. */
		--control-active-name: #4e5458;
		--control-active-state: var(--control-active-name);
		background: rgba(115, 115, 115, 0.25);
		border: var(--tile-border, 1px solid var(--border));
		box-shadow: var(--tile-shadow, none);
		backdrop-filter: var(--tile-backdrop, none);
		-webkit-backdrop-filter: var(--tile-backdrop, none);
		transition: box-shadow 0.2s ease, background 0.2s ease;
	}

	/* ─── Active entity state (entity is on/active) ─────────────────────────── */

	.entity-active {
		/* This is the shared "on" tile surface for common control tiles only.
		   It intentionally controls the tile face, not icon/text semantic colors,
		   icon-chip fills, or icon-chip borders. */
		background: var(--control-active-surface);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
	}

	/* Shared icon sizing for the standard chip wrappers. The wrapper defines the
	   role size via font-size; Icon.svelte inherits that automatically when no
	   explicit size prop is passed. */
	:global(.icon-wrap),
	:global(.icon-sq),
	:global(.icon-badge) {
		font-size: var(--control-chip-icon-size);
	}

	@container tile (max-width: 140px) {
		:global(.icon-wrap),
		:global(.icon-sq),
		:global(.icon-badge) {
			font-size: var(--control-chip-icon-size-compact);
		}
	}

	/* Shared small action-button icon sizing. These wrappers define the UI role,
	   so the icon name should not change the rendered size. */
	:global(.power-btn),
	:global(.ctrl),
	:global(.ctrl-btn),
	:global(.action-btn),
	:global(.step-btn),
	:global(.arrow-btn),
	:global(.open-btn),
	:global(.act-btn),
	:global(.adj-btn),
	:global(.skip-btn),
	:global(.dpad-btn),
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

	/* Shared hero/display icon sizing. These are intentionally separate from
	   chip icons because they are primary visual elements, not control chips. */
	:global(.vac-btn),
	:global(.mow-btn),
	:global(.avatar-wrap),
	:global(.icon-bubble),
	:global(.ap__icon-wrap),
	:global(.ap__micro-icon),
	:global(.update-tile > .icon-wrap) {
		font-size: var(--hero-icon-size);
	}

	@container tile (max-width: 140px) {
		:global(.vac-btn),
		:global(.mow-btn),
		:global(.avatar-wrap),
		:global(.icon-bubble),
		:global(.ap__icon-wrap),
		:global(.ap__micro-icon),
		:global(.update-tile > .icon-wrap) {
			font-size: var(--hero-icon-size-compact);
		}
	}

	/* ─── Interactive hover/active states ────────────────────────────────────── */

	.interactive {
		cursor: pointer;
		user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	.interactive:hover {
		box-shadow: var(--tile-hover-shadow, var(--tile-shadow, none));
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
		font-weight: 600;
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
		font-weight: 600;
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

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    :global(.hue-icon-wrap) { width: 38px !important; height: 38px !important; }
    :global(.vac-btn), :global(.fan-btn), :global(.icon-badge), :global(.power-btn), :global(.avatar-wrap) { width: 44px !important; height: 44px !important; }
    :global(.bottom) { gap: 0px !important; }
    :global(.tile-content) { padding-bottom: 2px !important; }
  }


  .name-text {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .state-text {
    line-height: 1.15;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
