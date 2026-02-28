<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		text: string;
		side?: 'top' | 'bottom' | 'left' | 'right';
		/** Delay in ms before showing. Default 400. */
		delay?: number;
		/** Disabled — never shows tooltip. */
		disabled?: boolean;
		children: Snippet;
	}

	let {
		text,
		side = 'top',
		delay = 400,
		disabled = false,
		children
	}: Props = $props();

	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function show() {
		if (disabled || !text) return;
		timer = setTimeout(() => (visible = true), delay);
	}

	function hide() {
		if (timer) { clearTimeout(timer); timer = null; }
		visible = false;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="tooltip-host"
	onmouseenter={show}
	onmouseleave={hide}
	onfocus={show}
	onblur={hide}
>
	{@render children()}

	{#if visible}
		<span class="tooltip" data-side={side} role="tooltip">
			{text}
		</span>
	{/if}
</span>

<style>
	.tooltip-host {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.tooltip {
		position: absolute;
		z-index: 200;
		white-space: nowrap;
		pointer-events: none;

		padding: 5px 10px;
		border-radius: var(--radius-sm);
		background-color: color-mix(in srgb, var(--bg-elevated) 95%, var(--fg) 5%);
		border: 1px solid var(--border-strong);
		color: var(--fg-muted);
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		line-height: 1;
		box-shadow: var(--shadow-lg);

		animation: tooltip-in 120ms ease forwards;
	}

	/* ── Positioning by side ─────────────────────────────────────────────── */

	.tooltip[data-side='top'] {
		bottom: calc(100% + 7px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip[data-side='bottom'] {
		top: calc(100% + 7px);
		left: 50%;
		transform: translateX(-50%);
	}

	.tooltip[data-side='left'] {
		right: calc(100% + 7px);
		top: 50%;
		transform: translateY(-50%);
	}

	.tooltip[data-side='right'] {
		left: calc(100% + 7px);
		top: 50%;
		transform: translateY(-50%);
	}

	@keyframes tooltip-in {
		from { opacity: 0; scale: 0.94; }
		to   { opacity: 1; scale: 1; }
	}
</style>
