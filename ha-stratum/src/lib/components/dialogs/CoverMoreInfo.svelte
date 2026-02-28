<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { coverService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const __state = $derived((entity?.state as string | undefined) ?? 'unknown');
	const position = $derived((entity?.attributes.current_position as number | undefined) ?? (__state === 'open' ? 100 : 0));
	const tilt = $derived(entity?.attributes.current_tilt_position as number | undefined);

	let localPos = $state(0);
	let dragging = $state(false);
	$effect(() => { if (!dragging) localPos = position; });

	function onInput(e: Event) {
		dragging = true;
		localPos = Number((e.target as HTMLInputElement).value);
	}

	function onChange(e: Event) {
		dragging = false;
		const next = Number((e.target as HTMLInputElement).value);
		if (isDemo) {
			applyPatch(entityId, { state: next > 0 ? 'open' : 'closed', attributes: { current_position: next } });
		} else {
			coverService.setPosition(entityId, next).catch(() => {});
		}
	}

	function run(action: 'open' | 'stop' | 'close') {
		if (isUnavail) return;
		if (isDemo) {
			if (action === 'open') applyPatch(entityId, { state: 'open', attributes: { current_position: 100 } });
			if (action === 'close') applyPatch(entityId, { state: 'closed', attributes: { current_position: 0 } });
			return;
		}
		if (action === 'open') coverService.open(entityId).catch(() => {});
		if (action === 'stop') coverService.stop(entityId).catch(() => {});
		if (action === 'close') coverService.close(entityId).catch(() => {});
	}
</script>

<div class="covmi">
	<div class="covmi__header">
		<div class="covmi__icon-wrap" class:covmi__icon-wrap--active={__state === 'open'}>
			<Icon name="blinds" size={28} />
		</div>
		<div class="covmi__titles">
			<h2 class="covmi__title">{entity?.attributes.friendly_name ?? 'Cover'}</h2>
			<span class="covmi__subtitle">{__state.replace(/_/g, ' ')}</span>
		</div>
		<div class="covmi__status-dot" class:covmi__status-dot--active={__state === 'open'}></div>
	</div>

	<div class="covmi__body">
		<div class="covmi__main-control">
			<div class="covmi__visual-track">
				<div class="covmi__track">
					<div class="covmi__fill" style="height: {localPos}%"></div>
					<input 
						type="range" min="0" max="100" step="1" 
						value={localPos} 
						oninput={onInput}
						onchange={onChange}
						disabled={isUnavail}
						class="covmi__slider"
						aria-label="Cover position" 
					/>
				</div>
				<div class="covmi__pos-badge">
					<span class="covmi__pos-val">{Math.round(localPos)}%</span>
					<span class="covmi__pos-label">Position</span>
				</div>
			</div>

			<div class="covmi__actions-grid">
				<button class="covmi__action-btn" onclick={() => run('open')} disabled={isUnavail}>
					<Icon name="chevrons-up" size={20} />
					<span>Open</span>
				</button>
				<button class="covmi__action-btn covmi__action-btn--stop" onclick={() => run('stop')} disabled={isUnavail}>
					<Icon name="square" size={20} />
					<span>Stop</span>
				</button>
				<button class="covmi__action-btn" onclick={() => run('close')} disabled={isUnavail}>
					<Icon name="chevrons-down" size={20} />
					<span>Close</span>
				</button>
			</div>
		</div>

		{#if tilt !== undefined}
			<div class="covmi__section">
				<h3 class="covmi__section-title">Tilt</h3>
				<div class="covmi__tilt-control">
					<Icon name="rotate-cw" size={16} />
					<input 
						type="range" min="0" max="100" 
						value={tilt}
						disabled={isUnavail}
						class="covmi__slim-slider"
						aria-label="Tilt position"
					/>
					<span class="covmi__tilt-val">{tilt}%</span>
				</div>
			</div>
		{/if}

		<div class="covmi__meta">
			<div class="covmi__meta-row">
				<span class="covmi__meta-key">Entity ID</span>
				<span class="covmi__meta-val">{entityId}</span>
			</div>
			<div class="covmi__meta-row">
				<span class="covmi__meta-key">Device Class</span>
				<span class="covmi__meta-val">{entity?.attributes.device_class ?? 'cover'}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.covmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 560px;
		color: var(--fg);
	}

	.covmi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.covmi__icon-wrap {
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

	.covmi__icon-wrap--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.covmi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.covmi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.covmi__subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
		text-transform: capitalize;
	}

	.covmi__status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--fg-subtle);
		opacity: 0.3;
	}

	.covmi__status-dot--active {
		background: var(--color-on);
		opacity: 1;
		box-shadow: 0 0 8px var(--color-on);
	}

	.covmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.covmi__main-control {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 32px;
	}

	.covmi__visual-track {
		display: flex;
		align-items: center;
		gap: 32px;
		width: 100%;
		max-width: 240px;
	}

	.covmi__track {
		position: relative;
		width: 60px;
		height: 160px;
		background: var(--hover);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
	}

	.covmi__fill {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		background: var(--accent);
		transition: height 0.12s linear;
		opacity: 0.4;
	}

	.covmi__fill::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 4px;
		background: var(--accent);
		box-shadow: 0 0 12px var(--accent);
	}

	.covmi__slider {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: ns-resize;
		margin: 0;
		writing-mode: vertical-lr;
		direction: rtl;
	}

	.covmi__pos-badge {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.covmi__pos-val {
		font-size: 2.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.covmi__pos-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	.covmi__actions-grid {
		display: flex;
		gap: 12px;
		width: 100%;
	}

	.covmi__action-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px;
		border-radius: 16px;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.covmi__action-btn:hover:not(:disabled) {
		background: var(--active);
		color: var(--fg);
		border-color: var(--border-strong);
	}

	.covmi__action-btn--stop {
		color: var(--color-warning);
	}

	.covmi__action-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.covmi__section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.covmi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.covmi__tilt-control {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.covmi__slim-slider {
		flex: 1;
	}

	.covmi__tilt-val {
		font-size: 0.85rem;
		font-weight: 700;
		min-width: 40px;
		text-align: right;
	}

	.covmi__meta {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: auto;
	}

	.covmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.covmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.covmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: capitalize;
	}
</style>
