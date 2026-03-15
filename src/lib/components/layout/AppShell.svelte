<script lang="ts">
	// ── AppShell ──────────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { isEditing } from '$lib/stores/editMode';
	import type { Snippet } from 'svelte';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		nav: Snippet;
		header: Snippet;
		children: Snippet;
		integratedLeftNav?: boolean;
	}

	let { nav, header, children, integratedLeftNav = false }: Props = $props();

	const cfg       = $derived($dashboardStore);
	const navCfg    = $derived(cfg.nav);
	const headerCfg = $derived(cfg.header);

	const isLeftNav   = $derived(navCfg.position === 'left');
	const isTopNav    = $derived(navCfg.position === 'top');
	const isBottomNav = $derived(navCfg.position === 'bottom');

	const editing = $derived($isEditing);
	const showHeader = $derived(headerCfg.visible && (!isLeftNav || editing));
</script>

<!--
	AppShell — three layouts driven by NavConfig.position:
	  left   → sidebar on left  + header top-right + scrolling content
	  top    → full-width top bar (nav + header combined row) + scrolling content
	  bottom → scrolling content + bottom bar (mobile-style)
-->

<div
	class="ha-shell"
	style="
		--header-height: {showHeader ? headerCfg.height : 0}px;
	"
	data-nav={navCfg.position}
>
	<!-- ── Left sidebar ──────────────────────────────────────────────────── -->
	{#if isLeftNav}
		{#if !integratedLeftNav}
			<aside class="ha-shell__sidebar">
				{@render nav()}
			</aside>
		{/if}

		<div class="ha-shell__main">
			{#if showHeader}
				<div class="ha-shell__header">
					{@render header()}
				</div>
			{/if}
			<main class="ha-shell__content">
				{@render children()}
			</main>
		</div>

	<!-- ── Top nav ───────────────────────────────────────────────────────── -->
	{:else if isTopNav}
		<div class="ha-shell__topbar">
			{@render nav()}
			{#if headerCfg.visible}
				{@render header()}
			{/if}
		</div>
		<main class="ha-shell__content ha-shell__content--top">
			{@render children()}
		</main>

	<!-- ── Bottom nav ────────────────────────────────────────────────────── -->
	{:else if isBottomNav}
		{#if headerCfg.visible}
			<div class="ha-shell__header">
				{@render header()}
			</div>
		{/if}
		<main class="ha-shell__content ha-shell__content--bottom">
			{@render children()}
		</main>
		<div class="ha-shell__bottombar">
			{@render nav()}
		</div>
	{/if}
</div>

<style>
	.ha-shell {
		display: flex;
		width: 100%;
		height: 100%;
		overflow: hidden;
	/* Theme background from --theme-bg-css, with --bg as fallback. */
		background: var(--theme-bg-css, var(--bg));
		background-attachment: fixed;
		color: var(--fg);
		font-family: var(--font-family);
		font-size: var(--font-size);
	}

	/* ── Left sidebar layout ─────────────────────────────────────────────── */
	.ha-shell[data-nav='left'] {
		flex-direction: row;
	}

	.ha-shell__sidebar {
		flex-shrink: 0;
		height: 100%;
		overflow: hidden;
		transition: width var(--transition-slow);
		border-right: 1px solid var(--border-strong);
		/* Sidebar uses elevated surface for visual separation. */
		background-color: var(--surface);
		z-index: 20;
	}

	.ha-shell__main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	/* ── Header bar ──────────────────────────────────────────────────────── */
	.ha-shell__header {
		flex-shrink: 0;
		height: var(--header-height);
		overflow: hidden;
		border-bottom: 1px solid var(--border-strong);
		background-color: var(--surface);
		z-index: 10;
		transition: height var(--transition-slow) cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* ── Content area — scroll is owned by page-stage inside PageView ───── */
	.ha-shell__content {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background-color: transparent;
	}

	/* ── Top nav layout ──────────────────────────────────────────────────── */
	.ha-shell[data-nav='top'] {
		flex-direction: column;
	}

	.ha-shell__topbar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		border-bottom: 1px solid var(--border);
		/* Semi-transparent so theme gradient bleeds through */
		background-color: rgba(var(--surface-rgb), 0.75);
		backdrop-filter: blur(20px) saturate(1.2);
		-webkit-backdrop-filter: blur(20px) saturate(1.2);
		z-index: 20;
	}

	.ha-shell__content--top {
		width: 100%;
	}

	/* ── Bottom nav layout ───────────────────────────────────────────────── */
	.ha-shell[data-nav='bottom'] {
		flex-direction: column;
	}

	.ha-shell__bottombar {
		flex-shrink: 0;
		border-top: 1px solid var(--border);
		/* Semi-transparent so theme gradient bleeds through */
		background-color: rgba(var(--surface-rgb), 0.75);
		backdrop-filter: blur(20px) saturate(1.2);
		-webkit-backdrop-filter: blur(20px) saturate(1.2);
		z-index: 20;
	}

	.ha-shell__content--bottom {
		width: 100%;
	}

</style>
