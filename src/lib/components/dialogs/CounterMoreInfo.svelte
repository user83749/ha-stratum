<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { counterService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const value = $derived(Number(entity?.state ?? 0));
	const step = $derived(Number(entity?.attributes.step ?? 1));

	function setValue(next: number) {
		applyPatch(entityId, { state: String(next) });
	}

	function run(action: 'increment' | 'decrement' | 'reset') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'reset') setValue(0);
			if (action === 'increment') setValue(value + step);
			if (action === 'decrement') setValue(value - step);
			return;
		}
		if (action === 'increment') counterService.increment(entityId).catch(() => {});
		if (action === 'decrement') counterService.decrement(entityId).catch(() => {});
		if (action === 'reset') counterService.reset(entityId).catch(() => {});
	}
</script>

<div class="ctmi">
	<div class="ctmi__hero">
		<div class="ctmi__icon"><Icon name="hash" size={26} /></div>
		<div class="ctmi__hero-copy">
			<div class="ctmi__value">{value}</div>
			<div class="ctmi__sub">Step {step}</div>
		</div>
	</div>

	<div class="ctmi__actions">
		<button class="ctmi__btn" onclick={() => run('decrement')} disabled={isUnavail}>
			<Icon name="minus" size={16} />
			Down
		</button>
		<button class="ctmi__btn ctmi__btn--primary" onclick={() => run('increment')} disabled={isUnavail}>
			<Icon name="plus" size={16} />
			Up
		</button>
		<button class="ctmi__btn" onclick={() => run('reset')} disabled={isUnavail}>
			<Icon name="rotate-ccw" size={16} />
			Reset
		</button>
	</div>
</div>

<style>
	.ctmi { display: flex; flex-direction: column; min-height: 100%; }
	.ctmi__hero { display: flex; align-items: center; gap: 16px; padding: 22px 20px 18px; border-bottom: 1px solid var(--border); }
	.ctmi__icon {
		width: 56px; height: 56px; border-radius: var(--radius);
		display: flex; align-items: center; justify-content: center;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
		flex-shrink: 0;
	}
	.ctmi__value { font-size: 1.6rem; font-weight: 700; line-height: 1.05; color: var(--fg); font-variant-numeric: tabular-nums; }
	.ctmi__sub { margin-top: 4px; font-size: 0.8rem; color: var(--fg-subtle); }
	.ctmi__actions { display: flex; gap: 10px; flex-wrap: wrap; padding: 16px 20px 20px; }
	.ctmi__btn {
		display: inline-flex; align-items: center; gap: 6px;
		padding: 10px 14px; border-radius: var(--radius);
		border: 1px solid var(--border); background: var(--hover); color: var(--fg-muted);
		cursor: pointer; font: inherit; font-size: 0.82rem; font-weight: 600;
	}
	.ctmi__btn--primary {
		border-color: color-mix(in srgb, var(--accent) 24%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--fg);
	}
	.ctmi__btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
