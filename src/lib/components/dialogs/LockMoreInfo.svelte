<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { lockService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const __state = $derived((entity?.state as string | undefined) ?? 'unknown');
	const isLocked = $derived(__state === 'locked');
	const isJammed = $derived(__state === 'jammed');

	let confirming = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	const statusColor = $derived(
		isJammed ? 'var(--color-danger)' :
		isLocked ? 'var(--color-on)' :
		'var(--color-warning)'
	);

	function handleAction() {
		if (isUnavail) return;
		
		if (isLocked) {
			if (!confirming) {
				confirming = true;
				timer = setTimeout(() => { confirming = false; }, 3000);
				return;
			}
			clearTimeout(timer);
			confirming = false;
			if (isDemo) applyPatch(entityId, { state: 'unlocked' });
			else lockService.unlock(entityId).catch(() => {});
		} else {
			if (isDemo) applyPatch(entityId, { state: 'locked' });
			else lockService.lock(entityId).catch(() => {});
		}
	}
</script>

<div class="lomi">
	<div class="lomi__header">
		<div class="lomi__icon-wrap" style="--sc: {statusColor};">
			<Icon name={isLocked ? 'lock' : 'lock-open'} size={32} />
		</div>
		<div class="lomi__titles">
			<h2 class="lomi__title">{__state.replace(/_/g, ' ')}</h2>
			<span class="lomi__subtitle">{entity?.attributes.friendly_name ?? 'Lock'}</span>
		</div>
		<div class="lomi__status-dot" style="background: {statusColor};"></div>
	</div>

	<div class="lomi__body">
		<div class="lomi__main-action">
			<button 
				class="lomi__action-btn" 
				class:lomi__action-btn--locked={isLocked}
				class:lomi__action-btn--confirming={confirming}
				onclick={handleAction}
				disabled={isUnavail}
			>
				<div class="lomi__action-icon">
					<Icon name={isLocked ? 'lock' : 'lock-open'} size={48} />
				</div>
				<div class="lomi__action-text">
					<span class="lomi__action-label">
						{#if confirming}Tap to Confirm{:else if isLocked}Locked{:else}Unlocked{/if}
					</span>
					<span class="lomi__action-sub">
						{#if confirming}Unlock Securely{:else if isLocked}Tap to Unlock{:else}Tap to Lock{/if}
					</span>
				</div>
			</button>
		</div>

		<div class="lomi__info-grid">
			<div class="lomi__info-card">
				<Icon name="battery" size={16} />
				<div class="lomi__info-content">
					<span class="lomi__info-label">Battery</span>
					<span class="lomi__info-val">{entity?.attributes.battery_level ?? 100}%</span>
				</div>
			</div>
			<div class="lomi__info-card">
				<Icon name="history" size={16} />
				<div class="lomi__info-content">
					<span class="lomi__info-label">Last Activity</span>
					<span class="lomi__info-val">{entity?.last_changed ? new Date(entity.last_changed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
				</div>
			</div>
		</div>

		<div class="lomi__meta">
			<div class="lomi__meta-row">
				<span class="lomi__meta-key">Entity ID</span>
				<span class="lomi__meta-val">{entityId}</span>
			</div>
			<div class="lomi__meta-row">
				<span class="lomi__meta-key">Status</span>
				<span class="lomi__meta-val">{__state}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.lomi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 520px;
		color: var(--fg);
	}

	.lomi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.lomi__icon-wrap {
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

	.lomi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lomi__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.lomi__subtitle {
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.lomi__status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		box-shadow: 0 0 8px currentColor;
	}

	.lomi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.lomi__main-action {
		display: flex;
		justify-content: center;
		padding: 20px 0;
	}

	.lomi__action-btn {
		all: unset;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		padding: 40px;
		width: 200px;
		height: 200px;
		border-radius: 50%;
		background: var(--hover);
		border: 4px solid var(--border);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: center;
	}

	.lomi__action-btn--locked {
		border-color: var(--color-on);
		background: color-mix(in srgb, var(--color-on) 5%, var(--bg-elevated));
		color: var(--color-on);
	}

	.lomi__action-btn:not(.lomi__action-btn--locked) {
		border-color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 5%, var(--bg-elevated));
		color: var(--color-warning);
	}

	.lomi__action-btn--confirming {
		border-color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, var(--bg-elevated));
		color: var(--color-danger);
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 40%, transparent); }
		50% { transform: scale(1.02); box-shadow: 0 0 20px 10px color-mix(in srgb, var(--color-danger) 20%, transparent); }
		100% { transform: scale(1); box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger) 0%, transparent); }
	}

	.lomi__action-icon {
		transition: transform 0.3s ease;
	}

	.lomi__action-btn:hover .lomi__action-icon {
		transform: scale(1.1);
	}

	.lomi__action-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.lomi__action-label {
		font-size: 1.1rem;
		font-weight: 800;
	}

	.lomi__action-sub {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}

	.lomi__info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.lomi__info-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.lomi__info-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lomi__info-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--fg-subtle);
	}

	.lomi__info-val {
		font-size: 0.9rem;
		font-weight: 700;
	}

	.lomi__meta {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: auto;
	}

	.lomi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.lomi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.lomi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
