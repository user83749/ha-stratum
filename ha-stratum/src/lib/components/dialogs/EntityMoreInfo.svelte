<script lang="ts">
	import { getDomain, getEntityName, getEntityIcon, getStateColor, formatState } from '$lib/ha/entities';
	import { callService } from '$lib/ha/services';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		entityId: string;
	}

	const { entityId }: Props = $props();

	const entity     = $derived($optimisticEntities[entityId] ?? null);
	const domain     = $derived(getDomain(entityId));
	const name       = $derived(entity ? getEntityName(entity) : entityId);
	const stateLabel = $derived(entity ? formatState(entity) : 'unavailable');
	const stateColor = $derived(entity ? getStateColor(entity) : 'var(--fg-subtle)');
	const iconName   = $derived(entity ? getEntityIcon(entity) : 'circle-help');
	const unit       = $derived(entity?.attributes.unit_of_measurement as string | undefined);
	const isUnavailable = $derived(!entity || entity.state === 'unavailable' || entity.state === 'unknown');
	const isDemo = $derived(browser ? isDemoMode() : false);

	// ─── Attributes ──────────────────────────────────────────────────────────

	const HIDDEN_ATTRS = new Set([
		'friendly_name', 'icon', 'entity_picture',
		'supported_features', 'supported_color_modes', 'attribution',
	]);

	function formatAttrValue(val: unknown): string {
		if (val === null || val === undefined) return '—';
		if (typeof val === 'boolean')          return val ? 'Yes' : 'No';
		if (Array.isArray(val))                return val.join(', ');
		if (typeof val === 'object')           return JSON.stringify(val);
		if (typeof val === 'number')           return Number.isInteger(val) ? String(val) : val.toFixed(2);
		return String(val);
	}

	const attrRows = $derived(
		entity
			? Object.entries(entity.attributes)
				.filter(([k]) => !HIDDEN_ATTRS.has(k))
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => ({ key: k, display: k.replace(/_/g, ' '), value: formatAttrValue(v) }))
			: []
	);

	// ─── Quick Actions ────────────────────────────────────────────────────────

	interface QuickAction {
		label:    string;
		icon:     string;
		variant?: 'on' | 'off' | 'danger';
		run:      () => Promise<void>;
	}

	async function safe(fn: () => Promise<void>, demoFn?: () => void) {
		if (isUnavailable) return;
		if (isDemo) { demoFn?.(); return; }
		try { await fn(); } catch { /* silent */ }
	}

	const quickActions = $derived((): QuickAction[] => {
		if (!entity) return [];
		const e = entityId;
		const s = entity.state;

		switch (domain) {
			case 'light':
				return [
					{ label: s === 'on' ? 'Turn Off' : 'Turn On',
					  icon:  s === 'on' ? 'lightbulb-off' : 'lightbulb',
					  variant: s === 'on' ? 'off' : 'on',
					  run: () => safe(() => callService('light', s === 'on' ? 'turn_off' : 'turn_on', {}, { entity_id: e }),
					    () => applyPatch(e, { state: s === 'on' ? 'off' : 'on' })) },
				];
			case 'switch': case 'input_boolean':
				return [
					{ label: s === 'on' ? 'Turn Off' : 'Turn On',
					  icon:  s === 'on' ? 'toggle-left' : 'toggle-right',
					  variant: s === 'on' ? 'off' : 'on',
					  run: () => safe(() => callService(domain, s === 'on' ? 'turn_off' : 'turn_on', {}, { entity_id: e }),
					    () => applyPatch(e, { state: s === 'on' ? 'off' : 'on' })) },
				];
			case 'cover':
				return [
					{ label: 'Open',  icon: 'chevrons-up',   variant: 'on',
					  run: () => safe(() => callService('cover', 'open_cover',  {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'open', attributes: { current_position: 100 } })) },
					{ label: 'Stop',  icon: 'square',
					  run: () => safe(() => callService('cover', 'stop_cover',  {}, { entity_id: e })) },
					{ label: 'Close', icon: 'chevrons-down', variant: 'off',
					  run: () => safe(() => callService('cover', 'close_cover', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'closed', attributes: { current_position: 0 } })) },
				];
			case 'lock':
				return [
					{ label: s === 'locked' ? 'Unlock' : 'Lock',
					  icon:  s === 'locked' ? 'lock-open' : 'lock',
					  variant: s === 'locked' ? 'danger' : 'on',
					  run: () => safe(() => callService('lock', s === 'locked' ? 'unlock' : 'lock', {}, { entity_id: e }),
					    () => applyPatch(e, { state: s === 'locked' ? 'unlocked' : 'locked' })) },
				];
			case 'fan':
				return [
					{ label: s === 'on' ? 'Turn Off' : 'Turn On', icon: 'fan',
					  variant: s === 'on' ? 'off' : 'on',
					  run: () => safe(() => callService('fan', s === 'on' ? 'turn_off' : 'turn_on', {}, { entity_id: e }),
					    () => applyPatch(e, { state: s === 'on' ? 'off' : 'on' })) },
				];
			case 'climate':
				return [
					{ label: 'Off',  icon: 'power',     variant: 'off',
					  run: () => safe(() => callService('climate', 'turn_off', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'off' })) },
					{ label: 'Heat', icon: 'flame',     variant: 'on',
					  run: () => safe(() => callService('climate', 'set_hvac_mode', { hvac_mode: 'heat' }, { entity_id: e }),
					    () => applyPatch(e, { state: 'heat' })) },
					{ label: 'Cool', icon: 'snowflake', variant: 'on',
					  run: () => safe(() => callService('climate', 'set_hvac_mode', { hvac_mode: 'cool' }, { entity_id: e }),
					    () => applyPatch(e, { state: 'cool' })) },
					{ label: 'Auto', icon: 'cpu',
					  run: () => safe(() => callService('climate', 'set_hvac_mode', { hvac_mode: 'auto' }, { entity_id: e }),
					    () => applyPatch(e, { state: 'auto' })) },
				];
			case 'media_player':
				return [
					{ label: 'Play',  icon: 'play',  variant: 'on',
					  run: () => safe(() => callService('media_player', 'media_play',  {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'playing' })) },
					{ label: 'Pause', icon: 'pause',
					  run: () => safe(() => callService('media_player', 'media_pause', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'paused' })) },
					{ label: 'Stop',  icon: 'square', variant: 'off',
					  run: () => safe(() => callService('media_player', 'media_stop',  {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'idle' })) },
				];
			case 'vacuum':
				return [
					{ label: 'Start', icon: 'play',  variant: 'on',
					  run: () => safe(() => callService('vacuum', 'start', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'cleaning' })) },
					{ label: 'Pause', icon: 'pause',
					  run: () => safe(() => callService('vacuum', 'pause', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'paused' })) },
					{ label: 'Dock',  icon: 'house',  variant: 'off',
					  run: () => safe(() => callService('vacuum', 'return_to_base', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'returning' })) },
				];
			case 'alarm_control_panel':
				return [
					{ label: 'Arm Away', icon: 'shield',      variant: 'on',
					  run: () => safe(() => callService('alarm_control_panel', 'alarm_arm_away', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'armed_away' })) },
					{ label: 'Arm Home', icon: 'shield-check', variant: 'on',
					  run: () => safe(() => callService('alarm_control_panel', 'alarm_arm_home', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'armed_home' })) },
					{ label: 'Disarm',   icon: 'shield-off',  variant: 'danger',
					  run: () => safe(() => callService('alarm_control_panel', 'alarm_disarm', {}, { entity_id: e }),
					    () => applyPatch(e, { state: 'disarmed' })) },
				];
			case 'scene':
				return [
					{ label: 'Activate', icon: 'zap', variant: 'on',
					  run: () => safe(() => callService('scene', 'turn_on', {}, { entity_id: e })) },
				];
			case 'script':
				return [
					{ label: 'Run', icon: 'play', variant: 'on',
					  run: () => safe(() => callService('script', 'turn_on', {}, { entity_id: e })) },
				];
			case 'automation':
				return [
					{ label: s === 'on' ? 'Disable' : 'Enable',
					  icon:  s === 'on' ? 'toggle-left' : 'toggle-right',
					  variant: s === 'on' ? 'off' : 'on',
					  run: () => safe(() => callService('automation', s === 'on' ? 'turn_off' : 'turn_on', {}, { entity_id: e }),
					    () => applyPatch(e, { state: s === 'on' ? 'off' : 'on' })) },
					{ label: 'Trigger', icon: 'zap', variant: 'on',
					  run: () => safe(() => callService('automation', 'trigger', {}, { entity_id: e })) },
				];
			case 'button': case 'input_button':
				return [
					{ label: 'Press', icon: 'mouse-pointer-click', variant: 'on',
					  run: () => safe(() => callService(domain, 'press', {}, { entity_id: e })) },
				];
			default:
				return [];
		}
	});

	let runningIdx = $state<number | null>(null);

	async function runAction(idx: number, fn: () => Promise<void>) {
		if (runningIdx !== null) return;
		runningIdx = idx;
		try { await fn(); } catch { /* silent */ } finally { runningIdx = null; }
	}

	// ─── Attrs toggle ─────────────────────────────────────────────────────────
	let attrsOpen = $state(false);
