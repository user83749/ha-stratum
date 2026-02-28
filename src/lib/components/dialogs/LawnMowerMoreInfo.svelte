<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { lawnMowerService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const state = $derived((entity?.state as string | undefined) ?? 'unknown');
	
	const battery = $derived(entity?.attributes.battery_level as number | undefined);

	const isMowing = $derived(state === 'mowing');
	const isReturning = $derived(state === 'returning' || state === 'docked');
	const isPaused = $derived(state === 'paused');
	const isError = $derived(state === 'error');

	const statusColor = $derived(
		isError ? 'var(--color-danger)' :
		isMowing ? 'var(--color-on)' :
		'var(--fg-subtle)'
	);

	function run(action: 'mow' | 'pause' | 'dock') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'mow') applyPatch(entityId, { state: 'mowing' });
			if (action === 'pause') applyPatch(entityId, { state: 'paused' });
			if (action === 'dock') applyPatch(entityId, { state: 'docked' });
			return;
		}
		if (action === 'mow') lawnMowerService.startMowing(entityId).catch(() => {});
		if (action === 'pause') lawnMowerService.pause(entityId).catch(() => {});
		if (action === 'dock') lawnMowerService.dock(entityId).catch(() => {});
	}
</script>

<div class="lmmi">
	<div class="lmmi__header" style="--sc: {statusColor};">
		<div class="lmmi__icon-wrap">
			<Icon name="tractor" size={32} />
		</div>
		<div class="lmmi__titles">
			<h2 class="lmmi__title">{state.replace(/_/g, ' ')}</h2>
			<span class="lmmi__subtitle">{entity?.attributes.friendly_name ?? 'Lawn Mower'}</span>
		</div>
		<div class="lmmi__status-dot" style="background: {statusColor};"></div>
	</div>

	<div class="lmmi__body">
		<div class="lmmi__grid">
			<button class="lmmi__action-card" class:lmmi__action-card--active={isMowing} onclick={() => run('mow')} disabled={isUnavail}>
				<Icon name="play" size={24} />
				<span>Start Mow</span>
			</button>
			<button class="lmmi__action-card" class:lmmi__action-card--active={isPaused} onclick={() => run('pause')} disabled={isUnavail || state === 'docked'}>
				<Icon name="pause" size={24} />
				<span>Pause</span>
			</button>
			<button class="lmmi__action-card" class:lmmi__action-card--active={state === 'docked'} onclick={() => run('dock')} disabled={isUnavail}>
				<Icon name="house" size={24} />
				<span>Return Home</span>
			</button>
		</div>

		<div class="lmmi__metrics">
			<div class="lmmi__metric">
				<Icon name="battery" size={16} />
				<div class="lmmi__metric-info">
					<span class="lmmi__metric-label">Battery</span>
					<span class="lmmi__metric-val">{battery ?? '--'}%</span>
				</div>
			</div>
			<div class="lmmi__metric">
				<Icon name="clock" size={16} />
				<div class="lmmi__metric-info">
					<span class="lmmi__metric-label">Last Run</span>
					<span class="lmmi__metric-val">2h ago</span>
				</div>
			</div>
		</div>

		<div class="lmmi__meta">
			<div class="lmmi__meta-row">
				<span class="lmmi__meta-key">Entity ID</span>
				<span class="lmmi__meta-val">{entityId}</span>
			</div>
			<div class="lmmi__meta-row">
				<span class="lmmi__meta-key">Status</span>
				<span class="lmmi__meta-val">{state}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.lmmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 480px;
		color: var(--fg);
	}

	.lmmi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.lmmi__icon-wrap {
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

	.lmmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lmmi__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.lmmi__subtitle {
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.lmmi__status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: 0 0 8px currentColor;
	}

	.lmmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.lmmi__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.lmmi__action-card {
		all: unset;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 20px 8px;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.75rem;
		font-weight: 700;
		text-align: center;
	}

	.lmmi__action-card:hover:not(:disabled) {
		background: var(--active);
		border-color: var(--border-strong);
		color: var(--fg);
	}

	.lmmi__action-card--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	.lmmi__action-card:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.lmmi__metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.lmmi__metric {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.lmmi__metric-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lmmi__metric-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.lmmi__metric-val {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.lmmi__meta {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.lmmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.lmmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.lmmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
