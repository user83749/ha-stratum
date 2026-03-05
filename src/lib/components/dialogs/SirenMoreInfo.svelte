<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { sirenService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const isOn = $derived(entity?.state === 'on');
	
	const tones = $derived((entity?.attributes.available_tones as string[] | undefined) ?? []);
	const currentTone = $derived(entity?.attributes.tone as string | undefined);

	function toggle() {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { state: isOn ? 'off' : 'on' });
		else (isOn ? sirenService.turnOff(entityId) : sirenService.turnOn(entityId)).catch(() => {});
	}

	function setTone(next: string) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: 'on', attributes: { tone: next } });
			return;
		}
		sirenService.turnOn(entityId, next).catch(() => {});
	}
</script>

<div class="smi">
	<div class="smi__header">
		<div class="smi__icon-wrap" class:smi__icon-wrap--active={isOn}>
			<Icon name="megaphone" size={28} />
		</div>
		<div class="smi__titles">
			<h2 class="smi__title">{entity?.attributes.friendly_name ?? 'Siren'}</h2>
			<span class="smi__subtitle">{isOn ? 'Sounding' : 'Idle'}</span>
		</div>
		{#if isOn}
			<div class="smi__alarm-dot"></div>
		{/if}
	</div>

	<div class="smi__body">
		<div class="smi__main-action">
			<button 
				class="smi__trigger-btn" 
				class:smi__trigger-btn--active={isOn} 
				onclick={toggle}
				disabled={isUnavail}
			>
				<div class="smi__trigger-bg"></div>
				<Icon name={isOn ? 'octagon' : 'play'} size={32} />
				<span>{isOn ? 'Stop Siren' : 'Activate Siren'}</span>
			</button>
		</div>

		{#if tones.length > 0}
			<div class="smi__section">
				<h3 class="smi__section-title">Available Tones</h3>
				<div class="smi__pills">
					{#each tones as t}
						<button 
							class="smi__pill" 
							class:smi__pill--active={currentTone === t}
							onclick={() => setTone(t)}
							disabled={isUnavail}
						>
							{t}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="smi__meta">
			<div class="smi__meta-row">
				<span class="smi__meta-key">Entity ID</span>
				<span class="smi__meta-val">{entityId}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.smi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 480px;
		color: var(--fg);
	}

	.smi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.smi__icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--hover);
		color: var(--fg-subtle);
		border: 1px solid var(--border);
	}

	.smi__icon-wrap--active {
		background: color-mix(in srgb, var(--color-danger) 15%, transparent);
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
		animation: shake 0.5s ease infinite;
	}

	@keyframes shake {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(-10deg); }
		75% { transform: rotate(10deg); }
	}

	.smi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.smi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.smi__subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
	}

	.smi__alarm-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-danger);
		box-shadow: 0 0 12px var(--color-danger);
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.2); }
		100% { opacity: 1; transform: scale(1); }
	}

	.smi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.smi__main-action {
		display: flex;
		justify-content: center;
		padding: 20px 0;
	}

	.smi__trigger-btn {
		all: unset;
		position: relative;
		width: 160px;
		height: 160px;
		border-radius: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		cursor: pointer;
		overflow: hidden;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: 4px solid var(--border);
		background: var(--bg-elevated);
		z-index: 1;
	}

	.smi__trigger-btn::before {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--color-danger);
		opacity: 0.05;
		transition: opacity 0.3s ease;
	}

	.smi__trigger-btn--active {
		border-color: var(--color-danger);
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 8%, var(--bg-elevated));
	}

	.smi__trigger-btn--active span {
		font-weight: 900;
	}

	.smi__trigger-btn:hover:not(:disabled) {
		transform: scale(1.05);
		border-color: var(--color-danger);
	}

	.smi__trigger-btn span {
		font-size: 0.85rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.smi__section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.smi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.smi__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.smi__pill {
		all: unset;
		padding: 10px 16px;
		border-radius: 12px;
		background: var(--hover);
		border: 1px solid var(--border);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.smi__pill:hover:not(:disabled) {
		background: var(--active);
		color: var(--fg);
	}

	.smi__pill--active {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		border-color: var(--color-danger);
		color: var(--color-danger);
	}

	.smi__meta {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.smi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.smi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.smi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
