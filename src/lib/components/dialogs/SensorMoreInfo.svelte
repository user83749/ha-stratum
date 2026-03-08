<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { getDomain, getEntityIcon, getEntityName, formatState } from '$lib/ha/entities';
	import { updateService } from '$lib/ha/services';
	import type { Tile } from '$lib/types/dashboard';
	import { isCustomIcon } from '$lib/icons/customIcons';
	import { uiStore } from '$lib/stores/ui';
	import { getUpdateCount } from '$lib/ha/updateSummary';

	interface Props { entityId: string; tile?: Tile | null; }
	const { entityId, tile = null }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const domain = $derived(getDomain(entityId));
	const iconName = $derived(entity ? getEntityIcon(entity) : 'activity');
	const stateLabel = $derived(entity ? formatState(entity) : 'Unavailable');
	const unit = $derived((entity?.attributes.unit_of_measurement as string | undefined) ?? '');
	const deviceClass = $derived((entity?.attributes.device_class as string | undefined) ?? '');

	// Special-case: update summary sensors like `sensor.hassio_updates_available`.
	// These sensors usually have attributes like { total, home_assistant, update_entities }.
	const isUpdateSummary = $derived.by(() => {
		if (!entity) return false;
		if (domain !== 'sensor') return false;
		const a = entity.attributes ?? {};
		return (
			typeof (a as any).update_entities !== 'undefined' ||
			typeof (a as any).home_assistant !== 'undefined' ||
			/updates?_available/i.test(entity.entity_id) ||
			deviceClass === 'update'
		);
	});

	const updateEntitiesOn = $derived.by(() => {
		if (!isUpdateSummary) return [] as Array<{ id: string; name: string; installed: string; latest: string; icon: string; picture?: string }>;
		return Object.entries($optimisticEntities)
			.filter(([id, e]) => id.startsWith('update.') && e && e.state === 'on')
			.map(([id, e]) => ({
				id,
				name: (e.attributes.friendly_name as string | undefined) ?? id,
				installed: (e.attributes.installed_version as string | undefined) ?? '',
				latest: (e.attributes.latest_version as string | undefined) ?? '',
				icon: getEntityIcon(e),
				picture: (e.attributes.entity_picture as string | undefined) ?? undefined
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	const updateSummaryCount = $derived.by(() => {
		if (!isUpdateSummary) return 0;
		const count = getUpdateCount(entity, $optimisticEntities);
		return count > 0 ? count : updateEntitiesOn.length;
	});

	let installStateById = $state<Record<string, 'idle' | 'installing' | 'queued' | 'error'>>({});
	let installResetTimers: Record<string, ReturnType<typeof setTimeout>> = {};
	let imageErrorById = $state<Record<string, boolean>>({});
	$effect(() => {
		return () => {
			for (const timer of Object.values(installResetTimers)) clearTimeout(timer);
			installResetTimers = {};
		};
	});
	$effect(() => {
		const next: Record<string, boolean> = {};
		for (const u of updateEntitiesOn) {
			if (imageErrorById[u.id]) next[u.id] = true;
		}
		const currentKeys = Object.keys(imageErrorById);
		const nextKeys = Object.keys(next);
		if (currentKeys.length !== nextKeys.length) {
			imageErrorById = next;
			return;
		}
		for (const key of nextKeys) {
			if (!imageErrorById[key]) {
				imageErrorById = next;
				return;
			}
		}
	});

	function getInstallState(id: string): 'idle' | 'installing' | 'queued' | 'error' {
		return installStateById[id] ?? 'idle';
	}

	function setInstallState(id: string, state: 'idle' | 'installing' | 'queued' | 'error') {
		installStateById = { ...installStateById, [id]: state };
	}

	function queueInstallStateReset(id: string, ms: number) {
		if (installResetTimers[id]) clearTimeout(installResetTimers[id]);
		installResetTimers[id] = setTimeout(() => {
			setInstallState(id, 'idle');
			delete installResetTimers[id];
		}, ms);
	}

	function installUpdate(id: string) {
		if (getInstallState(id) === 'installing') return;
		setInstallState(id, 'installing');
		updateService.install(id)
			.then(() => {
				setInstallState(id, 'queued');
				queueInstallStateReset(id, 1800);
			})
			.catch(() => {
				setInstallState(id, 'error');
				queueInstallStateReset(id, 2200);
			});
	}
	function skipUpdate(id: string) { updateService.skip(id).catch(() => {}); }

	const tileIconOverride = $derived(((tile?.config?.icon as string | undefined) ?? '').trim() || undefined);
	const overrideIsCustom = $derived(tileIconOverride ? isCustomIcon(tileIconOverride) : false);
	const summaryIcon = $derived(updateSummaryCount > 0 ? 'circle-arrow-up' : 'circle-check');
	const summaryTitle = $derived(
		updateSummaryCount > 0
			? `${updateSummaryCount} update${updateSummaryCount === 1 ? '' : 's'} available`
			: 'Up to Date'
	);

	function openUpdate(id: string) {
		// Navigate into the update.* entity details, while preserving this summary
		// dialog as a back target (HA-like flow).
		uiStore.pushDialog(id, undefined, 'update');
	}

	const attrs = $derived.by(() => {
		if (!entity) return [] as Array<{ key: string; label: string; value: string }>;
		const hidden = new Set([
			'friendly_name',
			'icon',
			'entity_picture',
			'unit_of_measurement',
			'device_class',
			'state_class',
			'supported_features'
		]);
		return Object.entries(entity.attributes)
			.filter(([key]) => !hidden.has(key))
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, value]) => ({
				key,
				label: key.replace(/_/g, ' '),
				value:
					value === null || value === undefined
						? '—'
						: Array.isArray(value)
							? value.join(', ')
							: typeof value === 'object'
								? JSON.stringify(value)
								: String(value)
			}));
	});
</script>

{#if isUpdateSummary}
	<div class="usmi">
		<div class="usmi__hero">
			<div class="usmi__icon" class:usmi__icon--custom={overrideIsCustom}>
				{#if tileIconOverride}
					<Icon name={tileIconOverride} entity={entity} size="100%" />
				{:else}
					<Icon name={summaryIcon} size="100%" />
				{/if}
			</div>
			<div class="usmi__copy">
				<div class="usmi__title">{summaryTitle}</div>
			</div>
		</div>

		{#if updateEntitiesOn.length > 0}
			<div class="usmi__list">
				{#each updateEntitiesOn as u (u.id)}
					<div class="usmi__row">
						<button class="usmi__name" onclick={() => openUpdate(u.id)} title={u.id}>
							{#if u.picture && !imageErrorById[u.id]}
								<img
									class="usmi__img usmi__img--photo"
									src={u.picture}
									alt=""
									aria-hidden="true"
									onerror={() => { imageErrorById = { ...imageErrorById, [u.id]: true }; }}
								/>
							{:else}
								<div class="usmi__img" aria-hidden="true">
									<Icon name={u.icon} size={18} />
								</div>
							{/if}
							<span class="usmi__name-text">{u.name.replace(/\\bupdate\\b/ig, '').trim() || u.name}</span>
						</button>
						<div class="usmi__ver">
							<span class="usmi__pill">{u.installed}{u.installed && u.latest ? ' → ' : ''}{u.latest}</span>
						</div>
						<div class="usmi__actions">
							<button
								class="usmi__btn"
								class:usmi__btn--installing={getInstallState(u.id) === 'installing'}
								class:usmi__btn--queued={getInstallState(u.id) === 'queued'}
								class:usmi__btn--error={getInstallState(u.id) === 'error'}
								onclick={() => installUpdate(u.id)}
								disabled={getInstallState(u.id) === 'installing'}
							>
								{getInstallState(u.id) === 'installing'
									? 'Installing…'
									: getInstallState(u.id) === 'queued'
										? 'Queued'
										: getInstallState(u.id) === 'error'
											? 'Failed — Retry'
											: 'Install'}
							</button>
							<button class="usmi__btn usmi__btn--ghost" onclick={() => skipUpdate(u.id)}>Skip</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="usmi__empty">
				<span>No pending updates</span>
			</div>
		{/if}
	</div>
{:else}
	<div class="smi">
		<div class="smi__hero">
			<div class="smi__icon"><Icon name={iconName} entity={entity} size={26} /></div>
			<div class="smi__hero-copy">
				<div class="smi__value">
					{stateLabel}{#if unit}<span class="smi__unit">&thinsp;{unit}</span>{/if}
				</div>
				<div class="smi__sub">{entity ? getEntityName(entity) : entityId}</div>
			</div>
		</div>

		<div class="smi__meta">
			<div class="smi__meta-chip">
				<span class="smi__meta-label">Domain</span>
				<span class="smi__meta-value">{domain}</span>
			</div>
			{#if deviceClass}
				<div class="smi__meta-chip">
					<span class="smi__meta-label">Device class</span>
					<span class="smi__meta-value">{deviceClass}</span>
				</div>
			{/if}
		</div>

		{#if attrs.length > 0}
			<div class="smi__attrs">
				{#each attrs as row (row.key)}
					<div class="smi__attr">
						<span class="smi__attr-key">{row.label}</span>
						<span class="smi__attr-value">{row.value}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
	.smi { display: flex; flex-direction: column; min-height: 100%; }
	.smi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 22px 20px 18px;
		border-bottom: 1px solid var(--border);
	}
	.smi__icon {
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
	.smi__hero-copy { min-width: 0; }
	.smi__value { font-size: 1.15rem; font-weight: 700; line-height: 1.15; color: var(--fg); }
	.smi__unit { color: var(--fg-subtle); font-weight: 600; }
	.smi__sub {
		margin-top: 4px;
		font-size: 0.8rem;
		color: var(--fg-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.smi__meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		padding: 16px 20px 0;
	}
	.smi__meta-chip {
		display: inline-flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
		min-width: 120px;
	}
	.smi__meta-label {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}
	.smi__meta-value { font-size: 0.84rem; font-weight: 600; color: var(--fg); }
	.smi__attrs {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 16px 20px 20px;
	}
	.smi__attr {
		display: grid;
		grid-template-columns: minmax(0, 140px) minmax(0, 1fr);
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--hover);
	}
	.smi__attr-key {
		font-size: 0.76rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--fg-subtle);
	}
	.smi__attr-value {
		font-size: 0.84rem;
		color: var(--fg);
		word-break: break-word;
	}

	/* ── Update summary sensor layout ─────────────────────────────────────── */
	.usmi { display: flex; flex-direction: column; min-height: 100%; }
	.usmi__hero {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 22px 20px 14px;
	}
	.usmi__icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
		flex-shrink: 0;
	}
	.usmi__icon--custom { overflow: visible; }
	.usmi__copy { min-width: 0; }
	.usmi__title { font-size: 1rem; font-weight: 700; color: var(--fg); line-height: 1.15; }

	.usmi__list { display: flex; flex-direction: column; gap: 10px; padding: 4px 20px 20px; }
	.usmi__row {
		border: 1px solid var(--border);
		background: var(--hover);
		border-radius: var(--radius);
		padding: 10px 12px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 8px;
	}
	.usmi__name {
		all: unset;
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
		min-width: 0;
	}
	.usmi__img {
		width: 34px;
		height: 34px;
		border-radius: var(--dialog-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.15);
		color: var(--fg-muted);
		flex-shrink: 0;
	}
	.usmi__img--photo { object-fit: contain; }
	.usmi__name-text { font-size: 0.9rem; font-weight: 650; color: var(--fg); min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.usmi__ver { display: flex; }
	.usmi__pill {
		display: inline-flex;
		gap: 8px;
		padding: 2px 8px;
		border-radius: 6px;
		background: color-mix(in srgb, var(--fg) 8%, transparent);
		color: var(--fg-muted);
		font-size: 0.78rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.usmi__actions { display: flex; gap: 8px; }
	.usmi__btn {
		all: unset;
		padding: 8px 12px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
		background: color-mix(in srgb, var(--accent) 10%, transparent);
		color: var(--accent);
		font-size: 0.82rem;
		font-weight: 650;
		cursor: pointer;
	}
	.usmi__btn--installing {
		opacity: 0.86;
	}
	.usmi__btn--queued {
		background: color-mix(in srgb, #22c55e 22%, transparent);
		border-color: color-mix(in srgb, #22c55e 45%, var(--border));
		color: color-mix(in srgb, #22c55e 80%, white);
	}
	.usmi__btn--error {
		background: color-mix(in srgb, #ef4444 14%, transparent);
		border-color: color-mix(in srgb, #ef4444 38%, var(--border));
		color: color-mix(in srgb, #ef4444 85%, white);
	}
	.usmi__btn--ghost {
		background: transparent;
		border-color: var(--border);
		color: var(--fg-muted);
	}

	.usmi__empty {
		padding: 10px 20px 20px;
		color: var(--fg-subtle);
		font-size: 0.9rem;
	}
</style>
