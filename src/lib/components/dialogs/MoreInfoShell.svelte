<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — MoreInfoShell.svelte
	// Unified overlay shell: modal, drawer, or docked panel.
	// ─────────────────────────────────────────────────────────────────────────

	import type { Snippet } from 'svelte';
	import type { MoreInfoStyle, DrawerSide } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';

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
	$effect(() => {
		if (open && panelEl) {
			requestAnimationFrame(() => panelEl?.focus());
		}
	});

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
		role="dialog"
		aria-modal={!isPanel}
		aria-label={title || 'Entity details'}
		tabindex="-1"
		onkeydown={handlePanelKeydown}
		bind:this={panelEl}
	>
			<!-- Header -->
			<div class="moreinfo-header">
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
		<div class="moreinfo-body">
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
