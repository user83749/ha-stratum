<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — EditFab.svelte
	// Floating Action Button (bottom-right) that toggles edit mode.
	// Also provides a Settings FAB stacked above.
	// ─────────────────────────────────────────────────────────────────────────

	import { browser } from '$app/environment';
	import { editMode, isEditing } from '$lib/stores/editMode';
	import { uiStore } from '$lib/stores/ui';
	import { isDemoMode } from '$lib/demo/index';
	import Icon from '$lib/components/ui/Icon.svelte';

	const editing = $derived($isEditing);

	let showDemoTooltip = $state(false);
	let demoTimer: ReturnType<typeof setTimeout> | null = null;

	function handleEditClick() {
		if (browser && isDemoMode()) {
			showDemoTooltip = true;
			if (demoTimer) clearTimeout(demoTimer);
			demoTimer = setTimeout(() => { showDemoTooltip = false; }, 2400);
			return;
		}
		editMode.toggle();
	}

	function handleSettingsClick() {
		uiStore.toggleSettings();
	}
</script>

<div class="fab-stack">
	<!-- Settings FAB -->
	<button
		class="fab fab--settings"
		onclick={handleSettingsClick}
		aria-label="Open settings"
		title="Settings"
	>
		<Icon name="settings" size={20} strokeWidth={1.75} />
	</button>

	<!-- Edit / Exit FAB -->
	<div class="fab-wrapper">
		{#if showDemoTooltip}
			<div class="demo-tip" role="tooltip">Not available in demo</div>
		{/if}
		<button
			class="fab fab--edit"
			class:fab--editing={editing}
			onclick={handleEditClick}
			aria-label={editing ? 'Exit edit mode' : 'Enter edit mode'}
			aria-pressed={editing}
			title={editing ? 'Exit edit mode' : 'Edit dashboard'}
		>
			{#if editing}
				<Icon name="x" size={22} strokeWidth={2} />
			{:else}
				<Icon name="pencil" size={20} strokeWidth={1.75} />
			{/if}
		</button>
	</div>
</div>

<style>
	.fab-stack {
		position: fixed;
		right: 20px;
		bottom: 20px;
		z-index: 150;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.fab-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fab {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		border: 1px solid var(--border);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-lg);
		transition:
			background-color var(--transition),
			color var(--transition),
			box-shadow var(--transition),
			transform 0.15s ease;
	}

	@starting-style {
		.fab {
			transform: scale(0.8);
			opacity: 0;
		}
	}

	.fab:hover { transform: scale(1.06); }
	.fab:active { transform: scale(0.96); }

	.fab--settings {
		background: var(--bg-elevated);
		color: var(--fg-muted);
	}
	.fab--settings:hover { background: var(--active); color: var(--fg); }

	.fab--edit {
		background: var(--bg-elevated);
		color: var(--fg-muted);
	}
	.fab--edit:hover { background: var(--active); color: var(--fg); }

	.fab--editing {
		background: var(--accent) !important;
		color: var(--accent-fg) !important;
		border-color: transparent;
		box-shadow: 0 4px 20px color-mix(in srgb, var(--accent) 45%, transparent);
	}

	/* Demo tooltip */
	.demo-tip {
		position: absolute;
		right: calc(100% + 10px);
		top: 50%;
		transform: translateY(-50%);
		white-space: nowrap;
		background: var(--bg-elevated);
		color: var(--fg);
		font-size: 0.78rem;
		font-weight: 500;
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		box-shadow: var(--shadow-lg);
		pointer-events: none;
		animation: tip-in 0.15s ease both;
	}
	.demo-tip::after {
		content: '';
		position: absolute;
		right: -5px;
		top: 50%;
		transform: translateY(-50%) rotate(45deg);
		width: 8px;
		height: 8px;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border);
		border-right: 1px solid var(--border);
	}

	@keyframes tip-in {
		from { opacity: 0; transform: translateY(-50%) translateX(6px); }
		to   { opacity: 1; transform: translateY(-50%) translateX(0); }
	}

	@media (max-width: 639px) {
		.fab-stack { display: none !important; }
	}
</style>
