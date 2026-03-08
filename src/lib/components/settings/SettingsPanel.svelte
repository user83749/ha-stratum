<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — SettingsPanel.svelte
	// Right-side drawer with tabbed settings sections.
	// ─────────────────────────────────────────────────────────────────────────

	import Icon from '$lib/components/ui/Icon.svelte';
	import ConnectionSettings from './ConnectionSettings.svelte';
	import ThemeSettings from './ThemeSettings.svelte';
	import NavSettings from './NavSettings.svelte';
	import DialogSettings from './DialogSettings.svelte';
	import KeyboardShortcuts from './KeyboardShortcuts.svelte';
	import ProfilesSettings from './ProfilesSettings.svelte';
	import ResetSettings from './ResetSettings.svelte';
	import { settingsTab } from '$lib/stores/ui';

	// ── Props ──────────────────────────────────────────────────────────────

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	const { open, onclose }: Props = $props();

	// ── Tabs ───────────────────────────────────────────────────────────────

	type TabId =
		| 'connection'
		| 'theme'
		| 'nav'
		| 'dialog'
		| 'profiles'
		| 'shortcuts'
		| 'reset';

	const TABS: { id: TabId; icon: string; label: string }[] = [
		{ id: 'connection', icon: 'plug',             label: 'Connection'   },
		{ id: 'theme',      icon: 'palette',          label: 'Appearance'   },
		{ id: 'nav',        icon: 'layout-dashboard', label: 'Navigation'   },
		{ id: 'dialog',     icon: 'panel-right',      label: 'Dialog'       },
		{ id: 'profiles',   icon: 'users',            label: 'Profiles'     },
		{ id: 'shortcuts',  icon: 'keyboard',         label: 'Shortcuts'    },
		{ id: 'reset',      icon: 'rotate-ccw',       label: 'Reset'        },
	];

	const validTabIds = new Set(TABS.map((t) => t.id));
	let activeTab = $state<TabId>('theme');
	let bodyEl = $state<HTMLDivElement | null>(null);

	// When the panel opens, jump to whichever tab was requested
	$effect(() => {
		if (open) {
			const requested = $settingsTab;
			if (requested === 'favorites') {
				activeTab = 'nav';
			} else if (requested === 'display') {
				activeTab = 'nav';
			} else if (requested === 'app') {
				activeTab = 'theme';
			} else if (requested && validTabIds.has(requested as TabId)) {
				activeTab = requested as TabId;
			}
		}
	});

	// If you scroll a tab, then switch tabs, always start at the top.
	$effect(() => {
		activeTab;
		if (!bodyEl) return;
		queueMicrotask(() => bodyEl?.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
	});

	// ── Keyboard close ─────────────────────────────────────────────────────

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function handleClose() {
		onclose();
	}

	function selectTab(tabId: TabId) {
		activeTab = tabId;
		bodyEl?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="sp__backdrop"
		onclick={handleClose}
		aria-hidden="true"
	></div>

	<!-- Panel -->
	<div class="sp" aria-label="Settings" role="dialog" aria-modal="true" tabindex="-1">

		<!-- Tab sidebar -->
		<nav class="sp__tabs" aria-label="Settings sections">
			<div class="sp__tabs-header">
				<button
					class="sp__tab sp__tab--close"
					onclick={handleClose}
					title="Close settings"
					aria-label="Close settings"
				>
					<Icon name="x" size={17} />
				</button>
				<Icon name="settings-2" size={16} />
			</div>
			{#each TABS as tab}
				<button
					class="sp__tab"
					class:sp__tab--active={activeTab === tab.id}
					onclick={() => selectTab(tab.id)}
					aria-label={tab.label}
					aria-current={activeTab === tab.id ? 'page' : undefined}
				>
					<Icon name={tab.icon} size={16} strokeWidth={1.75} />
					<span class="sp__tab-label">{tab.label}</span>
				</button>
			{/each}
			<div class="sp__tabs-spacer"></div>
		</nav>

		<!-- Content area -->
		<div class="sp__content">
			<div class="sp__content-header">
				<span class="sp__content-title">
					{TABS.find((t) => t.id === activeTab)?.label ?? 'Settings'}
				</span>
			</div>
			<div class="sp__body" bind:this={bodyEl}>
				{#if activeTab === 'connection'}
					<ConnectionSettings />
				{:else if activeTab === 'theme'}
					<ThemeSettings />
				{:else if activeTab === 'nav'}
					<NavSettings />
				{:else if activeTab === 'dialog'}
					<DialogSettings />
				{:else if activeTab === 'profiles'}
					<ProfilesSettings />
				{:else if activeTab === 'shortcuts'}
					<KeyboardShortcuts />
				{:else if activeTab === 'reset'}
					<ResetSettings />
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Backdrop ─────────────────────────────────────────────────────────── */

	.sp__backdrop {
		position: fixed;
		inset: 0;
		z-index: 359;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(1px);
	}

	/* ── Panel ────────────────────────────────────────────────────────────── */

	.sp {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(490px, 95dvw);
		z-index: 360;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: row;
		box-shadow: var(--shadow-lg);
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
		overflow: hidden;
	}

	@media (max-width: 800px) {
		.sp {
			width: min(490px, 90dvw);
		}
	}

	@starting-style {
		.sp { transform: translateX(100%); }
	}

	/* ── Tab sidebar ──────────────────────────────────────────────────────── */

	.sp__tabs {
		width: 72px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 8px 0;
		background: var(--bg);
		border-right: 1px solid var(--border);
		gap: 1px;
		overflow-y: auto;
		scrollbar-width: none;
	}

	.sp__tabs-header {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 36px;
		color: var(--fg-muted);
		margin-bottom: 6px;
		flex-shrink: 0;
	}

	.sp__tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		width: 60px;
		height: 52px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		background: transparent;
		border: none;
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition);
		flex-shrink: 0;
	}

	.sp__tab-label {
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		line-height: 1;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.sp__tab:hover {
		background: var(--hover);
		color: var(--fg);
	}

	.sp__tab--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
	}

	.sp__tab--close {
		color: var(--fg-muted);
	}

	.sp__tab--close:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
	}

	.sp__tabs-spacer {
		flex: 1;
	}

	/* ── Content ──────────────────────────────────────────────────────────── */

	.sp__content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.sp__content-header {
		padding: 14px 20px 13px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.sp__content-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--fg);
		letter-spacing: -0.01em;
	}

	.sp__body {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
</style>
