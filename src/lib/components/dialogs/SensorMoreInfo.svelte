<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { getDomain, getEntityIcon, getEntityName, formatState } from '$lib/ha/entities';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const iconName = $derived(entity ? getEntityIcon(entity) : 'activity');
	const stateLabel = $derived(entity ? formatState(entity) : 'Unavailable');
	const unit = $derived((entity?.attributes.unit_of_measurement as string | undefined) ?? '');
	const deviceClass = $derived((entity?.attributes.device_class as string | undefined) ?? '');
	const attrs = $derived.by(() => {
		if (!entity) return [] as Array<{ key: string; label: string; value: string }>;
		const hidden = new Set([
			'friendly_name',
			'icon',
			'entity_picture',
			'unit_of_measurement',
			'device_class',
			'state_class',
			'supported_features'
		]);
		return Object.entries(entity.attributes)
			.filter(([key]) => !hidden.has(key))
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => ({
				key,
				label: key.replace(/_/g, ' '),
				value:
					value === null || value === undefined
						? '—'
						: Array.isArray(value)
							? value.join(', ')
							: typeof value === 'object'
								? JSON.stringify(value)
								: String(value)
			}));
	});
</script>

<div class="smi">
	<div class="smi__hero">
		<div class="smi__icon"><Icon name={iconName} entity={entity} size={26} /></div>
		<div class="smi__hero-copy">
			<div class="smi__value">
				{stateLabel}{#if unit}<span class="smi__unit">&thinsp;{unit}</span>{/if}
			</div>
			<div class="smi__sub">{entity ? getEntityName(entity) : entityId}</div>
		</div>
	</div>

	<div class="smi__meta">
		<div class="smi__meta-chip">
			<span class="smi__meta-label">Domain</span>
			<span class="smi__meta-value">{domain}</span>
		</div>
		{#if deviceClass}
			<div class="smi__meta-chip">
				<span class="smi__meta-label">Device class</span>
				<span class="smi__meta-value">{deviceClass}</span>
			</div>
		{/if}
	</div>

	{#if attrs.length > 0}
		<div class="smi__attrs">
			{#each attrs as row (row.key)}
				<div class="smi__attr">
					<span class="smi__attr-key">{row.label}</span>
					<span class="smi__attr-value">{row.value}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.smi { display: flex; flex-direction: column; min-height: 100%; }
	.smi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.smi__icon {
		width: 56px;
		height: 56px;
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
		flex-shrink: 0;
	}
	.smi__hero-copy { min-width: 0; }
	.smi__value { font-size: 1.15rem; font-weight: 700; line-height: 1.15; color: var(--fg); }
	.smi__unit { color: var(--fg-subtle); font-weight: 600; }
	.smi__sub {
		margin-top: 4px;
		font-size: 0.8rem;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.smi__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		padding: 16px 20px 0;
	}
	.smi__meta-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		min-width: 120px;
	}
	.smi__meta-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}
	.smi__meta-value { font-size: 0.84rem; font-weight: 600; color: var(--fg); }
	.smi__attrs {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 20px 20px;
	}
	.smi__attr {
		display: grid;
		grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
	}
	.smi__attr-key {
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--fg-subtle);
	}
	.smi__attr-value {
		font-size: 0.84rem;
		color: var(--fg);
		word-break: break-word;
	}
</style>
