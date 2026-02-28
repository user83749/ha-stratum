<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { alarmService } from '$lib/ha/services';

	interface Props { tile: Tile; entity: HassEntity | null; }
	const { tile, entity }: Props = $props();

  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );
	const entityId    = $derived(entity?.entity_id ?? '');
	const entityState = $derived(entity?.state ?? 'unknown');
	const name        = $derived((tile.config.name as string | undefined) ?? (entity?.attributes.friendly_name as string | undefined) ?? 'Alarm');
	const isArmed     = $derived(entityState.startsWith('armed'));
	const isDisarmed  = $derived(entityState === 'disarmed');
	const isTriggered = $derived(entityState === 'triggered');
	const isPending   = $derived(entityState === 'pending' || entityState === 'arming');
	const unavailable = $derived(entityState === 'unavailable' || entityState === 'unknown');

	const stateColor = $derived(
		isTriggered ? 'var(--color-danger)' :
		isPending   ? 'var(--color-warning)' :
		isArmed     ? 'var(--color-on)' :
		'var(--fg-subtle)'
	);

	const stateIcon = $derived(
		isTriggered ? 'siren' :
		isArmed     ? 'shield-check' :
		isPending   ? 'shield-alert' :
		'shield-off'
	);

	const stateLabel = $derived(({
		disarmed: 'Disarmed', armed_home: 'Home', armed_away: 'Away',
		armed_night: 'Night', armed_vacation: 'Vacation', armed_custom_bypass: 'Custom',
		pending: 'Pending', arming: 'Arming', triggered: 'TRIGGERED'
	} as Record<string, string>)[entityState] ?? entityState.replace(/_/g, ' '));
	const showActions = $derived(sizePreset !== 'sm');
	const showKeypad = $derived((sizePreset === 'lg' || sizePreset === 'xl') && tile.config.show_keypad !== false);

	let code = $state('');
	let pendingAction = $state<'disarm'|'arm_home'|'arm_away'|'arm_night'|null>(null);

	function arm(action: typeof pendingAction) {
		if (!entityId || !action) return;
		if (code || tile.config.show_keypad === false) {
			const c = code || undefined;
			if (action === 'disarm')    alarmService.disarm(entityId, c);
			if (action === 'arm_home')  alarmService.armHome(entityId, c);
			if (action === 'arm_away')  alarmService.armAway(entityId, c);
			if (action === 'arm_night') alarmService.armNight(entityId, c);
			code = ''; pendingAction = null;
		} else {
			pendingAction = action;
		}
	}

	function digit(d: string) { if (code.length < 8) code += d; }
	function backspace() { code = code.slice(0, -1); }
	function confirm() { if (pendingAction) arm(pendingAction); }
</script>

