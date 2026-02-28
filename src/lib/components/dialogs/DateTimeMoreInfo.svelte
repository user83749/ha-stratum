<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { inputDatetimeService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const hasDate = $derived((entity?.attributes.has_date as boolean | undefined) ?? true);
	const hasTime = $derived((entity?.attributes.has_time as boolean | undefined) ?? true);
	let localDate = $state('');
	let localTime = $state('');

	$effect(() => {
		const raw = (entity?.state as string | undefined) ?? '';
		if (!raw || raw === 'unknown' || raw === 'unavailable') {
			localDate = '';
			localTime = '';
			return;
		}
		if (raw.includes(' ')) {
			const [d, t] = raw.split(' ');
			localDate = d ?? '';
			localTime = (t ?? '').slice(0, 5);
		} else if (hasDate && !hasTime) {
			localDate = raw;
		} else if (hasTime && !hasDate) {
			localTime = raw.slice(0, 5);
		}
	});

	function save() {
		if (isUnavail) return;
		if (isDemo) {
			const nextState = hasDate && hasTime ? `${localDate} ${localTime}:00` : hasDate ? localDate : localTime;
			applyPatch(entityId, { state: nextState });
			return;
		}
		if (hasDate && hasTime) inputDatetimeService.setDatetime(entityId, `${localDate} ${localTime}:00`).catch(() => {});
		else if (hasDate) inputDatetimeService.setDate(entityId, localDate).catch(() => {});
		else if (hasTime) inputDatetimeService.setTime(entityId, localTime).catch(() => {});
	}
</script>

<div class="dtmi">
	<div class="dtmi__hero">
		<div class="dtmi__icon"><Icon name="calendar-clock" size={24} /></div>
		<div class="dtmi__hero-copy">
			<div class="dtmi__value">{entity?.state ?? 'No value'}</div>
			<div class="dtmi__sub">{entityId}</div>
		</div>
	</div>
	<div class="dtmi__body">
		{#if hasDate}
			<label class="dtmi__field"><span>Date</span><input class="dtmi__input" type="date" bind:value={localDate} disabled={isUnavail} /></label>
		{/if}
		{#if hasTime}
			<label class="dtmi__field"><span>Time</span><input class="dtmi__input" type="time" bind:value={localTime} disabled={isUnavail} /></label>
		{/if}
		<div class="dtmi__actions">
			<button class="dtmi__btn" onclick={save} disabled={isUnavail || (hasDate && !localDate) || (hasTime && !localTime)}>
				<Icon name="save" size={16} />Save
			</button>
		</div>
	</div>
</div>

<style>
	.dtmi { display:flex; flex-direction:column; min-height:100%; }
	.dtmi__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.dtmi__icon { width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--accent); border:1px solid color-mix(in srgb, var(--accent) 18%, transparent); flex-shrink:0; }
	.dtmi__hero-copy { min-width:0; }
	.dtmi__value { font-size:1rem; font-weight:650; line-height:1.25; color:var(--fg); }
	.dtmi__sub { margin-top:4px; font-size:0.75rem; color:var(--fg-subtle); font-family:monospace; }
	.dtmi__body { display:flex; flex-direction:column; gap:12px; padding:16px 20px 20px; }
	.dtmi__field { display:flex; flex-direction:column; gap:6px; font-size:0.78rem; color:var(--fg-subtle); }
	.dtmi__input { height:42px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); color:var(--fg); padding:0 12px; font:inherit; }
	.dtmi__actions { display:flex; justify-content:flex-end; }
	.dtmi__btn { display:inline-flex; align-items:center; gap:6px; padding:10px 14px; border-radius:var(--radius); border:1px solid color-mix(in srgb, var(--accent) 24%, transparent); background:color-mix(in srgb, var(--accent) 10%, transparent); color:var(--fg); cursor:pointer; font:inherit; font-size:0.82rem; font-weight:600; }
	.dtmi__btn:disabled, .dtmi__input:disabled { opacity:0.45; cursor:not-allowed; }
</style>
