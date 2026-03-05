<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { callService } from '$lib/ha/services';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const name = $derived(entity ? getEntityName(entity) : entityId);
	const isOn = $derived(entity?.state === 'on');
	const isUnavail = $derived(!entity || entity.state === 'unavailable' || entity.state === 'unknown');
	const isDemo = $derived(browser ? isDemoMode() : false);

	async function setState(nextOn: boolean) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: nextOn ? 'on' : 'off' });
			return;
		}
		try {
			await callService(domain, nextOn ? 'turn_on' : 'turn_off', {}, { entity_id: entityId });
		} catch {
			// no-op
		}
	}
</script>

<div class="swi">
	<div class="swi__hero">
		<div class="swi__icon" class:swi__icon--on={isOn}>
			<Icon name={domain === 'input_boolean' ? 'toggle-right' : 'power'} size={24} />
		</div>
		<div class="swi__hero-copy">
			<div class="swi__value">{name}</div>
			<div class="swi__sub">{isOn ? 'On' : 'Off'}</div>
		</div>
	</div>

	<div class="swi__body">
		<button class="swi__toggle" class:swi__toggle--on={isOn} onclick={() => setState(!isOn)} disabled={isUnavail}>
			<span class="swi__toggle-label">{isOn ? 'Turn Off' : 'Turn On'}</span>
			<span class="swi__toggle-pill" aria-hidden="true">
				<span class="swi__toggle-thumb"></span>
			</span>
		</button>
	</div>
</div>

<style>
	.swi { display: flex; flex-direction: column; min-height: 100%; }
	.swi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.swi__icon {
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
	.swi__icon--on {
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 18%, transparent);
	}
	.swi__value { font-size: 1.1rem; font-weight: 700; line-height: 1.15; color: var(--fg); }
	.swi__sub { margin-top: 4px; font-size: 0.82rem; color: var(--fg-subtle); }
	.swi__body { padding: 18px 20px 20px; }
	.swi__toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font: inherit;
		cursor: pointer;
	}
	.swi__toggle--on {
		border-color: color-mix(in srgb, var(--accent) 24%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}
	.swi__toggle-label { font-size: 0.9rem; font-weight: 650; }
	.swi__toggle-pill {
		width: 48px;
		height: 28px;
		padding: 3px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--fg-subtle) 20%, transparent);
		display: inline-flex;
		align-items: center;
		justify-content: flex-start;
		transition: background-color var(--transition);
	}
	.swi__toggle--on .swi__toggle-pill {
		background: color-mix(in srgb, var(--accent) 45%, transparent);
		justify-content: flex-end;
	}
	.swi__toggle-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: white;
		box-shadow: 0 2px 6px rgba(0,0,0,0.25);
	}
	.swi__toggle:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
