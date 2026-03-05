<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { inputTextService, textService } from '$lib/ha/services';
	import { getDomain } from '$lib/ha/entities';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	let draft = $state('');

	$effect(() => {
		draft = (entity?.state as string | undefined) ?? '';
	});

	function save() {
		if (isUnavail) return;
		const value = draft;
		if (isDemo) {
			applyPatch(entityId, { state: value });
			return;
		}
		if (domain === 'input_text') inputTextService.setValue(entityId, value).catch(() => {});
		else textService.setValue(entityId, value).catch(() => {});
	}
</script>

<div class="txmi">
	<div class="txmi__hero">
		<div class="txmi__icon"><Icon name="text-cursor-input" size={24} /></div>
		<div class="txmi__hero-copy">
			<div class="txmi__value">{draft || 'Empty text'}</div>
			<div class="txmi__sub">{entityId}</div>
		</div>
	</div>

	<div class="txmi__body">
		<textarea class="txmi__input" bind:value={draft} disabled={isUnavail} rows="5"></textarea>
		<div class="txmi__actions">
			<button class="txmi__btn" onclick={save} disabled={isUnavail}>
				<Icon name="save" size={16} />
				Save
			</button>
		</div>
	</div>
</div>

<style>
	.txmi { display: flex; flex-direction: column; min-height: 100%; }
	.txmi__hero { display: flex; align-items: center; gap: 16px; padding: 22px 20px 18px; border-bottom: 1px solid var(--border); }
	.txmi__icon {
		width: 56px; height: 56px; border-radius: var(--radius);
		display: flex; align-items: center; justify-content: center;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
		flex-shrink: 0;
	}
	.txmi__hero-copy { min-width: 0; }
	.txmi__value {
		font-size: 1rem; font-weight: 650; line-height: 1.25; color: var(--fg);
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.txmi__sub { margin-top: 4px; font-size: 0.75rem; color: var(--fg-subtle); font-family: monospace; }
	.txmi__body { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px 20px; }
	.txmi__input {
		width: 100%;
		min-height: 140px;
		resize: vertical;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		padding: 12px;
		font: inherit;
		line-height: 1.45;
	}
	.txmi__actions { display: flex; justify-content: flex-end; }
	.txmi__btn {
		display: inline-flex; align-items: center; gap: 6px;
		padding: 10px 14px; border-radius: var(--radius);
		border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--fg);
		cursor: pointer; font: inherit; font-size: 0.82rem; font-weight: 600;
	}
	.txmi__btn:disabled, .txmi__input:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