</script>

<div class="emi">

	<!-- ── State hero ───────────────────────────────────────────────────────── -->
	<div class="emi__hero" style="--state-color: {stateColor};">
		<div class="emi__icon-wrap">
			<Icon name={iconName} entity={entity} size={28} />
		</div>
		<div class="emi__hero-text">
			<div class="emi__state-value">
				{stateLabel}{#if unit}<span class="emi__unit">&thinsp;{unit}</span>{/if}
			</div>
			<div class="emi__entity-id">{entityId}</div>
		</div>
	</div>

	<!-- ── Quick Actions ────────────────────────────────────────────────────── -->
	{#if quickActions().length > 0}
		<div class="emi__actions">
			{#each quickActions() as action, i}
				<button
					class="emi__action"
					class:emi__action--on={action.variant === 'on'}
					class:emi__action--off={action.variant === 'off'}
					class:emi__action--danger={action.variant === 'danger'}
					onclick={() => runAction(i, action.run)}
					disabled={runningIdx !== null || isUnavailable}
				>
					{#if runningIdx === i}
						<span class="emi__spin"></span>
					{:else}
						<Icon name={action.icon} size={16} />
					{/if}
					{action.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- ── Attributes ───────────────────────────────────────────────────────── -->
	{#if attrRows.length > 0}
		<button class="emi__attrs-toggle" onclick={() => (attrsOpen = !attrsOpen)}>
			<span>Attributes</span>
			<span class="emi__attrs-count">{attrRows.length}</span>
			<Icon name={attrsOpen ? 'chevron-up' : 'chevron-down'} size={14} />
		</button>

		{#if attrsOpen}
			<div class="emi__attrs">
				{#each attrRows as row (row.key)}
					<div class="emi__attr-row">
						<span class="emi__attr-key">{row.display}</span>
						<span class="emi__attr-val">{row.value}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

</div>

<style>
	.emi {
		display: flex;
		flex-direction: column;
	}

	/* ── Hero ──────────────────────────────────────────────────────────────── */
	.emi__hero {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 20px 20px 16px;
	}

	.emi__icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--state-color) 12%, transparent);
		color: var(--state-color);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid color-mix(in srgb, var(--state-color) 20%, transparent);
	}

	.emi__hero-text {
		flex: 1;
		min-width: 0;
	}

	.emi__state-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--fg);
		line-height: 1.1;
		letter-spacing: -0.02em;
	}

	.emi__unit {
		font-size: 1rem;
		font-weight: 500;
		color: var(--fg-muted);
	}

	.emi__entity-id {
		font-size: 0.6875rem;
		color: var(--fg-subtle);
		font-family: monospace;
		margin-top: 3px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Actions ───────────────────────────────────────────────────────────── */
	.emi__actions {
		display: flex;
		gap: 8px;
		padding: 0 20px 16px;
		flex-wrap: wrap;
	}

	.emi__action {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: var(--radius);
		font-size: 0.8125rem;
		font-weight: 600;
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg-muted);
		cursor: pointer;
		transition: background-color var(--transition), color var(--transition), border-color var(--transition);
	}
	.emi__action:hover:not(:disabled) {
		background: var(--active);
		color: var(--fg);
	}
	.emi__action:disabled { opacity: 0.4; cursor: not-allowed; }

	.emi__action--on {
		background: color-mix(in srgb, var(--color-on) 10%, transparent);
		color: var(--color-on);
		border-color: color-mix(in srgb, var(--color-on) 25%, transparent);
	}
	.emi__action--on:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-on) 18%, transparent);
	}
	.emi__action--off {
		background: color-mix(in srgb, var(--fg-subtle) 8%, transparent);
		color: var(--fg-muted);
		border-color: var(--border);
	}
	.emi__action--danger {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);
	}
	.emi__action--danger:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-danger) 18%, transparent);
	}

	/* ── Attributes toggle ─────────────────────────────────────────────────── */
	.emi__attrs-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 10px 20px;
		border-top: 1px solid var(--border);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--fg-subtle);
		cursor: pointer;
		text-align: left;
		transition: background-color var(--transition);
	}
	.emi__attrs-toggle:hover { background: var(--hover); }

	.emi__attrs-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		background: var(--hover);
		color: var(--fg-muted);
		font-size: 0.625rem;
		font-weight: 700;
		border: 1px solid var(--border);
	}

	.emi__attrs-toggle :global(svg) { margin-left: auto; }

	/* ── Attribute rows ────────────────────────────────────────────────────── */
	.emi__attrs {
		display: flex;
		flex-direction: column;
		padding-bottom: 8px;
	}

	.emi__attr-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 7px 20px;
		font-size: 0.8125rem;
	}
	.emi__attr-row:nth-child(odd) {
		background: color-mix(in srgb, var(--fg) 3%, transparent);
	}

	.emi__attr-key {
		color: var(--fg-muted);
		text-transform: capitalize;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.emi__attr-val {
		color: var(--fg);
		font-variant-numeric: tabular-nums;
		text-align: right;
		word-break: break-word;
		max-width: 60%;
	}

	/* ── Spinner ───────────────────────────────────────────────────────────── */
	.emi__spin {
		display: inline-block;
		width: 16px; height: 16px;
		border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