<div class="ap" class:ap--triggered={isTriggered} class:ap--pending={isPending} data-size={sizePreset} style="--c:{stateColor}">

	<!-- MICRO -->
	<div class="ap__micro">
		<div class="ap__micro-icon"><Icon name={stateIcon} /></div>
	</div>

	<!-- COMPACT -->
	<div class="ap__compact">
		<div class="ap__icon-wrap"><Icon name={stateIcon} /></div>
		<div class="ap__col">
			<span class="ap__name">{name}</span>
			<span class="ap__state">{stateLabel}</span>
		</div>
	</div>

	<!-- STANDARD -->
	<div class="ap__standard">
		<div class="ap__header">
			<div class="ap__icon-wrap"><Icon name={stateIcon} /></div>
			<span class="ap__name">{name}</span>
		</div>

		<div class="ap__hero">
			<span class="ap__hero-text">{stateLabel}</span>
		</div>

		{#if showActions}
		<div class="ap__actions">
			{#if isDisarmed}
				<button class="ap__btn" onclick={() => arm('arm_home')} disabled={unavailable} aria-label="Arm home"><Icon name="house" /> Home</button>
				<button class="ap__btn" onclick={() => arm('arm_away')} disabled={unavailable} aria-label="Arm away"><Icon name="plane" /> Away</button>
				<button class="ap__btn" onclick={() => arm('arm_night')} disabled={unavailable} aria-label="Arm night"><Icon name="moon" /> Night</button>
			{:else}
				<button class="ap__btn ap__btn--disarm" onclick={() => arm('disarm')} disabled={unavailable || isTriggered} aria-label="Disarm"><Icon name="shield-off" /> Disarm</button>
			{/if}
		</div>
		{/if}

		{#if showKeypad}
			<div class="ap__keypad">
				<div class="ap__code-display">
					{#each {length: 8} as _, i}
						<div class="ap__dot" class:ap__dot--filled={i < code.length}></div>
					{/each}
				</div>
				<div class="ap__grid">
					{#each ['1','2','3','4','5','6','7','8','9'] as k}
						<button class="ap__key" onclick={() => digit(k)} disabled={!pendingAction} aria-label={k}>{k}</button>
					{/each}
					<button class="ap__key ap__key--sym" onclick={backspace} disabled={!pendingAction} aria-label="Backspace"><Icon name="delete" /></button>
					<button class="ap__key" onclick={() => digit('0')} disabled={!pendingAction} aria-label="0">0</button>
					<button class="ap__key ap__key--ok" onclick={confirm} disabled={!pendingAction || !code} aria-label="Confirm"><Icon name="check" /></button>
				</div>
				{#if !pendingAction}
					<div class="ap__key-actions">
						{#if isDisarmed}
							<button class="ap__kbtn" onclick={() => { code=''; pendingAction='arm_home'; }} disabled={unavailable}>Home</button>
							<button class="ap__kbtn" onclick={() => { code=''; pendingAction='arm_away'; }} disabled={unavailable}>Away</button>
							<button class="ap__kbtn" onclick={() => { code=''; pendingAction='arm_night'; }} disabled={unavailable}>Night</button>
						{:else}
							<button class="ap__kbtn ap__kbtn--danger" onclick={() => { code=''; pendingAction='disarm'; }} disabled={unavailable}>Disarm</button>
						{/if}
					</div>
				{:else}
					<button class="ap__cancel" onclick={() => { code=''; pendingAction=null; }}>Cancel</button>
				{/if}
			</div>
		{/if}
	</div>

</div>

<style>
	@keyframes triggered { 0%,100%{background:transparent} 50%{background:color-mix(in srgb,var(--color-danger) 12%,transparent)} }
	@keyframes pending   { 0%,100%{opacity:1} 50%{opacity:.55} }

	.ap {
		width:100%; height:100%; box-sizing:border-box;
		overflow:hidden;
	}
	.ap--triggered { animation:triggered 1s ease-in-out infinite; }
	.ap--pending   { animation:pending 1.5s ease-in-out infinite; }

	.ap__micro    { display:none; }
	.ap__compact  { display:none; }
	.ap__standard { display:flex; flex-direction:column; gap:10px; width:100%; height:100%; }

	.ap__icon-wrap {
		flex-shrink:0; display:flex; align-items:center; justify-content:center;
		width:36px; height:36px; border-radius:50%;
		color:var(--c); background:color-mix(in srgb,var(--c) 14%,transparent);
		transition:color var(--transition),background var(--transition);
	}
	.ap__micro-icon {
		display:flex; align-items:center; justify-content:center;
		width:52px; height:52px; border-radius:50%;
		color:var(--c); background:color-mix(in srgb,var(--c) 14%,transparent);
		transition:color var(--transition),background var(--transition);
	}
	.ap__header { display:flex; align-items:center; gap:10px; flex-shrink:0; }
	.ap__name { font-size:.875rem; font-weight:600; color:var(--fg); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
	.ap__col { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
	.ap__state { font-size:.75rem; font-weight:700; color:var(--c); transition:color var(--transition); }

	.ap__hero { flex:1; display:flex; align-items:center; }
	.ap__hero-text {
		font-size:clamp(1.4rem,10cqw,2.8rem); font-weight:800;
		color:var(--c); line-height:1; letter-spacing:-.03em;
		transition:color var(--transition);
	}

	.ap__actions { display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0; }
	.ap__btn {
		display:inline-flex; align-items:center; gap:5px;
		padding:5px 12px; border-radius:999px; font-size:.72rem; font-weight:600;
		border:1px solid var(--border); background:transparent; color:var(--fg-muted);
		cursor:pointer; transition:background var(--transition),color var(--transition),border-color var(--transition);
	}
	.ap__btn:hover:not(:disabled) { background:var(--hover); color:var(--fg); }
	.ap__btn--disarm:hover:not(:disabled) {
		background:color-mix(in srgb,var(--color-danger) 12%,transparent);
		color:var(--color-danger); border-color:color-mix(in srgb,var(--color-danger) 35%,transparent);
	}
	.ap__btn:disabled { opacity:.35; cursor:not-allowed; }

	.ap__keypad { display:none; flex-direction:column; gap:8px; flex-shrink:0; }
	.ap__code-display { display:flex; gap:7px; justify-content:center; padding:2px 0; }
	.ap__dot {
		width:9px; height:9px; border-radius:50%;
		border:1.5px solid var(--border-strong);
		transition:background var(--transition),border-color var(--transition);
	}
	.ap__dot--filled { background:var(--c); border-color:var(--c); }
	.ap__grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }
	.ap__key {
		height:40px; border-radius:var(--radius-sm); border:1px solid var(--border);
		background:transparent; color:var(--fg); font-size:.95rem; font-weight:500;
		cursor:pointer; transition:background var(--transition);
	}
	.ap__key:hover:not(:disabled) { background:var(--hover); }
	.ap__key:active:not(:disabled) { background:var(--active); }
	.ap__key:disabled { opacity:.25; cursor:not-allowed; }
	.ap__key--sym { color:var(--fg-muted); }
	.ap__key--ok { color:var(--color-on); border-color:color-mix(in srgb,var(--color-on) 35%,transparent); }
	.ap__key--ok:hover:not(:disabled) { background:color-mix(in srgb,var(--color-on) 12%,transparent); }
	.ap__key-actions { display:flex; gap:5px; }
	.ap__kbtn {
		flex:1; padding:7px 0; border-radius:var(--radius-sm); border:1px solid var(--border);
		background:transparent; color:var(--fg-muted); font-size:.75rem; font-weight:600;
		cursor:pointer; transition:background var(--transition),color var(--transition);
	}
	.ap__kbtn:hover:not(:disabled) { background:var(--hover); color:var(--fg); }
	.ap__kbtn--danger:hover:not(:disabled) {
		background:color-mix(in srgb,var(--color-danger) 12%,transparent);
		color:var(--color-danger); border-color:color-mix(in srgb,var(--color-danger) 35%,transparent);
	}
	.ap__kbtn:disabled { opacity:.35; cursor:not-allowed; }
	.ap__cancel {
		padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border);
		background:transparent; color:var(--fg-subtle); font-size:.72rem;
		cursor:pointer; width:100%; transition:background var(--transition),color var(--transition);
	}
	.ap__cancel:hover { background:var(--hover); color:var(--fg); }

	@container tile (max-width:120px) {
		.ap__micro { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
		.ap__compact { display:none; }
		.ap__standard { display:none; }
	}
	@container tile (min-width:121px) and (max-height:80px) {
		.ap__micro { display:none; }
		.ap__compact { display:flex; align-items:center; gap:10px; width:100%; height:100%; }
		.ap__standard { display:none; }
	}
	@container tile (min-width:121px) and (min-height:81px) {
		.ap__micro { display:none; }
		.ap__compact { display:none; }
		.ap__standard { display:flex; }
	}
	@container tile (min-width:121px) and (min-height:260px) {
		.ap__keypad { display:flex; }
		.ap__actions { display:none; }
	}

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    :global(.hue-icon-wrap) { width: 38px !important; height: 38px !important; }
    :global(.vac-btn), :global(.fan-btn), :global(.icon-badge), :global(.power-btn), :global(.avatar-wrap) { width: 44px !important; height: 44px !important; }
    :global(.bottom) { gap: 0px !important; }
    :global(.tile-content) { padding-bottom: 2px !important; }
  }


  .name-text {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .state-text {
    line-height: 1.15;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
