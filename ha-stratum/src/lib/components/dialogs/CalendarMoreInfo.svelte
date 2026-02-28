<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const title = $derived((entity?.attributes.message as string | undefined) ?? 'No upcoming event');
	const start = $derived((entity?.attributes.start_time as string | undefined) ?? '');
	const end = $derived((entity?.attributes.end_time as string | undefined) ?? '');
	const location = $derived((entity?.attributes.location as string | undefined) ?? '');
	const description = $derived((entity?.attributes.description as string | undefined) ?? '');
	const allDay = $derived((entity?.attributes.all_day as boolean | undefined) ?? false);

	function formatDate(value: string, includeTime = true): string {
		if (!value) return 'Not scheduled';
		const date = new Date(value);
		const options: Intl.DateTimeFormatOptions = includeTime
			? { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
			: { weekday: 'short', month: 'short', day: 'numeric' };
		return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, options);
	}
	const whenLabel = $derived(allDay ? formatDate(start, false) : formatDate(start, true));
	const untilLabel = $derived(end ? (allDay ? formatDate(end, false) : formatDate(end, true)) : '');
</script>

<div class="calmi">
	<div class="calmi__hero">
		<div class="calmi__icon"><Icon name="calendar-days" size={26} /></div>
		<div class="calmi__hero-copy">
			<div class="calmi__value">{title}</div>
			<div class="calmi__sub">{whenLabel}</div>
		</div>
	</div>

	<div class="calmi__body">
		<div class="calmi__row">
			<div class="calmi__label">Starts</div>
			<div class="calmi__detail">{whenLabel}</div>
		</div>
		{#if untilLabel}
			<div class="calmi__row">
				<div class="calmi__label">Ends</div>
				<div class="calmi__detail">{untilLabel}</div>
			</div>
		{/if}
		{#if location}
			<div class="calmi__row">
				<div class="calmi__label">Location</div>
				<div class="calmi__detail">{location}</div>
			</div>
		{/if}
		{#if description}
			<div class="calmi__notes">{description}</div>
		{/if}
	</div>
</div>

<style>
	.calmi { display: flex; flex-direction: column; min-height: 100%; }
	.calmi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.calmi__icon {
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
	.calmi__hero-copy { min-width: 0; }
	.calmi__value {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--fg);
	}
	.calmi__sub {
		margin-top: 5px;
		font-size: 0.8rem;
		color: var(--fg-subtle);
	}
	.calmi__body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 20px 20px;
	}
	.calmi__row {
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--hover) 70%, transparent);
	}
	.calmi__label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}
	.calmi__detail {
		margin-top: 4px;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--fg);
		line-height: 1.3;
	}
	.calmi__notes {
		padding: 12px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--hover) 55%, transparent);
		font-size: 0.82rem;
		line-height: 1.45;
		color: var(--fg-muted);
		white-space: pre-wrap;
	}
</style>
