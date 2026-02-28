<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — PageEditor.svelte
	// Right-side drawer for editing page properties.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Page, PageLayout, PageTransitionType } from '$lib/types/dashboard';

	// ── Props ──────────────────────────────────────────────────────────────────

	interface Props {
		open: boolean;
		page: Page | null;
		onclose: () => void;
		onDelete: () => void;
	}

	const { open, page, onclose, onDelete }: Props = $props();

	// ── Local state ────────────────────────────────────────────────────────────

	let name       = $state('');
	let icon       = $state('');
	let layout     = $state<PageLayout>('default');
	let transition = $state<PageTransitionType>('fade');
	let bgType     = $state<'none' | 'color' | 'solid' | 'gradient' | 'image' | 'video'>('none');
	let bgValue    = $state('');
	let bgOpacity  = $state(0.15);

	// ── Sync page → state ──────────────────────────────────────────────────────

	$effect(() => {
		if (!page) return;
		name       = page.name ?? '';
		icon       = page.icon ?? '';
		layout     = page.layout ?? 'default';
		transition = page.transition ?? 'fade';
		bgType     = page.background?.type ?? 'none';
		bgValue    = page.background?.value ?? '';
		bgOpacity  = page.background?.opacity ?? 0.15;
	});

	// ── Save ───────────────────────────────────────────────────────────────────

	let _saveTimer: ReturnType<typeof setTimeout> | null = null;

	function save(patch: Partial<Page>) {
		if (!page) return;
		if (_saveTimer) clearTimeout(_saveTimer);
		_saveTimer = setTimeout(() => {
			dashboardStore.updatePage(page!.id, patch);
		}, 300);
	}

	function saveBg() {
		if (!page) return;
		save({
			background: bgType === 'none'
				? undefined
				: { type: bgType, value: bgValue, opacity: bgOpacity }
		});
	}

	const LAYOUTS: { value: PageLayout; label: string; icon: string }[] = [
		{ value: 'default', label: 'Default', icon: 'layout-grid' },
		{ value: 'full',    label: 'Full',    icon: 'maximize-2'  },
	];

	const TRANSITIONS: PageTransitionType[] = ['fade', 'slide', 'scale', 'none'];

	let confirmDelete = $state(false);

	function handleDelete() {
		if (!confirmDelete) { confirmDelete = true; return; }
		onDelete();
	}
</script>

