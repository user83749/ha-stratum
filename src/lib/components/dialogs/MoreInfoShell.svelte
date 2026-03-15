<script module lang="ts">
	// ── MoreInfoShell (Module) ───────────────────────────────────────────────

	// ── Module State ──────────────────────────────────────────────────────────
	// Module-level counter shared across ALL MoreInfoShell instances.
	// Incremented when a blocking overlay opens, decremented when it closes.
	// body overflow is only restored when this reaches zero.
	let scrollLockCount = 0;
</script>

<script lang="ts">
	// ── MoreInfoShell ─────────────────────────────────────────────────────────
	// Unified overlay shell: modal, drawer, or docked panel.

	// ── Imports ───────────────────────────────────────────────────────────────
	import type { Snippet } from 'svelte';
	import type { MoreInfoStyle, DrawerSide } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { haptic } from '$lib/utils/haptics';
	import { dashboardStore } from '$lib/stores/dashboard';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		open:      boolean;
		onclose:   () => void;
		onback?:   () => void;
		canBack?:  boolean;
		style?:    MoreInfoStyle;  // 'modal' | 'drawer' | 'panel'
		side?:     DrawerSide;     // 'right' | 'left' | 'bottom'  (drawer only)
		title?:    string;
		variant?:  'default' | 'camera';
		children:  Snippet;
	}

	let {
		open,
		onclose,
		onback,
		canBack = false,
		style  = 'drawer',
		side   = 'right',
		title  = '',
		variant = 'default',
		children
	}: Props = $props();

	// ── Local State ───────────────────────────────────────────────────────────
	// ── Scroll Lock ───────────────────────────────────────────────────────────
	// Multiple MoreInfoShell instances may be active simultaneously (e.g. nested
	// dialogs). A plain overflow toggle would unlock the body when the first
	// one closes, even if another is still open. The counter ensures overflow
	// is only restored when the last blocking overlay closes.
	$effect(() => {
		const blocking = open && style !== 'panel';
		if (blocking) {
			scrollLockCount++;
			if (scrollLockCount === 1) document.body.style.overflow = 'hidden';
		}
		return () => {
			if (blocking) {
				scrollLockCount = Math.max(0, scrollLockCount - 1);
				if (scrollLockCount === 0) document.body.style.overflow = '';
			}
		};
	});

	// ── Open / Close Lifecycle ────────────────────────────────────────────────
	// Focus the panel when it opens.
	let panelEl = $state<HTMLElement | undefined>(undefined);
	let bodyEl = $state<HTMLDivElement | undefined>(undefined);
	let visible = $state(false);
	let closing = $state(false);
	let closeRequested = false;
	const CLOSE_MS = 280;
	$effect(() => {
		if (open && panelEl) {
			requestAnimationFrame(() => panelEl?.focus());
		}
	});

	$effect(() => {
		if (open) {
			visible = true;
			closing = false;
			return;
		}
		if (!visible) return;

		// If this close was initiated by this shell, the exit animation already ran.
		if (closeRequested) {
			closeRequested = false;
			visible = false;
			closing = false;
			dragY = 0;
			return;
		}

		// External close (store-driven): still animate out.
		closing = true;
		const id = window.setTimeout(() => {
			visible = false;
			closing = false;
			dragY = 0;
		}, CLOSE_MS);
		return () => window.clearTimeout(id);
	});

	// ── Mobile Sheet State ────────────────────────────────────────────────────
	const cfg = $derived($dashboardStore);
	const mobileBreakpoint = $derived(cfg.nav.mobileBreakpoint ?? 800);
	let isMobileSheet = $state(false);
	let dragY = $state(0);
	let dragging = $state(false);
	let dragArmed = $state(false);
	let dragStartY = 0;
	let dragStartX = 0;
	let dragLastY = 0;
	let dragStartT = 0;
	let dragPointerId: number | null = null;

	$effect(() => {
		if (typeof window === 'undefined') return;
		const breakpoint = Number.isFinite(mobileBreakpoint) ? Math.round(mobileBreakpoint) : 800;
		const mq = window.matchMedia(`(max-width: ${Math.max(320, Math.min(1280, breakpoint))}px)`);
		const apply = () => { isMobileSheet = mq.matches; };
		apply();
		mq.addEventListener?.('change', apply);
		return () => mq.removeEventListener?.('change', apply);
	});

	$effect(() => {
		// Reset any in-progress drag when the dialog closes/opens.
		if (!open) {
			dragY = 0;
			dragging = false;
		}
	});

	const isSheet = $derived(isMobileSheet && style !== 'panel');

	// ── Sheet Drag Helpers ────────────────────────────────────────────────────
	function isInteractiveTarget(target: EventTarget | null): boolean {
		if (!target) return false;
		const el = target as Element;
		// Do not treat taps/drags that start on interactive controls as sheet drags.
		// (Buttons, sliders, inputs, etc.)
		return !!el.closest(
			'button, a, input, select, textarea, [role="button"], [role="slider"], [role="switch"], [role="option"], [contenteditable="true"], [data-no-sheet-drag], [data-no-page-swipe]'
		);
	}

	function startSheetDrag(clientY: number) {
		if (!isSheet) return;
		if (dragging) return;
		dragging = true;
		dragStartY = clientY;
		dragLastY = clientY;
		dragStartT = Date.now();
	}

	function armSheetDrag(pointerId: number | null, clientX: number, clientY: number) {
		if (!isSheet) return;
		dragArmed = true;
		dragPointerId = pointerId;
		dragStartX = clientX;
		dragStartY = clientY;
		dragLastY = clientY;
		dragStartT = Date.now();
		dragY = 0;
	}

	function maybeStartFromArmed(clientX: number, clientY: number, target: EventTarget | null) {
		if (!dragArmed || dragging || !isSheet) return;

		const dx = clientX - dragStartX;
		const dy = clientY - dragStartY;
		// Require a mostly-vertical downward gesture before committing to a drag.
		// Reduced from 10→4px so natural swipes register without a long wind-up.
		if (dy < 4) return;
		if (Math.abs(dy) < Math.abs(dx) * 1.2) return;

		if (isInteractiveTarget(target)) {
			dragArmed = false;
			return;
		}

		// If the gesture started inside a scrollable region, only allow dragging
		// the sheet when that region is scrolled all the way to the top.
		const scroller = findScrollable(target);
		if (scroller && scroller.scrollTop > 0) return;

		// Commit: capture pointer so drag can continue if the pointer leaves the start target.
		if (panelEl && dragPointerId !== null) {
			panelEl.setPointerCapture?.(dragPointerId);
		}
		startSheetDrag(dragStartY);
		moveSheetDrag(clientY);
		dragArmed = false;
	}

	function moveSheetDrag(clientY: number) {
		if (!dragging || !isSheet) return;
		dragLastY = clientY;
		const dy = Math.max(0, clientY - dragStartY);
		dragY = dy;
	}

	function endSheetDrag() {
		dragArmed = false;
		dragPointerId = null;
		if (!dragging || !isSheet) return;
		dragging = false;

		const elapsed = Math.max(1, Date.now() - dragStartT);
		const velocity = (dragLastY - dragStartY) / elapsed; // px/ms

		const h = panelEl?.clientHeight ?? 1;
		const shouldClose = dragY > 90 || (dragY / h) > 0.22 || velocity > 0.65;
		if (shouldClose) {
			requestClose();
			return;
		}

		// Snap back
		dragY = 0;
	}

	function findScrollable(start: EventTarget | null): HTMLElement | null {
		if (!start || !panelEl) return null;
		let el = (start as Element | null);
		while (el && el !== panelEl) {
			if (el instanceof HTMLElement) {
				const s = getComputedStyle(el);
				const canScrollY = (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1;
				if (canScrollY) return el;
			}
			el = (el as HTMLElement).parentElement;
		}
		// Fallback to the shell body scroller
		if (bodyEl && bodyEl.scrollHeight > bodyEl.clientHeight + 1) return bodyEl;
		return null;
	}

	function canScroll(el: HTMLElement, deltaY: number): boolean {
		const max = el.scrollHeight - el.clientHeight;
		if (max <= 0) return false;
		if (deltaY < 0) return el.scrollTop > 0;
		if (deltaY > 0) return el.scrollTop < max - 1;
		return true;
	}

	function handleWheel(e: WheelEvent) {
		if (dragging) { e.preventDefault(); return; }
		// Never let wheel gestures scroll the underlying app.
		// Allow scrolling within the dialog only if the event target sits inside a scrollable container
		// and that container can scroll in the intended direction.
		const scroller = findScrollable(e.target);
		if (!scroller) {
			e.preventDefault();
			return;
		}
		if (!canScroll(scroller, e.deltaY)) {
			e.preventDefault();
		}
	}

	// ── Touch Event Wiring ────────────────────────────────────────────────────
	// Svelte's `ontouchmove` attribute registers a passive listener, which means
	// e.preventDefault() inside it is silently ignored. The browser's native
	// scroll then wins every time, preventing the sheet drag from committing.
	// Register non-passive listeners via $effect so preventDefault can take effect.
	let touchStartY = 0;

	$effect(() => {
		const el = panelEl;
		if (!el || !isSheet) return;

		const onTouchStart = (e: TouchEvent) => {
			touchStartY = e.touches[0]?.clientY ?? 0;
		};

		const onTouchMove = (e: TouchEvent) => {
			const touch = e.touches[0];
			if (!touch) return;

			// Drive drag commit from touch events too, because pointermove may stop
			// firing once the browser enters native scroll mode.
			// Since pointerdown DID fire (arming the drag), we can commit here.
			if (dragArmed && !dragging) {
				maybeStartFromArmed(touch.clientX, touch.clientY, e.target as EventTarget);
			}

			if (dragging) {
				e.preventDefault(); // works because this listener is non-passive
				moveSheetDrag(touch.clientY);
				return;
			}

			// Prevent background-app scroll from bleeding through the dialog.
			const dy = touchStartY - touch.clientY;
			const scroller = findScrollable(e.target as EventTarget);
			if (!scroller) { e.preventDefault(); return; }
			if (!canScroll(scroller, dy)) { e.preventDefault(); }
		};

		const onTouchEnd = () => endSheetDrag();

		el.addEventListener('touchstart', onTouchStart, { passive: true });
		el.addEventListener('touchmove', onTouchMove, { passive: false });
		el.addEventListener('touchend', onTouchEnd, { passive: true });

		return () => {
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchmove', onTouchMove);
			el.removeEventListener('touchend', onTouchEnd);
		};
	});

	function requestClose() {
		if (closeRequested || !visible) return;
		closeRequested = true;
		closing = true;
		dragArmed = false;
		dragging = false;

		// Slide fully out when closing as mobile sheet.
		if (isSheet) {
			const h = panelEl?.clientHeight ?? Math.round(window.innerHeight * 0.9);
			dragY = Math.max(dragY, h);
		}

		window.setTimeout(() => {
			onclose();
		}, CLOSE_MS);
	}

	function handleBackdropClick() {
		requestClose();
	}

	// ── Interaction Handlers ─────────────────────────────────────────────────
	function handleBodyInteraction(e: PointerEvent) {
		const t = e.target as Element | null;
		if (!t) return;
		const interactive = t.closest('button, a, [role="button"]');
		if (!interactive) return;
		if (interactive instanceof HTMLButtonElement && interactive.disabled) return;
		haptic('medium');
	}

	$effect(() => {
		const el = bodyEl;
		if (!el) return;
		el.addEventListener('pointerdown', handleBodyInteraction);
		return () => el.removeEventListener('pointerdown', handleBodyInteraction);
	});

	function handlePanelKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') requestClose();
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') requestClose();
	}

	// ── View Mode Flags ──────────────────────────────────────────────────────
	const isDrawer = $derived(style === 'drawer');
	const isModal  = $derived(style === 'modal');
	const isPanel  = $derived(style === 'panel');
	const isCameraDesktop = $derived(variant === 'camera' && !isSheet && !isPanel);
