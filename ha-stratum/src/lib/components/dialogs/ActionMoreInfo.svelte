<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { automationService, buttonService, inputButtonService, sceneService, scriptService } from '$lib/ha/services';
	import { getDomain } from '$lib/ha/entities';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const name = $derived((entity?.attributes.friendly_name as string | undefined) ?? entityId);

	const statusLabel = $derived.by(() => {
		switch (domain) {
			case 'automation':
				return entity?.state === 'on' ? 'Enabled' : 'Disabled';
			case 'script':
				return entity?.state === 'on' ? 'Running' : 'Idle';
			case 'scene':
				return 'Scene';
			case 'input_button':
			case 'button':
				return 'Button';
			default:
				return entity?.state ?? '';
		}
	});

	function runPrimary() {
		if (isUnavail) return;
		if (isDemo) {
			if (domain === 'automation') applyPatch(entityId, { state: 'on' });
			if (domain === 'script') applyPatch(entityId, { state: 'on' });
			return;
		}
		if (domain === 'button') buttonService.press(entityId).catch(() => {});
		else if (domain === 'input_button') inputButtonService.press(entityId).catch(() => {});
		else if (domain === 'scene') sceneService.turnOn(entityId).catch(() => {});
		else if (domain === 'script') scriptService.turnOn(entityId).catch(() => {});
		else if (domain === 'automation') automationService.trigger(entityId).catch(() => {});
	}

	function runSecondary(action: 'toggle' | 'disable' | 'stop') {
		if (isUnavail || domain === 'button' || domain === 'input_button' || domain === 'scene') return;
		if (isDemo) {
			if (domain === 'script' && action === 'stop') applyPatch(entityId, { state: 'off' });
			if (domain === 'automation' && action === 'toggle') {
				applyPatch(entityId, { state: entity?.state === 'on' ? 'off' : 'on' });
			}
			if (domain === 'automation' && action === 'disable') applyPatch(entityId, { state: 'off' });
			return;
		}
		if (domain === 'script' && action === 'stop') scriptService.turnOff(entityId).catch(() => {});
		if (domain === 'automation' && action === 'toggle') automationService.toggle(entityId).catch(() => {});
		if (domain === 'automation' && action === 'disable') automationService.turnOff(entityId).catch(() => {});
	}
</script>

<div class="acti">
	<div class="acti__hero">
		<div class="acti__icon">
			<Icon
				name={domain === 'automation' ? 'zap' : domain === 'scene' ? 'sparkles' : domain === 'script' ? 'play' : 'pointer'}
				size={26}
			/>
		</div>
		<div class="acti__hero-copy">
			<div class="acti__value">{name}</div>
			<div class="acti__sub">{statusLabel}</div>
		</div>
	</div>

	<div class="acti__actions">
		<button class="acti__btn acti__btn--primary" onclick={runPrimary} disabled={isUnavail}>
			<Icon name={domain === 'scene' ? 'sparkles' : domain === 'automation' ? 'play' : 'play'} size={16} />
			{domain === 'scene' ? 'Activate' : domain === 'automation' ? 'Trigger' : domain === 'button' || domain === 'input_button' ? 'Press' : 'Run'}
		</button>

		{#if domain === 'automation'}
			<button class="acti__btn" onclick={() => runSecondary('toggle')} disabled={isUnavail}>
				<Icon name="power" size={16} />
				Toggle
			</button>
			<button class="acti__btn" onclick={() => runSecondary('disable')} disabled={isUnavail}>
				<Icon name="pause" size={16} />
				Disable
			</button>
		{:else if domain === 'script'}
			<button class="acti__btn" onclick={() => runSecondary('stop')} disabled={isUnavail}>
				<Icon name="square" size={16} />
				Stop
			</button>
		{/if}
	</div>
</div>

<style>
	.acti { display: flex; flex-direction: column; min-height: 100%; }
	.acti__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.acti__icon {
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
	.acti__hero-copy { min-width: 0; }
	.acti__value { font-size: 1.2rem; font-weight: 700; line-height: 1.1; color: var(--fg); }
	.acti__sub { margin-top: 5px; font-size: 0.8rem; color: var(--fg-subtle); }
	.acti__actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		padding: 16px 20px 20px;
	}
	.acti__btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 10px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
	}
	.acti__btn--primary {
		border-color: color-mix(in srgb, var(--accent) 24%, transparent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--fg);
	}
	.acti__btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
</style>
