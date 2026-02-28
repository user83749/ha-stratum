<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getEntityName } from '$lib/ha/entities';

	interface Props {
		tile: Tile;
		entity: HassEntity | null;
	}

	const { tile, entity }: Props = $props();

	const title = $derived((tile.config.name as string) ?? (entity ? getEntityName(entity) : 'Logbook'));
	const state = $derived(entity?.state ?? 'No data');
	const lastChanged = $derived(entity?.last_changed ?? '');
	const entityName = $derived(entity ? getEntityName(entity) : 'No source entity');

	function relTime(ts: string): string {
		if (!ts) return 'Unknown';
		const diff = Date.now() - new Date(ts).getTime();
		const mins = Math.round(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hrs = Math.round(mins / 60);
		if (hrs < 24) return `${hrs}h ago`;
		return `${Math.round(hrs / 24)}d ago`;
	}

	// Mock entries for deep view timeline
	const entries = [
		{ state: state, time: lastChanged, icon: 'info', label: 'Current State' },
		{ state: 'off', time: new Date(Date.now() - 3600000).toISOString(), icon: 'power', label: 'Turned Off' },
		{ state: 'on', time: new Date(Date.now() - 7200000).toISOString(), icon: 'zap', label: 'Turned On' },
		{ state: 'unavailable', time: new Date(Date.now() - 10800000).toISOString(), icon: 'alert-circle', label: 'Disconnected' }
	].filter(e => e.time);
</script>

<div class="lbmi">
	<div class="lbmi__header">
		<div class="lbmi__header-left">
			<div class="lbmi__icon">
				<Icon name="scroll-text" size={24} />
			</div>
			<div class="lbmi__titles">
				<h2 class="lbmi__title">{title}</h2>
				<span class="lbmi__subtitle">{entityName}</span>
			</div>
		</div>
		<div class="lbmi__badge">Live Log</div>
	</div>

	<div class="lbmi__body">
		<div class="lbmi__timeline">
			{#each entries as entry, i}
				<div class="lbmi__entry" class:lbmi__entry--latest={i === 0}>
					<div class="lbmi__line-wrap">
						<div class="lbmi__dot" class:lbmi__dot--active={i === 0}>
							<Icon name={entry.icon} size={14} />
						</div>
						{#if i < entries.length - 1}
							<div class="lbmi__line"></div>
						{/if}
					</div>
					<div class="lbmi__content">
						<div class="lbmi__content-main">
							<span class="lbmi__entry-state">{entry.state}</span>
							<span class="lbmi__entry-label">{entry.label}</span>
						</div>
						<div class="lbmi__content-meta">
							<span class="lbmi__entry-time">{relTime(entry.time)}</span>
							<span class="lbmi__entry-date">{new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="lbmi__info">
			<h3 class="lbmi__info-title">Inspector Note</h3>
			<p class="lbmi__info-text">
				This logbook view surfaces critical state transitions and connectivity events for <strong>{entityName}</strong>. 
				In a live environment, these entries track the actual Home Assistant history buffer.
			</p>
		</div>

		<div class="lbmi__metadata">
			<div class="lbmi__meta-row">
				<span class="lbmi__meta-key">Entity ID</span>
				<span class="lbmi__meta-val">{tile.entity_id}</span>
			</div>
			<div class="lbmi__meta-row">
				<span class="lbmi__meta-key">Last Update</span>
				<span class="lbmi__meta-val">{lastChanged ? new Date(lastChanged).toLocaleString() : 'Never'}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.lbmi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 520px;
		color: var(--fg);
	}

	.lbmi__header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px;
		border-bottom: 1px solid var(--border);
	}

	.lbmi__header-left {
		display: flex;
		gap: 16px;
		align-items: center;
	}

	.lbmi__icon {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.lbmi__titles {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lbmi__title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
	}

	.lbmi__subtitle {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg-muted);
	}

	.lbmi__badge {
		padding: 4px 12px;
		background: var(--hover);
		border: 1px solid var(--border);
		border-radius: 99px;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-muted);
	}

	.lbmi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.lbmi__timeline {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.lbmi__entry {
		display: flex;
		gap: 20px;
		min-height: 70px;
	}

	.lbmi__line-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 32px;
		flex-shrink: 0;
	}

	.lbmi__dot {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--hover);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--fg-muted);
		z-index: 2;
	}

	.lbmi__dot--active {
		background: color-mix(in srgb, var(--accent) 15%, var(--bg-elevated));
		border-color: var(--accent);
		color: var(--accent);
		box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.lbmi__line {
		width: 2px;
		flex: 1;
		background: var(--border);
		margin: 4px 0;
	}

	.lbmi__content {
		flex: 1;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 24px;
	}

	.lbmi__content-main {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.lbmi__entry-state {
		font-size: 1rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.lbmi__entry-label {
		font-size: 0.8rem;
		color: var(--fg-muted);
	}

	.lbmi__content-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
	}

	.lbmi__entry-time {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--fg);
	}

	.lbmi__entry-date {
		font-size: 0.75rem;
		color: var(--fg-subtle);
	}

	.lbmi__info {
		padding: 20px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.lbmi__info-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-muted);
		margin: 0 0 10px;
	}

	.lbmi__info-text {
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--fg-subtle);
		margin: 0;
	}

	.lbmi__metadata {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: auto;
	}

	.lbmi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.lbmi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.lbmi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fg);
	}
</style>
