<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { inputSelectService, selectService } from '$lib/ha/services';
	import { getDomain } from '$lib/ha/entities';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const domain = $derived(getDomain(entityId));
	const options = $derived((entity?.attributes.options as string[] | undefined) ?? []);
	const selected = $derived((entity?.state as string | undefined) ?? '');
	function setOption(next: string) {
		if (isUnavail) return;
		if (isDemo) { applyPatch(entityId, { state: next }); return; }
		if (domain === 'input_select') inputSelectService.selectOption(entityId, next).catch(() => {});
		else selectService.selectOption(entityId, next).catch(() => {});
	}
</script>

<div class="selmi">
	<div class="selmi__hero"><div class="selmi__value">{selected || 'No selection'}</div><div class="selmi__sub">{entityId}</div></div>
	<div class="selmi__list">
		{#each options as option (option)}
			<button class="selmi__option" class:selmi__option--active={selected === option} onclick={() => setOption(option)} disabled={isUnavail}>{option}</button>
		{/each}
	</div>
</div>

<style>
	.selmi { display:flex; flex-direction:column; }
	.selmi__hero { padding:22px 20px 16px; border-bottom:1px solid var(--border); }
	.selmi__value { font-size:1.35rem; font-weight:700; line-height:1.1; color:var(--fg); }
	.selmi__sub { margin-top:4px; font-size:0.72rem; color:var(--fg-subtle); font-family:monospace; }
	.selmi__list { display:flex; flex-direction:column; gap:8px; padding:16px 20px 20px; }
	.selmi__option { text-align:left; border:1px solid var(--border); background:transparent; color:var(--fg-muted); border-radius:var(--radius); padding:10px 12px; font:inherit; cursor:pointer; }
	.selmi__option--active { border-color:color-mix(in srgb, var(--accent) 25%, transparent); background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--fg); }
	.selmi__option:disabled { opacity:0.4; cursor:not-allowed; }
</style>
