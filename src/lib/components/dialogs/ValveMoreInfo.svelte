<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { valveService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	let localPosition = $state(0);
	let dragging = $state(false);

	$effect(() => {
		if (!dragging) {
			localPosition = Math.round(Number(entity?.attributes.current_position ?? (entity?.state === 'open' ? 100 : 0)));
		}
	});

	function setPosition(next: number) {
		const clamped = Math.max(0, Math.min(100, Math.round(next)));
		localPosition = clamped;
		if (isDemo) {
			applyPatch(entityId, {
				state: clamped > 0 ? 'open' : 'closed',
				attributes: { current_position: clamped }
			});
			return;
		}
		valveService.setPosition(entityId, clamped).catch(() => {});
	}

	function run(action: 'open' | 'stop' | 'close') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'open') setPosition(100);
			if (action === 'close') setPosition(0);
			return;
		}
		if (action === 'open') valveService.open(entityId).catch(() => {});
		if (action === 'stop') valveService.stop(entityId).catch(() => {});
		if (action === 'close') valveService.close(entityId).catch(() => {});
	}
</script>

<div class="vmi2">
	<div class="vmi2__hero">
		<div class="vmi2__icon"><Icon name="droplets" size={26} /></div>
		<div>
			<div class="vmi2__value">{localPosition}% open</div>
			<div class="vmi2__sub">{entity?.state ?? 'closed'}</div>
		</div>
	</div>
	<div class="vmi2__actions">
		<button class="vmi2__btn" onclick={() => run('open')} disabled={isUnavail}><Icon name="chevrons-up" size={16} />Open</button>
		<button class="vmi2__btn" onclick={() => run('stop')} disabled={isUnavail}><Icon name="pause" size={16} />Stop</button>
		<button class="vmi2__btn" onclick={() => run('close')} disabled={isUnavail}><Icon name="chevrons-down" size={16} />Close</button>
	</div>
	<div class="vmi2__row" class:vmi2__row--disabled={isUnavail}>
		<span>Position</span>
		<input class="vmi2__range" type="range" min="0" max="100" step="1" bind:value={localPosition}
			onpointerdown={() => (dragging = true)}
			onpointerup={() => { dragging = false; setPosition(localPosition); }}
			onpointercancel={() => { dragging = false; setPosition(localPosition); }}
			oninput={() => { if (isDemo) setPosition(localPosition); }}
			disabled={isUnavail}
		/>
	</div>
</div>

<style>
	.vmi2 { display:flex; flex-direction:column; min-height:100%; }
	.vmi2__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.vmi2__icon { width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--accent); border:1px solid color-mix(in srgb, var(--accent) 18%, transparent); flex-shrink:0; }
	.vmi2__value { font-size:1.2rem; font-weight:700; line-height:1.1; color:var(--fg); }
	.vmi2__sub { margin-top:4px; font-size:0.8rem; color:var(--fg-subtle); text-transform:capitalize; }
	.vmi2__actions { display:flex; gap:10px; flex-wrap:wrap; padding:16px 20px 0; }
	.vmi2__btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); color:var(--fg-muted); cursor:pointer; font:inherit; font-size:0.8rem; }
	.vmi2__row { display:flex; align-items:center; gap:12px; padding:16px 20px 20px; color:var(--fg-subtle); }
	.vmi2__row--disabled { opacity:0.4; pointer-events:none; }
	.vmi2__range { flex:1; accent-color: var(--accent); }
</style>
