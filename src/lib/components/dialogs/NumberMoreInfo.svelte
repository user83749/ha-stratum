<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { getDomain } from '$lib/ha/entities';
	import { inputNumberService, numberService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const min = $derived((entity?.attributes.min as number | undefined) ?? 0);
	const max = $derived((entity?.attributes.max as number | undefined) ?? 100);
	const step = $derived((entity?.attributes.step as number | undefined) ?? 1);
	const unit = $derived((entity?.attributes.unit_of_measurement as string | undefined) ?? '');
	let localValue = $state(0);
	$effect(() => { localValue = Number(entity?.state ?? 0); });
	let debounce: ReturnType<typeof setTimeout> | null = null;
	function onInput(e: Event) {
		const next = Number((e.target as HTMLInputElement).value);
		localValue = next;
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			if (isDemo) { applyPatch(entityId, { state: String(next) }); return; }
			if (domain === 'input_number') inputNumberService.setValue(entityId, next).catch(() => {});
			else numberService.setValue(entityId, next).catch(() => {});
		}, 120);
	}
</script>

<div class="nmi">
	<div class="nmi__hero">
		<div class="nmi__icon"><Icon name="sliders-horizontal" size={26} /></div>
		<div><div class="nmi__value">{localValue}{unit}</div><div class="nmi__sub">{entityId}</div></div>
	</div>
	<div class="nmi__row" class:nmi__row--disabled={isUnavail}>
		<Icon name="gauge" size={16} />
		<input class="nmi__slider" type="range" min={min} max={max} step={step} value={localValue} oninput={onInput} disabled={isUnavail} />
		<span class="nmi__val">{localValue}{unit}</span>
	</div>
</div>

<style>
	.nmi { display:flex; flex-direction:column; }
	.nmi__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.nmi__icon { width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); color:var(--fg); border:1px solid var(--border); flex-shrink:0; }
	.nmi__value { font-size:1.75rem; font-weight:700; line-height:1.05; color:var(--fg); }
	.nmi__sub { margin-top:4px; font-size:0.72rem; color:var(--fg-subtle); font-family:monospace; }
	.nmi__row { display:flex; align-items:center; gap:12px; padding:16px 20px 20px; color:var(--fg-subtle); }
	.nmi__row--disabled { opacity:0.4; pointer-events:none; }
	.nmi__slider { flex:1; }
	.nmi__val { min-width:56px; text-align:right; color:var(--fg); }
</style>
