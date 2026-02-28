<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { callService } from '$lib/ha/services';
	import { getEntityName } from '$lib/ha/entities';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const memberIds = $derived((entity?.attributes.entity_id as string[] | undefined) ?? []);
	const members = $derived(memberIds.map((id) => ({ id, entity: $optimisticEntities[id] ?? null })));
	const isOn = $derived(entity?.state === 'on');
	const isUnavail = $derived(!entity || entity.state === 'unavailable' || entity.state === 'unknown');
	const isDemo = $derived(browser ? isDemoMode() : false);

	async function setGroup(nextOn: boolean) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: nextOn ? 'on' : 'off' });
			return;
		}
		try {
			await callService('homeassistant', nextOn ? 'turn_on' : 'turn_off', {}, { entity_id: entityId });
		} catch {
			// no-op
		}
	}
</script>

<div class="gmi">
	<div class="gmi__hero">
		<div class="gmi__icon" class:gmi__icon--on={isOn}>
			<Icon name="layers-3" size={24} />
		</div>
		<div class="gmi__hero-copy">
			<div class="gmi__value">{entity ? getEntityName(entity) : entityId}</div>
			<div class="gmi__sub">{isOn ? 'Active' : 'Inactive'}</div>
		</div>
	</div>

	<div class="gmi__body">
		<button class="gmi__toggle" class:gmi__toggle--on={isOn} onclick={() => setGroup(!isOn)} disabled={isUnavail}>
			<Icon name={isOn ? 'power-off' : 'power'} size={16} />
			{isOn ? 'Turn group off' : 'Turn group on'}
		</button>

		{#if members.length > 0}
			<div class="gmi__list">
				<div class="gmi__label">Members</div>
				{#each members as member (member.id)}
					<div class="gmi__row">
						<span class="gmi__member-name">{member.entity ? getEntityName(member.entity) : member.id}</span>
						<span class="gmi__member-state">{member.entity?.state ?? 'unknown'}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.gmi { display: flex; flex-direction: column; min-height: 100%; }
	.gmi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.gmi__icon {
		width: 56px;
		height: 56px;
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--fg-subtle) 10%, transparent);
		color: var(--fg-muted);
		border: 1px solid color-mix(in srgb, var(--fg-subtle) 16%, transparent);
		flex-shrink: 0;
	}
	.gmi__icon--on {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.gmi__value { font-size: 1.1rem; font-weight: 700; line-height: 1.15; color: var(--fg); }
	.gmi__sub { margin-top: 4px; font-size: 0.82rem; color: var(--fg-subtle); }
	.gmi__body { display: flex; flex-direction: column; gap: 16px; padding: 18px 20px 20px; }
	.gmi__toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font: inherit;
		font-size: 0.86rem;
		font-weight: 650;
		cursor: pointer;
	}
	.gmi__toggle--on {
		border-color: color-mix(in srgb, var(--accent) 24%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}
	.gmi__list { display: flex; flex-direction: column; gap: 8px; }
	.gmi__label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}
	.gmi__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
	}
	.gmi__member-name { font-size: 0.84rem; color: var(--fg); min-width: 0; }
	.gmi__member-state { font-size: 0.78rem; color: var(--fg-subtle); text-transform: capitalize; }
	.gmi__toggle:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
