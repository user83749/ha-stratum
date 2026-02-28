<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Section } from '$lib/types/dashboard';

	interface Props {
		open: boolean;
		section: Section | null;
		pageId: string;
		onclose: () => void;
		onDelete: () => void;
		onAddTile: () => void;
	}

	const { open, section, pageId, onclose, onDelete, onAddTile }: Props = $props();

	let title       = $state('');
	let titleSize   = $state(23); // default ~1.45rem
	let icon        = $state('');
	let gap         = $state(8);
	let columns     = $state(0);
	let collapsible = $state(false);
	let collapsed   = $state(false);

	$effect(() => {
		if (!section) return;
		title       = section.title     ?? '';
		titleSize   = section.titleSize ?? 23;
		icon        = section.icon      ?? '';
		gap         = section.grid?.gap       ?? 8;
		columns     = section.grid?.columns   ?? 0;
		collapsible = section.collapsible     ?? false;
		collapsed   = section.collapsed       ?? false;
	});

	let _saveTimer: ReturnType<typeof setTimeout> | null = null;
	function save(patch: Partial<Section>) {
		if (!section) return;
		if (_saveTimer) clearTimeout(_saveTimer);
		_saveTimer = setTimeout(() => dashboardStore.updateSection(pageId, section!.id, patch), 200);
	}

	function setGap(value: number) {
		gap = value;
		save({ grid: { ...(section?.grid ?? { baseSize: 160, gap: 8 }), gap: value } });
	}

	function setColumns(value: number) {
		columns = value;
		save({ grid: { ...(section?.grid ?? { baseSize: 160, gap: 8 }), columns: value || undefined } });
	}

	let confirmDelete = $state(false);
	function handleDelete() {
		if (!confirmDelete) { confirmDelete = true; return; }
		onDelete();
	}
</script>