</script>

{#if visible}
	<!-- Backdrop (modal + drawer only) -->
	{#if !isPanel}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="moreinfo-backdrop"
			class:moreinfo-backdrop--closing={closing}
			onclick={handleBackdropClick}
			onkeydown={handleBackdropKeydown}
			onwheel={(e) => e.preventDefault()}
			ontouchmove={(e) => e.preventDefault()}
			aria-hidden="true"
		></div>
	{/if}

	<!-- Panel -->
		<div
			class="moreinfo-panel"
		class:moreinfo-panel--modal={isModal}
		class:moreinfo-panel--drawer={isDrawer}
		class:moreinfo-panel--right={isDrawer && side === 'right'}
		class:moreinfo-panel--left={isDrawer && side === 'left'}
		class:moreinfo-panel--bottom={isDrawer && side === 'bottom'}
		class:moreinfo-panel--panel={isPanel}
			class:moreinfo-panel--sheet={isSheet}
			class:moreinfo-panel--camera-desktop={isCameraDesktop}
			class:moreinfo-panel--closing={closing}
			class:moreinfo-panel--dragging={dragging}
		role="dialog"
		aria-modal={!isPanel}
		aria-label={title || 'Entity details'}
		tabindex="-1"
		onkeydown={handlePanelKeydown}
		onwheel={handleWheel}
		onpointerdown={(e) => {
			if (!isSheet) return;
			if (isInteractiveTarget(e.target)) return;
			// Do NOT capture immediately — that would suppress body scrolling.
			// touch-action: pan-y (CSS) ensures iOS delivers pointer events to us;
			// actual capture happens in maybeStartFromArmed once drag is committed.
			armSheetDrag(e.pointerId, e.clientX, e.clientY);
		}}
		onpointermove={(e) => {
			if (!isSheet) return;
			maybeStartFromArmed(e.clientX, e.clientY, e.target);
			if (!dragging) return;
			e.preventDefault();
			moveSheetDrag(e.clientY);
		}}
		onpointerup={(e) => {
			if (!isSheet) return;
			e.preventDefault();
			endSheetDrag();
		}}
		onpointercancel={(e) => {
			if (!isSheet) return;
			e.preventDefault();
			endSheetDrag();
		}}
		bind:this={panelEl}
		style={isSheet ? `--sheet-drag: ${dragY}px;` : undefined}
	>
			<!-- Header -->
			<div class="moreinfo-header">
				{#if isSheet}
					<div
						class="moreinfo-grab"
						role="presentation"
						onpointerdown={(e) => {
							e.preventDefault();
							(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
							armSheetDrag(e.pointerId, e.clientX, e.clientY);
							maybeStartFromArmed(e.clientX, e.clientY, e.target);
						}}
						onpointermove={(e) => {
							if (!dragging) return;
							e.preventDefault();
							moveSheetDrag(e.clientY);
						}}
						onpointerup={(e) => { e.preventDefault(); endSheetDrag(); }}
						onpointercancel={(e) => { e.preventDefault(); endSheetDrag(); }}
					>
						<span class="moreinfo-grab__bar" aria-hidden="true"></span>
					</div>
				{/if}
				{#if canBack && onback}
					<button
						class="moreinfo-close"
						onclick={onback}
						aria-label="Back"
						title="Back"
					>
						<Icon name="chevron-left" size={18} />
					</button>
				{/if}
				{#if !(canBack && onback)}
					<button
						class="moreinfo-close"
						onclick={requestClose}
						aria-label="Close"
					>
						<Icon name="x" size={18} />
					</button>
				{/if}
				<h2 class="moreinfo-title">{title}</h2>
			</div>

		<!-- Scrollable body -->
		<div class="moreinfo-body" bind:this={bodyEl}>
			{@render children()}
		</div>
	</div>
{/if}

<style>
	/* ── Backdrop ──────────────────────────────────────────────────────────── */
	.moreinfo-backdrop {
		position: fixed;
		inset: 0;
		z-index: 190;
		background: color-mix(in srgb, black 68%, transparent);
		cursor: pointer;
		touch-action: none;
		overscroll-behavior: none;

		animation: backdrop-in var(--transition) ease forwards;
		transition: opacity 0.2s ease;
	}
	.moreinfo-backdrop--closing { opacity: 0; }

	@starting-style {
		.moreinfo-backdrop {
			opacity: 0;
		}
	}

	@keyframes backdrop-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}

	/* ── Panel base ─────────────────────────────────────────────────────────── */
	.moreinfo-panel {
		position: fixed;
		z-index: 200;
		background: var(--bg-elevated);
		display: flex;
		flex-direction: column;
		outline: none;
		overflow: hidden;
		overscroll-behavior: contain;

		transition:
			transform 0.28s cubic-bezier(0.32, 0.72, 0, 1),
			opacity   0.2s ease;
	}
	.moreinfo-panel--closing { opacity: 0; }

	.moreinfo-panel--dragging {
		transition: none !important;
	}

	/* ── Modal variant ───────────────────────────────────────────────────────── */
	.moreinfo-panel--modal {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(400px, 95dvw);
		height: min(80dvh, 780px);
		border-radius: var(--dialog-radius, var(--radius-lg));
		border: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
	}

	@starting-style {
		.moreinfo-panel--modal {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.94);
		}
	}

	/* ── Drawer — right ─────────────────────────────────────────────────────── */
	.moreinfo-panel--drawer.moreinfo-panel--right {
		top: 0;
		right: 0;
		bottom: 0;
		width: min(440px, 100dvw);
		border-left: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		border-radius: var(--dialog-radius, var(--radius-lg)) 0 0 var(--dialog-radius, var(--radius-lg));
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--right {
			transform: translateX(100%);
		}
	}
	.moreinfo-panel--drawer.moreinfo-panel--right.moreinfo-panel--closing {
		transform: translateX(100%);
	}

	/* ── Drawer — left ──────────────────────────────────────────────────────── */
	.moreinfo-panel--drawer.moreinfo-panel--left {
		top: 0;
		left: 0;
		bottom: 0;
		width: min(440px, 100dvw);
		border-right: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		border-radius: 0 var(--dialog-radius, var(--radius-lg)) var(--dialog-radius, var(--radius-lg)) 0;
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--left {
			transform: translateX(-100%);
		}
	}
	.moreinfo-panel--drawer.moreinfo-panel--left.moreinfo-panel--closing {
		transform: translateX(-100%);
	}

	/* ── Drawer — bottom ────────────────────────────────────────────────────── */
	.moreinfo-panel--drawer.moreinfo-panel--bottom {
		left: 0;
		right: 0;
		bottom: 0;
		height: min(70dvh, 640px);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		border-radius: var(--dialog-radius, var(--radius-lg)) var(--dialog-radius, var(--radius-lg)) 0 0;
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--bottom {
			transform: translateY(100%);
		}
	}
	.moreinfo-panel--drawer.moreinfo-panel--bottom.moreinfo-panel--closing {
		transform: translateY(100%);
	}

	/* ── Mobile bottom-sheet override ───────────────────────────────────────── */
	/* Applied via the runtime `moreinfo-panel--sheet` class, which now tracks
	   the user-configured mobile breakpoint from nav settings. */
	.moreinfo-panel--sheet {
		left: 0 !important;
		right: 0 !important;
		bottom: 0 !important;
		top: auto !important;
		width: 100dvw !important;
		height: 94dvh !important;
		padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
		border-radius: var(--dialog-radius, var(--radius-lg)) var(--dialog-radius, var(--radius-lg)) 0 0 !important;
		border: none !important;
		border-top: 1px solid var(--border) !important;
		box-shadow: var(--shadow-lg) !important;
		transform: translateY(var(--sheet-drag, 0px)) !important;
		transition-duration: 0.28s;
		/* Prevent iOS from intercepting vertical swipes; we own the gesture. */
		touch-action: pan-y;
	}
	.moreinfo-panel--sheet.moreinfo-panel--closing {
		transform: translateY(calc(100% + var(--sheet-drag, 0px))) !important;
	}

	/* Keep content from stretching over the reserved bottom breathing room. */
	.moreinfo-panel--sheet .moreinfo-body {
		padding-bottom: 0;
	}
	.moreinfo-panel--sheet .moreinfo-body > :global(*) {
		min-height: auto;
	}

	@starting-style {
		.moreinfo-panel--sheet {
			transform: translateY(calc(100% + var(--sheet-drag, 0px))) !important;
		}
	}

	/* ── Docked panel ────────────────────────────────────────────────────────── */
	.moreinfo-panel--panel {
		top: 0;
		right: 0;
		bottom: 0;
		width: min(380px, 45dvw);
		border-left: 1px solid var(--border);
		background: var(--bg-elevated);
		z-index: 100; /* below header (z-index 10) + sidebar (z-index 20) peers */
	}

	/* ── Camera desktop popup variant (keeps mobile sheet unchanged) ───────── */
	.moreinfo-panel--camera-desktop {
		top: 50% !important;
		left: 50% !important;
		right: auto !important;
		bottom: auto !important;
		transform: translate(-50%, -50%) !important;
		width: min(980px, 94dvw) !important;
		height: min(74dvh, 760px) !important;
		max-height: 88dvh;
		border: 1px solid var(--border) !important;
		border-radius: var(--dialog-radius, var(--radius-lg)) !important;
		box-shadow: var(--shadow-lg) !important;
	}

	.moreinfo-panel--camera-desktop.moreinfo-panel--closing {
		transform: translate(-50%, -50%) scale(0.985) !important;
	}

	@starting-style {
		.moreinfo-panel--camera-desktop {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.96) !important;
		}
	}

	@starting-style {
		.moreinfo-panel--panel {
			transform: translateX(100%);
		}
	}
	.moreinfo-panel--panel.moreinfo-panel--closing {
		transform: translateX(100%);
	}

	/* ── Header ─────────────────────────────────────────────────────────────── */
	.moreinfo-header {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 12px;
		padding: 16px 16px 12px;
		border-bottom: none;
		flex-shrink: 0;
		position: relative;
	}

	.moreinfo-grab {
		position: absolute;
		left: 0;
		right: 0;
		top: 6px;
		height: 18px;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		touch-action: none;
		cursor: grab;
	}

	.moreinfo-grab:active { cursor: grabbing; }

	.moreinfo-grab__bar {
		width: 40px;
		height: 4px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg-muted) 38%, transparent);
	}

	.moreinfo-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--fg);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		flex: 1;
	}

	.moreinfo-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		flex-shrink: 0;
		transition: background-color var(--transition), color var(--transition);
	}
	.moreinfo-close:hover {
		background: var(--hover);
		color: var(--fg);
	}

	/* ── Body ───────────────────────────────────────────────────────────────── */
	.moreinfo-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
		display: flex;
		flex-direction: column;
	}
	.moreinfo-body > :global(*) {
		flex: 1 1 auto;
		min-height: 100%;
	}
</style>
