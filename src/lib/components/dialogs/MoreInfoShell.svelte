<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — MoreInfoShell.svelte
	// Unified overlay shell: modal, drawer, or docked panel.
	// ─────────────────────────────────────────────────────────────────────────

	import type { Snippet } from 'svelte';
	import type { MoreInfoStyle, DrawerSide } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { onMount } from 'svelte';

	interface Props {
		open:      boolean;
		onclose:   () => void;
		onback?:   () => void;
		canBack?:  boolean;
		style?:    MoreInfoStyle;  // 'modal' | 'drawer' | 'panel'
		side?:     DrawerSide;     // 'right' | 'left' | 'bottom'  (drawer only)
		title?:    string;
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
			children
		}: Props = $props();

	// Lock body scroll when open (modal/drawer only — panel is non-blocking)
	$effect(() => {
		if (open && style !== 'panel') {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => { document.body.style.overflow = ''; };
	});

	// Focus the panel when it opens
	let panelEl = $state<HTMLElement | undefined>(undefined);
	let bodyEl = $state<HTMLDivElement | undefined>(undefined);
	$effect(() => {
		if (open && panelEl) {
			requestAnimationFrame(() => panelEl?.focus());
		}
	});

	// Mobile bottom-sheet behaviour
	let isMobileSheet = $state(false);
	let dragY = $state(0);
	let dragging = $state(false);
	let dragArmed = $state(false);
	let dragStartY = 0;
	let dragStartX = 0;
	let dragLastY = 0;
	let dragStartT = 0;
	let dragPointerId: number | null = null;

	onMount(() => {
		const mq = window.matchMedia('(max-width: 800px)');
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

	function isInteractiveTarget(target: EventTarget | null): boolean {
		if (!target) return false;
		const el = target as Element;
		// Do not treat taps/drags that start on interactive controls as sheet drags.
		// (Buttons, sliders, inputs, etc.)
		return !!el.closest(
			'button, a, input, select, textarea, [role="button"], [role="slider"], [contenteditable="true"], [data-no-sheet-drag]'
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
		// Require a mostly-vertical downward gesture before we grab the sheet.
		if (dy < 10) return;
		if (Math.abs(dy) < Math.abs(dx) * 1.2) return;

		if (isInteractiveTarget(target)) {
			dragArmed = false;
			return;
		}

		// If the gesture started inside a scrollable region, only allow dragging
		// the sheet when that region is scrolled all the way to the top.
		const scroller = findScrollable(target);
		if (scroller && scroller.scrollTop > 0) return;

		// Start sheet drag and capture pointer so the drag continues even if the
		// finger leaves the original element.
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
			onclose();
			dragY = 0;
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

	let touchStartY = 0;
	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0]?.clientY ?? 0;
	}

	function handleTouchMove(e: TouchEvent) {
		if (dragging) { e.preventDefault(); return; }
		const y = e.touches[0]?.clientY ?? touchStartY;
		const dy = touchStartY - y; // +dy means user is trying to scroll down
		const scroller = findScrollable(e.target);
		if (!scroller) {
			e.preventDefault();
			return;
		}
		if (!canScroll(scroller, dy)) {
			e.preventDefault();
		}
	}

	function handleBackdropClick() {
		onclose();
	}

	function handlePanelKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') onclose();
	}

	const isDrawer = $derived(style === 'drawer');
	const isModal  = $derived(style === 'modal');
	const isPanel  = $derived(style === 'panel');
</script>

{#if open}
	<!-- Backdrop (modal + drawer only) -->
	{#if !isPanel}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="moreinfo-backdrop"
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
		class:moreinfo-panel--dragging={dragging}
		role="dialog"
		aria-modal={!isPanel}
		aria-label={title || 'Entity details'}
		tabindex="-1"
		onkeydown={handlePanelKeydown}
		onwheel={handleWheel}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		onpointerdown={(e) => {
			if (!isSheet) return;
			if (isInteractiveTarget(e.target)) return;
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
				<button
					class="moreinfo-close"
					onclick={onclose}
					aria-label="Close"
				>
					<Icon name="x" size={18} />
				</button>
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
	}

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
		border-radius: var(--radius-lg);
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
		border-radius: var(--radius-lg) 0 0 var(--radius-lg);
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--right {
			transform: translateX(100%);
		}
	}

	/* ── Drawer — left ──────────────────────────────────────────────────────── */
	.moreinfo-panel--drawer.moreinfo-panel--left {
		top: 0;
		left: 0;
		bottom: 0;
		width: min(440px, 100dvw);
		border-right: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--left {
			transform: translateX(-100%);
		}
	}

	/* ── Drawer — bottom ────────────────────────────────────────────────────── */
	.moreinfo-panel--drawer.moreinfo-panel--bottom {
		left: 0;
		right: 0;
		bottom: 0;
		height: min(70dvh, 640px);
		border-top: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}

	@starting-style {
		.moreinfo-panel--drawer.moreinfo-panel--bottom {
			transform: translateY(100%);
		}
	}

	/* ── Mobile bottom-sheet override ───────────────────────────────────────── */
	@media (max-width: 800px) {
		.moreinfo-panel--sheet {
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
			top: auto !important;
			width: 100dvw !important;
			height: var(--stratum-sheet-h, 94dvh) !important;
			padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
			border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
			border: none !important;
			border-top: 1px solid var(--border) !important;
			box-shadow: var(--shadow-lg) !important;
			transform: translateY(var(--sheet-drag, 0px)) !important;
			transition-duration: 0.22s;
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

	@starting-style {
		.moreinfo-panel--panel {
			transform: translateX(100%);
		}
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
