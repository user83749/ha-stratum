<script lang="ts">
	// ── Marquee ───────────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { onMount } from 'svelte';
	import { tick } from 'svelte';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		text: string;
		speed?: number; // px per second
		gap?: number;   // px
		class?: string;
	}

	// ── Props / Local State ───────────────────────────────────────────────────
	const { text, speed = 40, gap = 40, class: className = '' }: Props = $props();

	let container = $state<HTMLElement | null>(null);
	let content = $state<HTMLElement | null>(null);
	let shouldScroll = $state(false);
	let duration = $state(0);
	let shift = $state(0);

	// ── Actions ───────────────────────────────────────────────────────────────
	function update() {
		if (!container || !content) return;
		const containerWidth = container.clientWidth;
		const firstText = content.querySelector('.marquee-text') as HTMLElement | null;
		const textWidth = firstText ? firstText.scrollWidth : content.scrollWidth;

		// Allow a tiny threshold to avoid jitter/rounding causing "always scrolling".
		shouldScroll = textWidth - containerWidth > 1;
		shift = shouldScroll ? (textWidth + gap) : 0;
		duration = shouldScroll ? (shift / speed) : 0;
	}

	onMount(() => {
		const ro = new ResizeObserver(() => update());
		if (container) ro.observe(container);
		// Note: content might change size if fonts load etc
		if (container && container.parentElement) ro.observe(container.parentElement);
		tick().then(update);
		return () => ro.disconnect();
	});

	$effect(() => {
		text; // track text change
		tick().then(() => {
			// One more frame helps when the DOM structure changes (duplication on scroll).
			requestAnimationFrame(update);
		});
	});
</script>

<div class="marquee-container {className}" class:scrolling={shouldScroll} bind:this={container}>
	<div 
		class="marquee-content" 
		class:scrolling={shouldScroll}
		bind:this={content}
		style="--duration: {duration}s; --gap: {gap}px; --shift: {shift}px;"
	>
		<span class="marquee-text">{text}</span>
		{#if shouldScroll}
			<span class="marquee-spacer" style="width: {gap}px"></span>
			<span class="marquee-text">{text}</span>
		{/if}
	</div>
</div>

<style>
	.marquee-container {
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		position: relative;
		/* No fade when not scrolling to avoid cropping the left edge. */
		mask-image: none;
		-webkit-mask-image: none;
	}

	.marquee-container.scrolling {
		mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
		-webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
	}

	.marquee-content {
		display: inline-flex;
		width: max-content;
		min-width: 100%;
	}

	.scrolling {
		animation: marquee-scroll var(--duration) linear infinite;
	}

	@keyframes marquee-scroll {
		0% { transform: translateX(0); }
		100% { transform: translateX(calc(-1 * var(--shift))); }
	}

	.marquee-text {
		white-space: nowrap;
		display: inline-block;
	}

	.marquee-spacer {
		display: inline-block;
		flex-shrink: 0;
	}
</style>
