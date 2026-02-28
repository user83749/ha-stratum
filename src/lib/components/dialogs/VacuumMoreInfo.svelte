<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { vacuumService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const stateLabel = $derived((entity?.state as string | undefined) ?? 'unknown');
	const battery = $derived(entity?.attributes.battery_level as number | undefined);
	const fanSpeed = $derived(entity?.attributes.fan_speed as string | undefined);
	const fanSpeedList = $derived((entity?.attributes.fan_speed_list as string[] | undefined) ?? []);

	const isCleaning = $derived(['cleaning', 'on', 'auto'].includes(stateLabel));
	const isReturning = $derived(stateLabel === 'returning');
	const isError = $derived(stateLabel === 'error');

	const statusColor = $derived(
		isError ? 'var(--color-danger)' :
		isReturning ? 'var(--color-warning)' :
		isCleaning ? 'var(--color-on)' :
		'var(--fg-subtle)'
	);

	function run(action: 'start' | 'pause' | 'stop' | 'dock' | 'locate') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'start') applyPatch(entityId, { state: 'cleaning' });
			if (action === 'pause') applyPatch(entityId, { state: 'paused' });
			if (action === 'dock') applyPatch(entityId, { state: 'returning' });
			return;
		}
		if (action === 'start') vacuumService.start(entityId).catch(() => {});
		if (action === 'pause') vacuumService.pause(entityId).catch(() => {});
		if (action === 'stop') vacuumService.stop(entityId).catch(() => {});
		if (action === 'dock') vacuumService.returnToBase(entityId).catch(() => {});
		if (action === 'locate') vacuumService.locate(entityId).catch(() => {});
	}

	function setFanSpeed(next: string) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { attributes: { fan_speed: next } });
			return;
		}
		vacuumService.setFanSpeed(entityId, next).catch(() => {});
	}
</script>

<div class="vmi">
	<div class="vmi__header">
		<div class="vmi__icon-wrap" style="--sc: {statusColor};">
			<Icon name="bot" size={32} />
		</div>
		<div class="vmi__titles">
			<h2 class="vmi__title">{stateLabel.replace(/_/g, ' ')}</h2>
			<div class="vmi__subtitle">
				{#if battery !== undefined}
					<div class="vmi__battery">
						<Icon name="battery" size={12} />
						<span>{battery}% battery</span>
					</div>
				{/if}
			</div>
		</div>
		<div class="vmi__status-dot" style="background: {statusColor};"></div>
	</div>

	<div class="vmi__body">
		<div class="vmi__grid">
			<button class="vmi__action-card" class:vmi__action-card--active={isCleaning} onclick={() => run('start')} disabled={isUnavail}>
				<Icon name="play" size={24} />
				<span>Clean</span>
			</button>
			<button class="vmi__action-card" onclick={() => run('pause')} disabled={isUnavail || stateLabel === 'docked'}>
				<Icon name="pause" size={24} />
				<span>Pause</span>
			</button>
			<button class="vmi__action-card" class:vmi__action-card--active={isReturning} onclick={() => run('dock')} disabled={isUnavail}>
				<Icon name="house" size={24} />
				<span>Dock</span>
			</button>
			<button class="vmi__action-card" onclick={() => run('locate')} disabled={isUnavail}>
				<Icon name="map-pin" size={24} />
				<span>Locate</span>
			</button>
		</div>

		{#if fanSpeedList.length > 0}
			<div class="vmi__section">
				<h3 class="vmi__section-title">Fan Speed</h3>
				<div class="vmi__pills">
					{#each fanSpeedList as mode (mode)}
						<button 
							class="vmi__pill" 
							class:vmi__pill--active={fanSpeed === mode}
							onclick={() => setFanSpeed(mode)}
							disabled={isUnavail}
						>
							{mode}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="vmi__meta">
			<div class="vmi__meta-row">
				<span class="vmi__meta-key">Entity ID</span>
				<span class="vmi__meta-val">{entityId}</span>
			</div>
			<div class="vmi__meta-row">
				<span class="vmi__meta-key">Last Cleaning</span>
				<span class="vmi__meta-val">{entity?.last_changed ? new Date(entity.last_changed).toLocaleTimeString() : 'Unknown'}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.vmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 480px;
		color: var(--fg);
	}

	.vmi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.vmi__icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--sc) 12%, transparent);
		color: var(--sc);
		border: 1px solid color-mix(in srgb, var(--sc) 25%, transparent);
	}

	.vmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.vmi__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.vmi__subtitle {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.vmi__battery {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.8rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.vmi__status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: 0 0 8px currentColor;
	}

	.vmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.vmi__grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
	}

	.vmi__action-card {
		all: unset;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 20px;
		border-radius: 20px;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.vmi__action-card:hover:not(:disabled) {
		background: var(--active);
		border-color: var(--border-strong);
		color: var(--fg);
		transform: translateY(-2px);
	}

	.vmi__action-card--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.vmi__action-card:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.vmi__section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.vmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.vmi__pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.vmi__pill {
		all: unset;
		padding: 8px 14px;
		border-radius: 99px;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--hover);
		border: 1px solid var(--border);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.vmi__pill:hover:not(:disabled) {
		background: var(--active);
		color: var(--fg);
	}

	.vmi__pill--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: var(--accent);
	}

	.vmi__meta {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.vmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.vmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.vmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
