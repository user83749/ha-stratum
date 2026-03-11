<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { Tile } from '$lib/types/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import BaseTile from '$lib/components/tiles/BaseTile.svelte';
	import { alarmService } from '$lib/ha/services';
	import { isCustomIcon } from '$lib/icons/customIcons';

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
	const iconOverride = $derived(((tile.config.icon as string | undefined) ?? '').trim() || undefined);
	const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
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
		disarmed: 'Disarmed',
		armed_home: 'Home',
		armed_away: 'Away',
		armed_night: 'Night',
		armed_vacation: 'Vacation',
		armed_custom_bypass: 'Custom',
		pending: 'Pending',
		arming: 'Arming',
		triggered: 'TRIGGERED'
	} as Record<string, string>)[entityState] ?? entityState.replace(/_/g, ' '));

	// NOTE: we still compute these, but CSS controls actual visibility by sizePreset
	const showActions = $derived(sizePreset !== 'sm');
	const showKeypad = $derived((sizePreset === 'lg' || sizePreset === 'xl') && tile.config.show_keypad !== false);

	let code = $state('');
	let pendingAction = $state<'disarm' | 'arm_home' | 'arm_away' | 'arm_night' | null>(null);

	function arm(action: typeof pendingAction) {
		if (!entityId || !action) return;

		if (code || tile.config.show_keypad === false) {
			const c = code || undefined;
			if (action === 'disarm') alarmService.disarm(entityId, c);
			if (action === 'arm_home') alarmService.armHome(entityId, c);
			if (action === 'arm_away') alarmService.armAway(entityId, c);
			if (action === 'arm_night') alarmService.armNight(entityId, c);
			code = '';
			pendingAction = null;
		} else {
			pendingAction = action;
		}
	}

	function digit(d: string) { if (code.length < 8) code += d; }
	function backspace() { code = code.slice(0, -1); }
	function confirm() { if (pendingAction) arm(pendingAction); }
</script>

<BaseTile {name} state={stateLabel} isOn={isArmed || isPending || isTriggered} style="--c:{stateColor}">

	{#snippet icon()}
		<div class="ap__icon-wrap" class:override={!!iconOverride} class:is-custom={overrideIsCustom}>
			{#if iconOverride}
				{#if overrideIsCustom}
					<Icon name={iconOverride} entity={entity} />
				{:else}
					<Icon name={iconOverride} entity={entity} size="100%" />
				{/if}
			{:else}
				<Icon name={stateIcon} size="100%" />
			{/if}
		</div>
	{/snippet}

	{#snippet below()}
		{#if showActions}
			<div class="ap__actions">
				{#if isDisarmed}
					<button class="ap__btn" onclick={() => arm('arm_home')} disabled={unavailable} aria-label="Arm home">
						<Icon name="house" /> Home
					</button>
					<button class="ap__btn" onclick={() => arm('arm_away')} disabled={unavailable} aria-label="Arm away">
						<Icon name="plane" /> Away
					</button>
					<button class="ap__btn" onclick={() => arm('arm_night')} disabled={unavailable} aria-label="Arm night">
						<Icon name="moon" /> Night
					</button>
				{:else}
					<button
						class="ap__btn ap__btn--disarm"
						onclick={() => arm('disarm')}
						disabled={unavailable || isTriggered}
						aria-label="Disarm"
					>
						<Icon name="shield-off" /> Disarm
					</button>
				{/if}
			</div>
		{/if}

		{#if showKeypad}
			<div class="ap__keypad">
				<div class="ap__code-display">
					{#each { length: 8 } as _, i}
						<div class="ap__dot" class:ap__dot--filled={i < code.length}></div>
					{/each}
				</div>

				<div class="ap__grid">
					{#each ['1','2','3','4','5','6','7','8','9'] as k}
						<button class="ap__key" onclick={() => digit(k)} disabled={!pendingAction} aria-label={k}>
							{k}
						</button>
					{/each}

					<button class="ap__key ap__key--sym" onclick={backspace} disabled={!pendingAction} aria-label="Backspace">
						<Icon name="delete" />
					</button>

					<button class="ap__key" onclick={() => digit('0')} disabled={!pendingAction} aria-label="0">0</button>

					<button class="ap__key ap__key--ok" onclick={confirm} disabled={!pendingAction || !code} aria-label="Confirm">
						<Icon name="check" />
					</button>
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
	{/snippet}
</BaseTile>

<style>
	@keyframes triggered {
		0%, 100% { background: transparent; }
		50% { background: color-mix(in srgb, var(--color-danger) 12%, transparent); }
	}
	@keyframes pending {
		0%, 100% { opacity: 1; }
		50% { opacity: .55; }
	}

	.ap__icon-wrap {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 50%;
		color: var(--c);
		background: color-mix(in srgb, var(--c) 14%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color var(--transition), background var(--transition);
	}

	.ap__icon-wrap.is-custom {
		display: block;
		line-height: 0;
		overflow: visible;
	}

	/* If the user explicitly overrides the icon, remove the badge/chip behind it. */
	.ap__icon-wrap.override {
		background: transparent;
	}

	/* Actions */
	.ap__actions {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
		margin-top: 6px;
	}

	.ap__btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: calc(var(--action-icon-size) * 0.95);
		padding: 0 calc(var(--tile-padding-effective) * 1.1);
		border-radius: 999px;
		font-size: var(--secondary-label-size);
		font-weight: 500;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		transition: all var(--transition);
	}

	.ap__btn:hover:not(:disabled) {
		background: var(--hover);
		color: var(--fg);
	}

	/* Keypad base */
	.ap__keypad {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
	}

	.ap__code-display {
		display: flex;
		gap: 7px;
		justify-content: center;
		padding: 2px 0;
	}

	.ap__dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--border-strong);
	}

	.ap__dot--filled {
		background: var(--c);
		border-color: var(--c);
	}

	.ap__grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 5px;
	}

	.ap__key {
		height: var(--action-icon-size-lg);
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg);
		font-size: var(--secondary-label-size);
		font-weight: 500;
		cursor: pointer;
	}

	.ap__key:disabled { opacity: 0.35; cursor: default; }

	.ap__key-actions {
		display: flex;
		gap: 6px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.ap__kbtn {
		height: var(--action-icon-size);
		padding: 0 12px;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg);
		font-size: var(--secondary-label-size);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition);
	}

	.ap__kbtn:hover:not(:disabled) { background: var(--hover); }
	.ap__kbtn:disabled { opacity: 0.35; cursor: default; }

	.ap__kbtn--danger {
		border-color: color-mix(in srgb, var(--color-danger) 40%, var(--border));
		color: var(--color-danger);
	}

	.ap__cancel {
		height: var(--action-icon-size);
		border-radius: 999px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		font-size: var(--secondary-label-size);
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition);
	}

	.ap__cancel:hover { background: var(--hover); color: var(--fg); }

	@container tile (max-width: 190px) {
		.ap__actions {
			gap: 4px;
		}

		.ap__btn {
			padding: 0 calc(var(--tile-padding-effective) * 0.9);
		}
	}
</style>