{#if open && page}
	<div class="pe__backdrop" onclick={onclose} aria-hidden="true"></div>

	<aside class="pe" aria-label="Page editor">
		<!-- ── Header ────────────────────────────────────────────────────── -->
		<div class="pe__header">
			<button class="pe__close" onclick={onclose} aria-label="Close">
				<Icon name="x" size={17} />
			</button>
			<div class="pe__title">
				<Icon name="file" size={16} strokeWidth={1.75} />
				<span>Page</span>
			</div>
		</div>

		<!-- ── Body ──────────────────────────────────────────────────────── -->
		<div class="pe__body">

			<!-- Name -->
			<div class="pe__group">
				<span class="pe__label">Name</span>
				<input
					class="pe__input"
					type="text"
					placeholder="Page name"
					bind:value={name}
					oninput={() => save({ name: name || 'Untitled' })}
				/>
			</div>

			<!-- Icon -->
			<div class="pe__group">
				<span class="pe__label">Icon</span>
				<input
					class="pe__input"
					type="text"
					placeholder="e.g. home"
					bind:value={icon}
					oninput={() => save({ icon: icon || undefined })}
				/>
			</div>

			<!-- Layout -->
			<div class="pe__group">
				<span class="pe__label">Layout</span>
				<div class="pe__pills">
					{#each LAYOUTS as lay}
						<button
							class="pe__pill"
							class:pe__pill--active={layout === lay.value}
							onclick={() => { layout = lay.value; save({ layout: lay.value }); }}
						>
							<Icon name={lay.icon} size={13} strokeWidth={1.5} />
							{lay.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Transition -->
			<div class="pe__group">
				<span class="pe__label">Transition</span>
				<div class="pe__pills pe__pills--wrap">
					{#each TRANSITIONS as t}
						<button
							class="pe__pill"
							class:pe__pill--active={transition === t}
							onclick={() => { transition = t; save({ transition: t }); }}
						>
							{t}
						</button>
					{/each}
				</div>
			</div>

			<!-- Background -->
			<div class="pe__group">
				<span class="pe__label">Background</span>
				<div class="pe__pills pe__pills--wrap">
					{#each ['none','color','gradient','image'] as bt}
						<button
							class="pe__pill"
							class:pe__pill--active={bgType === bt}
							onclick={() => { bgType = bt as 'none' | 'color' | 'solid' | 'gradient' | 'image' | 'video'; saveBg(); }}
						>
							{bt}
						</button>
					{/each}
				</div>

				{#if bgType === 'color'}
					<div class="pe__row" style="margin-top:8px">
						<input
							class="pe__color-swatch"
							type="color"
							bind:value={bgValue}
							oninput={saveBg}
						/>
						<input
							class="pe__input"
							type="text"
							placeholder="#000000"
							bind:value={bgValue}
							oninput={saveBg}
						/>
					</div>
				{:else if bgType === 'gradient'}
					<input
						class="pe__input"
						type="text"
						placeholder="linear-gradient(135deg, #667eea, #764ba2)"
						bind:value={bgValue}
						oninput={saveBg}
						style="margin-top:8px"
					/>
				{:else if bgType === 'image'}
					<input
						class="pe__input"
						type="url"
						placeholder="https://…"
						bind:value={bgValue}
						oninput={saveBg}
						style="margin-top:8px"
					/>
				{/if}

				{#if bgType !== 'none'}
					<span class="pe__label" style="margin-top:8px">
						Opacity: {Math.round(bgOpacity * 100)}%
					</span>
					<input
						class="pe__range"
						type="range"
						min="0" max="1" step="0.01"
						bind:value={bgOpacity}
						oninput={saveBg}
					/>
				{/if}
			</div>

			<!-- ── Actions ────────────────────────────────────────────────── -->
			<div class="pe__actions">
				<button
					class="pe__btn pe__btn--danger"
					class:pe__btn--confirm={confirmDelete}
					onclick={handleDelete}
					onblur={() => (confirmDelete = false)}
				>
					<Icon name="trash-2" size={14} />
					{confirmDelete ? 'Confirm delete' : 'Delete page'}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	/* ── Backdrop ─────────────────────────────────────────────────────────── */

	.pe__backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 329;
		background: transparent;
	}

	@media (max-width: 639px) {
		.pe__backdrop { display: block; }
	}

	/* ── Panel ────────────────────────────────────────────────────────────── */

	.pe {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(360px, 95dvw);
		z-index: 330;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
	}

	@starting-style {
		.pe { transform: translateX(100%); }
	}

	/* ── Header ───────────────────────────────────────────────────────────── */

	.pe__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.pe__title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--fg);
	}

	.pe__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		color: var(--fg-muted);
		cursor: pointer;
		border: none;
		background: transparent;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.pe__close:hover { background: var(--hover); color: var(--fg); }

	/* ── Body ─────────────────────────────────────────────────────────────── */

	.pe__body {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* ── Group ────────────────────────────────────────────────────────────── */

	.pe__group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* ── Label ────────────────────────────────────────────────────────────── */

	.pe__label {
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	/* ── Inputs ───────────────────────────────────────────────────────────── */

	.pe__input {
		width: 100%;
		padding: 7px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		box-sizing: border-box;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.pe__input:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}

	.pe__row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.pe__color-swatch {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		padding: 2px;
		cursor: pointer;
		background: none;
		flex-shrink: 0;
	}

	.pe__range {
		width: 100%;
		accent-color: var(--accent);
		cursor: pointer;
	}

	/* ── Pills ────────────────────────────────────────────────────────────── */

	.pe__pills {
		display: flex;
		gap: 4px;
	}

	.pe__pills--wrap { flex-wrap: wrap; }

	.pe__pill {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 7px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.77rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.pe__pill:hover { color: var(--fg); }

	.pe__pill--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
	}

	/* ── Actions ──────────────────────────────────────────────────────────── */

	.pe__actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
		padding-top: 14px;
		border-top: 1px solid var(--border);
	}

	.pe__btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 36px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		font-size: 0.84rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--transition),
			color var(--transition),
			border-color var(--transition);
	}

	.pe__btn--danger {
		background: transparent;
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
	}
	.pe__btn--danger:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
	}

	.pe__btn--confirm {
		background: var(--color-danger);
		color: var(--accent-fg);
		border-color: transparent;
	}
	.pe__btn--confirm:hover { filter: brightness(1.1); }
</style>
