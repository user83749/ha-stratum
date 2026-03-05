<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { remoteService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const state = $derived(entity?.state ?? 'idle');
	const isUnavail = $derived(state === 'unavailable' || !entity);
	
	const activities = $derived((entity?.attributes.activity_list as string[] | undefined) ?? []);
	const currentActivity = $derived((entity?.attributes.current_activity as string | undefined) ?? '');

	function send(cmd: string) {
		if (isUnavail) return;
		if (isDemo) return;
		remoteService.sendCommand(entityId, [cmd]).catch(() => {});
	}

	function turnOn(act?: string) {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: 'on', attributes: { current_activity: act } });
			return;
		}
		remoteService.turnOn(entityId, act).catch(() => {});
	}

	function turnOff() {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: 'off', attributes: { current_activity: '' } });
			return;
		}
		remoteService.turnOff(entityId).catch(() => {});
	}
</script>

<div class="rmi">
	<!-- Hero Header — Only Show State/Activity (Name is in Shell) -->
	<div class="rmi__hero">
		<div class="rmi__icon"><Icon name="remote" size={26} /></div>
		<div class="rmi__hero-copy">
			<div class="rmi__value">{currentActivity || state}</div>
			<div class="rmi__sub">{currentActivity ? state : 'Remote Status'}</div>
		</div>
	</div>

	<div class="rmi__body">
		<!-- Main Controls Grid -->
		<div class="rmi__grid">
			<button class="rmi__btn rmi__btn--primary" onclick={() => state === 'off' ? turnOn() : turnOff()} disabled={isUnavail}>
				<Icon name="power" size={18} />
				<span>{state === 'off' ? 'Power On' : 'Power Off'}</span>
			</button>
			<button class="rmi__btn" onclick={() => send('home')} disabled={isUnavail}>
				<Icon name="house" size={18} />
				<span>Home</span>
			</button>
			<button class="rmi__btn" onclick={() => send('back')} disabled={isUnavail}>
				<Icon name="undo-2" size={18} />
				<span>Back</span>
			</button>
		</div>

		<!-- D-Pad Navigation -->
		<div class="rmi__section">
			<div class="rmi__label">Navigation</div>
			<div class="rmi__dpad">
				<button class="rmi__dpad-btn rmi__dpad-btn--up" onclick={() => send('up')} disabled={isUnavail}><Icon name="chevron-up" size={20} /></button>
				<button class="rmi__dpad-btn rmi__dpad-btn--left" onclick={() => send('left')} disabled={isUnavail}><Icon name="chevron-left" size={20} /></button>
				<button class="rmi__dpad-center" onclick={() => send('select')} disabled={isUnavail}>OK</button>
				<button class="rmi__dpad-btn rmi__dpad-btn--right" onclick={() => send('right')} disabled={isUnavail}><Icon name="chevron-right" size={20} /></button>
				<button class="rmi__dpad-btn rmi__dpad-btn--down" onclick={() => send('down')} disabled={isUnavail}><Icon name="chevron-down" size={20} /></button>
			</div>
		</div>

		<!-- Volume & Channel -->
		<div class="rmi__section">
			<div class="rmi__label">Controls</div>
			<div class="rmi__rockers">
				<div class="rmi__group">
					<button class="rmi__group-btn" onclick={() => send('volume_down')} disabled={isUnavail}>-</button>
					<span class="rmi__group-label">VOL</span>
					<button class="rmi__group-btn" onclick={() => send('volume_up')} disabled={isUnavail}>+</button>
				</div>
				<div class="rmi__group">
					<button class="rmi__group-btn" onclick={() => send('channel_down')} disabled={isUnavail}>-</button>
					<span class="rmi__group-label">CH</span>
					<button class="rmi__group-btn" onclick={() => send('channel_up')} disabled={isUnavail}>+</button>
				</div>
			</div>
		</div>

		<!-- Activities -->
		{#if activities.length > 0}
			<div class="rmi__section">
				<div class="rmi__label">Activities</div>
				<div class="rmi__activities">
					{#each activities as act}
						<button 
							class="rmi__activity-btn" 
							class:rmi__activity-btn--active={act === currentActivity}
							onclick={() => turnOn(act)}
							disabled={isUnavail}
						>
							{act}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.rmi { display: flex; flex-direction: column; min-height: 100%; color: var(--fg); }
	
	/* Header */
	.rmi__hero { display: flex; align-items: center; gap: 16px; padding: 22px 20px 18px; border-bottom: 1px solid var(--border); }
	.rmi__icon { 
		width: 56px; height: 56px; border-radius: var(--radius); 
		display: flex; align-items: center; justify-content: center; 
		background: color-mix(in srgb, var(--accent) 10%, transparent); 
		color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent); 
		flex-shrink: 0; 
	}
	.rmi__value { font-size: 1.25rem; font-weight: 700; line-height: 1.1; text-transform: capitalize; }
	.rmi__sub { margin-top: 4px; font-size: 0.8rem; color: var(--fg-subtle); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }

	.rmi__body { padding: 20px; display: flex; flex-direction: column; gap: 24px; }

	/* Grids & Rows */
	.rmi__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
	.rmi__rockers { display: flex; gap: 12px; }

	/* Buttons */
	.rmi__btn {
		display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
		padding: 12px; border-radius: var(--radius); border: 1px solid var(--border);
		background: var(--hover); color: var(--fg-muted); font-size: 0.75rem; font-weight: 700;
		cursor: pointer; transition: all 0.2s;
	}
	.rmi__btn--primary { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--fg); border-color: color-mix(in srgb, var(--accent) 24%, transparent); }
	.rmi__btn:hover:not(:disabled) { background: var(--active); color: var(--fg); }

	/* D-Pad */
	.rmi__section { display: flex; flex-direction: column; gap: 12px; }
	.rmi__label { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-subtle); font-weight: 700; }
	.rmi__dpad { display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 56px); gap: 8px; justify-content: center; }
	.rmi__dpad-btn {
		display: flex; align-items: center; justify-content: center; border-radius: 12px;
		border: 1px solid var(--border); background: var(--hover); color: var(--fg-muted); cursor: pointer;
	}
	.rmi__dpad-btn--up { grid-column: 2; grid-row: 1; }
	.rmi__dpad-btn--left { grid-column: 1; grid-row: 2; }
	.rmi__dpad-btn--right { grid-column: 3; grid-row: 2; }
	.rmi__dpad-btn--down { grid-column: 2; grid-row: 3; }
	.rmi__dpad-center {
		grid-column: 2; grid-row: 2; border-radius: 50%; border: none;
		background: var(--accent); color: var(--accent-fg); font-weight: 800; cursor: pointer;
	}

	/* Rocker Group */
	.rmi__group { flex: 1; display: flex; align-items: center; background: var(--hover); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
	.rmi__group-btn { flex: 1; padding: 12px; border: none; background: transparent; color: var(--fg); font-weight: 700; cursor: pointer; }
	.rmi__group-btn:hover { background: var(--active); }
	.rmi__group-label { font-size: 0.65rem; font-weight: 800; color: var(--fg-subtle); padding: 0 4px; }

	/* Activities */
	.rmi__activities { display: flex; flex-direction: column; gap: 6px; }
	.rmi__activity-btn {
		text-align: left; padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border);
		background: var(--hover); color: var(--fg-muted); font-size: 0.85rem; font-weight: 600; cursor: pointer;
	}
	.rmi__activity-btn--active { background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--fg); border-color: var(--accent); }

	button:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
