<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { todoService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	interface TodoItem {
		uid?: string;
		summary: string;
		status: 'needs_action' | 'completed';
		description?: string;
	}

	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const items = $derived(((entity?.attributes.items as TodoItem[] | undefined) ?? []).slice());
	const pending = $derived(items.filter((item) => item.status !== 'completed'));
	const completed = $derived(items.filter((item) => item.status === 'completed'));

	let draft = $state('');

	function patchItems(nextItems: TodoItem[]) {
		applyPatch(entityId, { attributes: { items: nextItems as unknown as Record<string, unknown> } });
	}

	function addItem() {
		const summary = draft.trim();
		if (!summary || isUnavail) return;
		draft = '';
		if (isDemo) {
			patchItems([
				...items,
				{ uid: `draft-${Date.now()}`, summary, status: 'needs_action' }
			]);
			return;
		}
		todoService.addItem(entityId, summary).catch(() => {});
	}

	function toggleItem(item: TodoItem) {
		if (isUnavail) return;
		const nextStatus = item.status === 'completed' ? 'needs_action' : 'completed';
		if (isDemo) {
			patchItems(
				items.map((entry) =>
					(entry.uid ?? entry.summary) === (item.uid ?? item.summary)
						? { ...entry, status: nextStatus }
						: entry
				)
			);
			return;
		}
		todoService.updateItem(entityId, item.summary, nextStatus).catch(() => {});
	}

	function removeItem(item: TodoItem) {
		if (isUnavail) return;
		if (isDemo) {
			patchItems(
				items.filter((entry) => (entry.uid ?? entry.summary) !== (item.uid ?? item.summary))
			);
			return;
		}
		todoService.removeItem(entityId, item.summary).catch(() => {});
	}

	function clearCompleted() {
		if (isUnavail || completed.length === 0) return;
		if (isDemo) {
			patchItems(pending);
			return;
		}
		todoService.removeCompleted(entityId).catch(() => {});
	}
</script>

<div class="tdmi">
	<div class="tdmi__hero">
		<div class="tdmi__icon"><Icon name="check-square" size={26} /></div>
		<div class="tdmi__hero-copy">
			<div class="tdmi__value">{pending.length} pending</div>
			<div class="tdmi__sub">{completed.length} completed</div>
		</div>
		{#if completed.length > 0}
			<button class="tdmi__quiet-btn" onclick={clearCompleted} disabled={isUnavail}>Clear done</button>
		{/if}
	</div>

	<div class="tdmi__list">
		{#if items.length === 0}
			<div class="tdmi__empty">No tasks right now.</div>
		{:else}
			{#each items as item, index (`${item.uid ?? item.summary}-${index}`)}
				<div class="tdmi__item" class:tdmi__item--done={item.status === 'completed'}>
					<button class="tdmi__check" onclick={() => toggleItem(item)} disabled={isUnavail} aria-label={`Toggle ${item.summary}`}>
						{#if item.status === 'completed'}
							<Icon name="check" size={14} />
						{/if}
					</button>
					<div class="tdmi__item-copy">
						<div class="tdmi__summary">{item.summary}</div>
						{#if item.description}
							<div class="tdmi__desc">{item.description}</div>
						{/if}
					</div>
					<button class="tdmi__remove" onclick={() => removeItem(item)} disabled={isUnavail} aria-label={`Remove ${item.summary}`}>
						<Icon name="x" size={14} />
					</button>
				</div>
			{/each}
		{/if}
	</div>

	<div class="tdmi__add-row">
		<input
			class="tdmi__input"
			type="text"
			placeholder="Add task"
			bind:value={draft}
			onkeydown={(event) => { if (event.key === 'Enter') addItem(); }}
			disabled={isUnavail}
		/>
		<button class="tdmi__add-btn" onclick={addItem} disabled={isUnavail || !draft.trim()}>
			<Icon name="plus" size={16} />
			Add
		</button>
	</div>
</div>

<style>
	.tdmi { display: flex; flex-direction: column; min-height: 100%; }
	.tdmi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.tdmi__icon {
		width: 56px;
		height: 56px;
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
		flex-shrink: 0;
	}
	.tdmi__hero-copy { min-width: 0; }
	.tdmi__value { font-size: 1.35rem; font-weight: 700; line-height: 1.05; color: var(--fg); }
	.tdmi__sub { margin-top: 4px; font-size: 0.78rem; color: var(--fg-subtle); }
	.tdmi__quiet-btn {
		margin-left: auto;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		border-radius: var(--radius);
		padding: 8px 12px;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.tdmi__list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 20px;
		flex: 1;
		overflow: auto;
	}
	.tdmi__empty {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		color: var(--fg-subtle);
		font-size: 0.84rem;
	}
	.tdmi__item {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--hover) 70%, transparent);
	}
	.tdmi__item--done { opacity: 0.72; }
	.tdmi__check,
	.tdmi__remove,
	.tdmi__add-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		font: inherit;
	}
	.tdmi__check {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		flex-shrink: 0;
	}
	.tdmi__item--done .tdmi__check {
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		border-color: color-mix(in srgb, var(--accent) 24%, transparent);
		color: var(--accent);
	}
	.tdmi__item-copy { flex: 1; min-width: 0; }
	.tdmi__summary { font-size: 0.88rem; font-weight: 600; color: var(--fg); line-height: 1.2; }
	.tdmi__item--done .tdmi__summary { text-decoration: line-through; color: var(--fg-muted); }
	.tdmi__desc { margin-top: 3px; font-size: 0.74rem; color: var(--fg-subtle); line-height: 1.3; }
	.tdmi__remove {
		width: 28px;
		height: 28px;
		border-radius: 9px;
		background: transparent;
	}
	.tdmi__add-row {
		display: flex;
		gap: 10px;
		padding: 0 20px 20px;
	}
	.tdmi__input {
		flex: 1;
		height: 42px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		padding: 0 12px;
		font: inherit;
	}
	.tdmi__add-btn {
		padding: 0 14px;
		font-size: 0.82rem;
		font-weight: 600;
	}
	.tdmi__check:disabled,
	.tdmi__remove:disabled,
	.tdmi__add-btn:disabled,
	.tdmi__quiet-btn:disabled,
	.tdmi__input:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
