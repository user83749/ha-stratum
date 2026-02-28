<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore } from '$lib/stores/ui';
	import { entities } from '$lib/ha/websocket';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { HassEntity } from 'home-assistant-js-websocket';

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	const cfg    = $derived($dashboardStore);
	const search = $derived(cfg.search);
	const pages  = $derived(cfg.pages);

	let query     = $state('');
	let selected  = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	// Auto-focus input when opened
	$effect(() => {
		if (open) {
			query    = '';
			selected = 0;
			// Focus next tick
			setTimeout(() => inputEl?.focus(), 10);
		}
	});

	const DOMAIN_ICONS: Record<string, string> = {
		light: 'lightbulb', switch: 'toggle-right', sensor: 'activity',
		binary_sensor: 'radio', climate: 'thermometer', media_player: 'music',
		cover: 'chevrons-up-down', lock: 'lock', fan: 'wind', camera: 'video',
		scene: 'sparkles', script: 'play', automation: 'zap', person: 'user',
		input_boolean: 'toggle-right', input_number: 'sliders-horizontal',
		input_select: 'list', timer: 'timer', vacuum: 'circle-dot',
		weather: 'cloud-sun', alarm_control_panel: 'shield', update: 'download',
		todo: 'check-square', calendar: 'calendar',
	};

	function domainIcon(entityId: string): string {
		return DOMAIN_ICONS[getDomain(entityId)] ?? 'cpu';
	}

	interface ResultItem {
		type: 'page' | 'entity' | 'scene' | 'script' | 'automation';
		id: string;
		name: string;
		secondary: string;
		icon: string;
	}

	const results = $derived(() => {
		const q = query.toLowerCase().trim();
		const items: ResultItem[] = [];

		// Pages
		if (search.includePages) {
			for (const page of pages) {
				if (!q || page.name.toLowerCase().includes(q)) {
					items.push({ type: 'page', id: page.id, name: page.name, secondary: 'Page', icon: page.icon || 'layout-dashboard' });
				}
			}
		}

		// Entities from websocket store (HassEntities = Record<string, HassEntity>)
		const allEntities = Object.values($entities);

		for (const entity of allEntities) {
			const domain = getDomain(entity.entity_id);
			const name   = getEntityName(entity);
			const matchQ = !q || name.toLowerCase().includes(q) || entity.entity_id.toLowerCase().includes(q);
			if (!matchQ) continue;

			if (domain === 'scene' && search.includeScenes) {
				items.push({ type: 'scene', id: entity.entity_id, name, secondary: entity.entity_id, icon: 'sparkles' });
			} else if (domain === 'script' && search.includeScripts) {
				items.push({ type: 'script', id: entity.entity_id, name, secondary: entity.entity_id, icon: 'play' });
			} else if (domain === 'automation' && search.includeAutomations) {
				items.push({ type: 'automation', id: entity.entity_id, name, secondary: entity.entity_id, icon: 'zap' });
			} else if (!['scene','script','automation'].includes(domain) && search.includeEntities) {
				items.push({ type: 'entity', id: entity.entity_id, name, secondary: entity.entity_id, icon: domainIcon(entity.entity_id) });
			}
		}

		return items.slice(0, 50);
	});

	function activate(item: ResultItem) {
		if (item.type === 'page') {
			uiStore.navigateTo(item.id);
		} else {
			uiStore.openDialog(item.id);
		}
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		const list = results();
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selected = Math.min(selected + 1, list.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selected = Math.max(selected - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const item = list[selected];
			if (item) activate(item);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onclose();
		}
	}

	// Reset selection when query changes
	$effect(() => {
		query; // track
		selected = 0;
	});
</script>

{#if open}
<div
	class="cp-backdrop"
	role="presentation"
	onclick={onclose}
	onkeydown={handleKeydown}
>
	<div
		class="cp-dialog"
		role="dialog"
		aria-modal="true"
		aria-label="Search"
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<!-- Search input -->
		<div class="cp-search">
			<Icon name="search" size={16} />
			<input
				bind:this={inputEl}
				bind:value={query}
				class="cp-input"
				type="text"
				placeholder="Search pages, entities, scenes…"
				autocomplete="off"
				spellcheck="false"
				onkeydown={handleKeydown}
			/>
			{#if query}
				<button class="cp-clear" onclick={() => { query = ''; inputEl?.focus(); }} aria-label="Clear">
					<Icon name="x" size={14} />
				</button>
			{/if}
		</div>

		<!-- Results -->
		<div class="cp-results" role="listbox" aria-label="Search results">
			{#if results().length === 0}
				<div class="cp-empty">
					<Icon name="search" size={20} />
					<span>{query ? 'No results for "' + query + '"' : 'Type to search…'}</span>
				</div>
			{:else}
				{#each results() as item, i (item.id + item.type)}
					<button
						class="cp-item"
						class:cp-item--selected={i === selected}
						role="option"
						aria-selected={i === selected}
						onclick={() => activate(item)}
						onmouseenter={() => (selected = i)}
					>
						<span class="cp-item__icon">
							<Icon name={item.icon} size={16} />
						</span>
						<span class="cp-item__text">
							<span class="cp-item__name">{item.name}</span>
							<span class="cp-item__secondary">{item.secondary}</span>
						</span>
						{#if item.type === 'page'}
							<span class="cp-item__badge">Page</span>
						{/if}
					</button>
				{/each}
			{/if}
		</div>

		<!-- Footer hint -->
		<div class="cp-footer">
			<span class="cp-footer__hint"><kbd>↑↓</kbd> Navigate</span>
			<span class="cp-footer__hint"><kbd>↵</kbd> Open</span>
			<span class="cp-footer__hint"><kbd>Esc</kbd> Close</span>
		</div>
	</div>
</div>
{/if}

<style>
	.cp-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9000;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 12vh;
		background-color: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	.cp-dialog {
		width: 100%;
		max-width: 560px;
		max-height: 480px;
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;

		/* Entrance animation */
		animation: cp-in 150ms ease forwards;
	}

	@keyframes cp-in {
		from { opacity: 0; transform: scale(0.97) translateY(-8px); }
		to   { opacity: 1; transform: scale(1)    translateY(0);    }
	}

	/* ── Search row ────────────────────────────────────────────────────── */
	.cp-search {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		color: var(--fg-subtle);
		flex-shrink: 0;
	}

	.cp-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 0.9375rem;
		color: var(--fg);
		font-family: var(--font-family);
	}
	.cp-input::placeholder { color: var(--fg-subtle); }

	.cp-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-sm);
		color: var(--fg-subtle);
		flex-shrink: 0;
	}
	.cp-clear:hover { color: var(--fg); background: var(--hover); }

	/* ── Results ───────────────────────────────────────────────────────── */
	.cp-results {
		flex: 1;
		overflow-y: auto;
		padding: 6px;
		scrollbar-width: thin;
		scrollbar-color: var(--border) transparent;
	}

	.cp-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 32px 16px;
		color: var(--fg-subtle);
		font-size: 0.875rem;
	}

	.cp-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		text-align: left;
		transition: background-color var(--transition);
		border-left: 2px solid transparent;
	}
	.cp-item:hover { background: var(--hover); }
	.cp-item--selected {
		background: var(--hover);
		border-left-color: var(--accent);
	}

	.cp-item__icon {
		color: var(--fg-muted);
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.cp-item__text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.cp-item__name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--fg);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cp-item__secondary {
		font-size: 0.75rem;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.cp-item__badge {
		font-size: 0.6875rem;
		font-weight: 500;
		padding: 2px 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
		flex-shrink: 0;
	}

	/* ── Footer ────────────────────────────────────────────────────────── */
	.cp-footer {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 16px;
		border-top: 1px solid var(--border);
		flex-shrink: 0;
	}

	.cp-footer__hint {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.6875rem;
		color: var(--fg-subtle);
	}

	.cp-footer__hint kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 4px;
		font-size: 0.625rem;
		font-family: var(--font-family);
		background: var(--hover);
		border: 1px solid var(--border-strong);
		border-radius: 3px;
		color: var(--fg-muted);
	}
</style>
