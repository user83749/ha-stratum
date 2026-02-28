<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const above = $derived(entity?.state === 'above_horizon');
	const nextRising = $derived((entity?.attributes.next_rising as string | undefined) ?? '');
	const nextSetting = $derived((entity?.attributes.next_setting as string | undefined) ?? '');
	const elevation = $derived((entity?.attributes.elevation as number | undefined) ?? undefined);
	const azimuth = $derived((entity?.attributes.azimuth as number | undefined) ?? undefined);

	function formatDate(value: string): string {
		if (!value) return '—';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
	}
</script>

<div class="sunmi">
	<div class="sunmi__hero">
		<div class="sunmi__icon" class:sunmi__icon--day={above}>
			<Icon name={above ? 'sun' : 'moon'} size={24} />
		</div>
		<div class="sunmi__hero-copy">
			<div class="sunmi__value">{above ? 'Above horizon' : 'Below horizon'}</div>
			<div class="sunmi__sub">Sun position</div>
		</div>
	</div>

	<div class="sunmi__body">
		<div class="sunmi__grid">
			<div class="sunmi__card">
				<span class="sunmi__label">Next sunrise</span>
				<span class="sunmi__metric">{formatDate(nextRising)}</span>
			</div>
			<div class="sunmi__card">
				<span class="sunmi__label">Next sunset</span>
				<span class="sunmi__metric">{formatDate(nextSetting)}</span>
			</div>
			{#if elevation !== undefined}
				<div class="sunmi__card">
					<span class="sunmi__label">Elevation</span>
					<span class="sunmi__metric">{elevation.toFixed(1)}°</span>
				</div>
			{/if}
			{#if azimuth !== undefined}
				<div class="sunmi__card">
					<span class="sunmi__label">Azimuth</span>
					<span class="sunmi__metric">{azimuth.toFixed(1)}°</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.sunmi { display:flex; flex-direction:column; min-height:100%; }
	.sunmi__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.sunmi__icon {
		width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center;
		background: color-mix(in srgb, var(--fg-subtle) 10%, transparent); color: var(--fg-muted);
		border:1px solid color-mix(in srgb, var(--fg-subtle) 18%, transparent); flex-shrink:0;
	}
	.sunmi__icon--day {
		background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 20%, transparent);
	}
	.sunmi__value { font-size:1.1rem; font-weight:700; color:var(--fg); }
	.sunmi__sub { margin-top:4px; font-size:0.8rem; color:var(--fg-subtle); }
	.sunmi__body { padding:18px 20px 20px; }
	.sunmi__grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
	.sunmi__card { display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); }
	.sunmi__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--fg-subtle); }
	.sunmi__metric { font-size:0.84rem; font-weight:600; color:var(--fg); word-break:break-word; }
</style>
