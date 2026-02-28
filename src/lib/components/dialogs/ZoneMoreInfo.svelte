<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const latitude = $derived((entity?.attributes.latitude as number | undefined) ?? undefined);
	const longitude = $derived((entity?.attributes.longitude as number | undefined) ?? undefined);
	const radius = $derived((entity?.attributes.radius as number | undefined) ?? undefined);
	const passive = $derived((entity?.attributes.passive as boolean | undefined) ?? false);
	const persons = $derived((entity?.attributes.persons as string[] | undefined) ?? []);
</script>

<div class="zmi">
	<div class="zmi__hero">
		<div class="zmi__icon">
			<Icon name="map-pinned" size={24} />
		</div>
		<div class="zmi__hero-copy">
			<div class="zmi__value">{entity?.attributes.friendly_name ?? entityId}</div>
			<div class="zmi__sub">{passive ? 'Passive zone' : 'Active zone'}</div>
		</div>
	</div>

	<div class="zmi__body">
		<div class="zmi__grid">
			{#if latitude !== undefined}
				<div class="zmi__card">
					<span class="zmi__label">Latitude</span>
					<span class="zmi__metric">{latitude.toFixed(5)}</span>
				</div>
			{/if}
			{#if longitude !== undefined}
				<div class="zmi__card">
					<span class="zmi__label">Longitude</span>
					<span class="zmi__metric">{longitude.toFixed(5)}</span>
				</div>
			{/if}
			{#if radius !== undefined}
				<div class="zmi__card">
					<span class="zmi__label">Radius</span>
					<span class="zmi__metric">{radius}</span>
				</div>
			{/if}
			<div class="zmi__card">
				<span class="zmi__label">Occupants</span>
				<span class="zmi__metric">{persons.length}</span>
			</div>
		</div>
		{#if persons.length > 0}
			<div class="zmi__list">
				<div class="zmi__list-title">People in zone</div>
				{#each persons as person}
					<div class="zmi__row">{person}</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.zmi { display:flex; flex-direction:column; min-height:100%; }
	.zmi__hero { display:flex; align-items:center; gap:16px; padding:22px 20px 18px; border-bottom:1px solid var(--border); }
	.zmi__icon {
		width:56px; height:56px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center;
		background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--accent);
		border:1px solid color-mix(in srgb, var(--accent) 18%, transparent); flex-shrink:0;
	}
	.zmi__value { font-size:1.1rem; font-weight:700; color:var(--fg); }
	.zmi__sub { margin-top:4px; font-size:0.8rem; color:var(--fg-subtle); }
	.zmi__body { padding:18px 20px 20px; display:flex; flex-direction:column; gap:14px; }
	.zmi__grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
	.zmi__card { display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); }
	.zmi__label { font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--fg-subtle); }
	.zmi__metric { font-size:0.84rem; font-weight:600; color:var(--fg); word-break:break-word; }
	.zmi__list { display:flex; flex-direction:column; gap:8px; }
	.zmi__list-title { font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--fg-subtle); }
	.zmi__row { padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); font-size:0.82rem; color:var(--fg); }
</style>
