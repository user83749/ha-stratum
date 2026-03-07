<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { getDomain, getEntityIcon, getEntityName, formatState } from '$lib/ha/entities';
	import { updateService } from '$lib/ha/services';
	import type { Tile } from '$lib/types/dashboard';
	import { isCustomIcon } from '$lib/icons/customIcons';

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
		if (!isUpdateSummary) return [] as Array<{ id: string; name: string; installed: string; latest: string; picture?: string }>;
		return Object.entries($optimisticEntities)
			.filter(([id, e]) => id.startsWith('update.') && e && e.state === 'on')
			.map(([id, e]) => ({
				id,
				name: (e.attributes.friendly_name as string | undefined) ?? id,
				installed: (e.attributes.installed_version as string | undefined) ?? '',
				latest: (e.attributes.latest_version as string | undefined) ?? '',
				picture: (e.attributes.entity_picture as string | undefined) ?? undefined
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	const updateSummaryCount = $derived.by(() => {
		if (!isUpdateSummary) return 0;
		const raw = Number(entity?.state ?? 0);
		if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
		const a = (entity?.attributes ?? {}) as any;
		const fallback = Number(a.update_entities ?? a.total ?? a.home_assistant ?? 0);
		return Number.isFinite(fallback) ? Math.floor(fallback) : updateEntitiesOn.length;
	});

	function installUpdate(id: string) { updateService.install(id).catch(() => {}); }
	function skipUpdate(id: string) { updateService.skip(id).catch(() => {}); }

	const tileIconOverride = $derived(((tile?.config?.icon as string | undefined) ?? '').trim() || undefined);
	const overrideIsCustom = $derived(tileIconOverride ? isCustomIcon(tileIconOverride) : false);
	const summaryIcon = $derived(updateSummaryCount > 0 ? 'circle-arrow-up' : 'circle-check');
	const summaryTitle = $derived(
		updateSummaryCount > 0
			? `${updateSummaryCount} update${updateSummaryCount === 1 ? '' : 's'} available`
			: 'Up to Date'
	);

	function badgeText(name: string) {
		const cleaned = name.replace(/\\bupdate\\b/ig, '').trim();
		if (/home\\s*assistant/i.test(cleaned)) return 'HA';
		const parts = cleaned.split(/\\s+/).filter(Boolean);
		if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return 'UP';
	}

	let activeUpdateId = $state<string | null>(null);
	const activeUpdate = $derived(activeUpdateId ? ($optimisticEntities[activeUpdateId] ?? null) : null);
	const activeIsAvail = $derived(activeUpdate?.state === 'on');
	const activeInstalled = $derived((activeUpdate?.attributes.installed_version as string | undefined) ?? '');
	const activeLatest = $derived((activeUpdate?.attributes.latest_version as string | undefined) ?? '');

	function openUpdate(id: string) {
		activeUpdateId = id;
	}
	function backToList() {
		activeUpdateId = null;
	}

	function installActive() {
		if (!activeUpdateId) return;
		installUpdate(activeUpdateId);
	}
	function skipActive() {
		if (!activeUpdateId) return;
		skipUpdate(activeUpdateId);
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

		{#if activeUpdateId && activeUpdate}
			<div class="usmi__detail">
				<button class="usmi__back" onclick={backToList} aria-label="Back to updates list">
					<Icon name="chevron-left" size={18} />
					<span>Back</span>
				</button>

				<div class="usmi__detail-card">
					<div class="usmi__detail-top">
						<div class="usmi__detail-name">{(activeUpdate.attributes.friendly_name as string | undefined) ?? activeUpdateId}</div>
						<div class="usmi__detail-sub">{activeIsAvail ? 'Update Available' : 'Up to Date'}</div>
					</div>

					<div class="usmi__detail-versions">
						<span class="usmi__pill">{activeInstalled}{activeInstalled && activeLatest ? ' → ' : ''}{activeLatest}</span>
					</div>

					{#if activeIsAvail}
						<div class="usmi__detail-actions">
							<button class="usmi__btn" onclick={installActive}>Install</button>
							<button class="usmi__btn usmi__btn--ghost" onclick={skipActive}>Skip</button>
						</div>
					{/if}
				</div>
			</div>
		{:else if updateEntitiesOn.length > 0}
			<div class="usmi__list">
				{#each updateEntitiesOn as u (u.id)}
					<div class="usmi__row">
						<button class="usmi__name" onclick={() => openUpdate(u.id)} title={u.id}>
							{#if u.picture}
								<img class="usmi__img" src={u.picture} alt={u.name} />
							{:else}
								<div class="usmi__img usmi__img--placeholder" aria-hidden="true">{badgeText(u.name)}</div>
							{/if}
							<span class="usmi__name-text">{u.name.replace(/\\bupdate\\b/ig, '').trim() || u.name}</span>
						</button>
						<div class="usmi__ver">
							<span class="usmi__pill">{u.installed}{u.installed && u.latest ? ' → ' : ''}{u.latest}</span>
						</div>
						<div class="usmi__actions">
							<button class="usmi__btn" onclick={() => installUpdate(u.id)}>Install</button>
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
	.usmi__img { width: 34px; height: 34px; border-radius: 8px; object-fit: contain; background: rgba(0,0,0,0.15); flex-shrink: 0; }
	.usmi__img--placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		color: var(--fg-muted);
		background: color-mix(in srgb, var(--fg) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--fg) 12%, transparent);
	}
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
	.usmi__btn--ghost {
		background: transparent;
		border-color: var(--border);
		color: var(--fg-muted);
	}

	.usmi__detail { display: flex; flex-direction: column; gap: 10px; padding: 4px 20px 20px; }
	.usmi__back {
		all: unset;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		color: var(--fg-muted);
		font-weight: 650;
		font-size: 0.86rem;
		padding: 6px 4px;
		border-radius: 8px;
	}
	.usmi__back:hover { background: var(--hover); color: var(--fg); }
	.usmi__detail-card {
		border: 1px solid var(--border);
		background: var(--hover);
		border-radius: var(--radius);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.usmi__detail-name { font-size: 0.95rem; font-weight: 750; color: var(--fg); }
	.usmi__detail-sub { font-size: 0.82rem; color: var(--fg-subtle); margin-top: 2px; }
	.usmi__detail-actions { display: flex; gap: 8px; }
	.usmi__empty {
		padding: 10px 20px 20px;
		color: var(--fg-subtle);
		font-size: 0.9rem;
	}
</style>
