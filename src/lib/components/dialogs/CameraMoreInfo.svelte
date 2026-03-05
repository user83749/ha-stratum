<script lang="ts">
	import { optimisticEntities } from '$lib/ha/optimistic';
	import Icon from '$lib/components/ui/Icon.svelte';
	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const imageUrl = $derived((entity?.attributes.entity_picture as string | undefined) ?? '');
	const accessToken = $derived(entity?.attributes.access_token as string | undefined);
	const src = $derived(imageUrl ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}_ts=${Date.now()}${accessToken ? `&token=${accessToken}` : ''}` : '');
</script>

<div class="cammi">
	<div class="cammi__header">
		<div class="cammi__icon"><Icon name="camera" size={22} /></div>
		<div class="cammi__state">{(entity?.state as string | undefined) ?? 'unknown'}</div>
	</div>
	{#if imageUrl}
		<img class="cammi__image" src={src} alt="Camera feed" />
	{:else}
		<div class="cammi__empty">
			<Icon name="image-off" size={24} />
			<span>No camera preview available</span>
		</div>
	{/if}
</div>

<style>
	.cammi { display:flex; flex-direction:column; gap:12px; padding:18px; }
	.cammi__header { display:flex; align-items:center; gap:10px; color:var(--fg-subtle); }
	.cammi__icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); }
	.cammi__state { font-size:0.84rem; text-transform:capitalize; }
	.cammi__image { width:100%; aspect-ratio:16 / 9; object-fit:cover; border-radius:var(--radius); border:1px solid var(--border); background:var(--hover); }
	.cammi__empty { width:100%; aspect-ratio:16 / 9; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border-radius:var(--radius); border:1px dashed var(--border); color:var(--fg-subtle); }
</style>
