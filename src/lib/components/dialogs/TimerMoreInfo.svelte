<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { timerService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';
	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const stateLabel = $derived((entity?.state as string | undefined) ?? 'idle');
	const remaining = $derived((entity?.attributes.remaining as string | undefined) ?? (entity?.attributes.duration as string | undefined) ?? '00:00:00');
	function run(action: 'start' | 'pause' | 'cancel') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'start') applyPatch(entityId, { state: 'active' });
			if (action === 'pause') applyPatch(entityId, { state: 'paused' });
			if (action === 'cancel') applyPatch(entityId, { state: 'idle' });
			return;
		}
		if (action === 'start') timerService.start(entityId).catch(() => {});
		if (action === 'pause') timerService.pause(entityId).catch(() => {});
		if (action === 'cancel') timerService.cancel(entityId).catch(() => {});
	}
</script>

<div class="tmi">
	<div class="tmi__hero">
		<div class="tmi__icon"><Icon name="timer" size={28} /></div>
		<div><div class="tmi__value">{remaining}</div><div class="tmi__sub">{stateLabel.replace(/_/g, ' ')}</div></div>
	</div>
	<div class="tmi__actions">
		<button class="tmi__btn" onclick={() => run('start')} disabled={isUnavail}><Icon name="play" size={16} />Start</button>
		<button class="tmi__btn" onclick={() => run('pause')} disabled={isUnavail}><Icon name="pause" size={16} />Pause</button>
		<button class="tmi__btn" onclick={() => run('cancel')} disabled={isUnavail}><Icon name="square" size={16} />Cancel</button>
	</div>
</div>

<style>
	.tmi { display:flex; flex-direction:column; }
	.tmi__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.tmi__icon { width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--accent); border:1px solid color-mix(in srgb, var(--accent) 18%, transparent); flex-shrink:0; }
	.tmi__value { font-size:1.65rem; font-weight:700; line-height:1.05; color:var(--fg); font-variant-numeric:tabular-nums; }
	.tmi__sub { margin-top:4px; font-size:0.82rem; color:var(--fg-subtle); text-transform:capitalize; }
	.tmi__actions { display:flex; gap:8px; flex-wrap:wrap; padding:16px 20px 20px; }
	.tmi__btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); color:var(--fg-muted); cursor:pointer; font:inherit; font-size:0.8rem; }
	.tmi__btn:disabled { opacity:0.4; cursor:not-allowed; }
</style>