{#if open && section}
	<div class="se__backdrop" onclick={onclose} aria-hidden="true"></div>

	<aside class="se" aria-label="Section editor">
		<div class="se__header">
			<button class="se__close" onclick={onclose} aria-label="Close">
				<Icon name="x" size={17} />
			</button>
			<div class="se__title">
				<Icon name="layout-panel-top" size={16} strokeWidth={1.75} />
				<span>Section</span>
			</div>
		</div>

		<div class="se__body">

			<!-- Title -->
			<div class="se__group">
				<span class="se__label">Section title</span>
				<input
					class="se__input"
					type="text"
					placeholder="Optional title"
					bind:value={title}
					oninput={() => save({ title: title || undefined })}
				/>
			</div>

			<div class="se__group">
				<div class="se__label-row">
					<span class="se__label">Title Font Size</span>
					<span class="se__val">{titleSize}px</span>
				</div>
				<div class="se__slider-row">
					<span class="se__slider-min">12</span>
					<input
						class="se__slider"
						type="range"
						min="12" max="64" step="1"
						bind:value={titleSize}
						oninput={() => save({ titleSize })}
					/>
					<span class="se__slider-max">64</span>
				</div>
			</div>

			<div class="se__group">
				<div class="se__label-row">
					<span class="se__label">Section icon</span>
					{#if icon}
						<span class="se__icon-preview" aria-hidden="true">
							<Icon name={icon} size={14} />
						</span>
					{/if}
				</div>
				<div class="se__icon-row">
					<input
						class="se__input"
						type="text"
						placeholder="Optional icon (e.g. house)"
						bind:value={icon}
						oninput={() => save({ icon: icon || undefined })}
					/>
					<button
						class="se__icon-clear"
						type="button"
						onclick={() => {
							icon = '';
							save({ icon: undefined });
						}}
						disabled={!icon}
						aria-label="Clear section icon"
					>
						<Icon name="x" size={14} />
					</button>
				</div>
			</div>

			<!-- ── TILE GAP ──────────────────────────────────────────────────── -->
			<div class="se__group">
				<div class="se__label-row">
					<span class="se__label">Section gap</span>
					<span class="se__val">{gap}px</span>
				</div>
				<div class="se__slider-row">
					<span class="se__slider-min">0</span>
					<input
						class="se__slider"
						type="range"
						min="0" max="24" step="2"
						bind:value={gap}
						oninput={() => setGap(gap)}
					/>
					<span class="se__slider-max">24</span>
				</div>
			</div>

			<!-- ── COLUMNS ───────────────────────────────────────────────────── -->
			<div class="se__group">
				<div class="se__label-row">
					<span class="se__label">Column cap</span>
					<span class="se__val">{columns === 0 ? 'Auto' : columns}</span>
				</div>
				<div class="se__slider-row">
					<span class="se__slider-min">Auto</span>
					<input
						class="se__slider"
						type="range"
						min="0" max="12" step="1"
						bind:value={columns}
						oninput={() => setColumns(columns)}
					/>
					<span class="se__slider-max">12</span>
				</div>
				<span class="se__hint">Larger screens adapt automatically up to this limit. Mobile always uses up to 4 columns.</span>
			</div>

			<!-- Collapsible -->
			<div class="se__group">
				<label class="se__check">
					<input
						type="checkbox"
						bind:checked={collapsible}
						onchange={() => save({ collapsible })}
					/>
					Collapsible section
				</label>
				{#if collapsible}
					<label class="se__check se__check--sub">
						<input
							type="checkbox"
							bind:checked={collapsed}
							onchange={() => save({ collapsed })}
						/>
						Start collapsed
					</label>
				{/if}
			</div>

			<!-- Actions -->
			<div class="se__actions">
				<button class="se__btn se__btn--add" onclick={onAddTile}>
					<Icon name="plus" size={14} strokeWidth={2} />
					Add Tile
				</button>
				<button
					class="se__btn se__btn--del"
					class:se__btn--confirm={confirmDelete}
					onclick={handleDelete}
					onblur={() => setTimeout(() => { confirmDelete = false; }, 200)}
				>
					<Icon name="trash-2" size={14} />
					{confirmDelete ? 'Confirm delete' : 'Delete section'}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	.se__backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 339;
	}
	@media (max-width: 639px) { .se__backdrop { display: block; } }

	.se {
		position: fixed;
		top: 0; right: 0; bottom: 0;
		width: min(360px, 95dvw);
		z-index: 340;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
	}
	@starting-style { .se { transform: translateX(100%); } }

	/* Header */
	.se__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.se__title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--fg);
	}
	.se__close {
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
		transition: background-color var(--transition), color var(--transition);
	}
	.se__close:hover { background: var(--hover); color: var(--fg); }

	/* Body */
	.se__body {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.se__group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}



	.se__label-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.se__label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
	}

	.se__val {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.se__icon-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
	}

	.se__icon-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
		align-items: center;
	}

	.se__icon-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: border-color var(--transition), color var(--transition), background-color var(--transition);
	}

	.se__icon-clear:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--fg);
	}

	.se__icon-clear:disabled {
		opacity: 0.45;
		cursor: default;
	}

	/* Text input */
	.se__input {
		width: 100%;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.875rem;
		box-sizing: border-box;
		transition: border-color var(--transition), background-color var(--transition);
	}
	.se__input:focus { border-color: var(--accent); outline: none; background: var(--bg-elevated); }

	/* ── Sliders ────────────────────────────────────────────────────────── */
	.se__slider-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.se__slider-min,
	.se__slider-max {
		font-size: 0.65rem;
		color: var(--fg-subtle);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		min-width: 20px;
	}

	.se__slider-max { text-align: right; }

	.se__slider {
		flex: 1;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.se__hint {
		font-size: 0.68rem;
		color: var(--fg-subtle);
		line-height: 1.4;
	}

	/* Checkbox */
	.se__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.875rem;
		color: var(--fg-muted);
		cursor: pointer;
	}
	.se__check--sub { padding-left: 20px; }
	.se__check input[type='checkbox'] {
		accent-color: var(--accent);
		cursor: pointer;
		flex-shrink: 0;
		width: 15px;
		height: 15px;
	}

	/* Actions */
	.se__actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 14px;
		border-top: 1px solid var(--border);
	}
	.se__btn {
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
		transition: background-color var(--transition), color var(--transition), border-color var(--transition);
	}
	.se__btn--add {
		background: var(--hover);
		color: var(--fg-muted);
		border-color: var(--border);
	}
	.se__btn--add:hover { background: var(--active); color: var(--fg); }
	.se__btn--del {
		background: transparent;
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
	}
	.se__btn--del:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); }
	.se__btn--confirm {
		background: var(--color-danger);
		color: var(--accent-fg);
		border-color: transparent;
	}
	.se__btn--confirm:hover { filter: brightness(1.1); }
</style>
