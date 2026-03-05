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
	const state = $derived(entity?.state ?? 'off');
	const isUnavail = $derived(state === 'unavailable' || !entity);
	const isOn = $derived(state === 'on');

	function sendCmd(cmd: string) {
		if (isUnavail) return;
		if (isDemo) return;
		remoteService.sendCommand(entityId, [cmd]).catch(() => {});
	}

	function toggle() {
		if (isUnavail) return;
		if (isDemo) applyPatch(entityId, { state: isOn ? 'off' : 'on' });
		else (isOn ? remoteService.turnOff(entityId) : remoteService.turnOn(entityId)).catch(() => {});
	}
</script>

<div class="tvmi">
	<!-- Hero Status Row -->
	<div class="tvmi__hero">
		<div class="tvmi__icon" class:tvmi__icon--active={isOn}>
			<Icon name="tv" size={26} />
		</div>
		<div class="tvmi__hero-copy">
			<div class="tvmi__value">{isOn ? 'Powered On' : 'Standby'}</div>
			<div class="tvmi__sub">Television Status</div>
		</div>
		<button class="tvmi__power" class:tvmi__power--on={isOn} onclick={toggle} disabled={isUnavail}>
			<Icon name="power" size={18} />
		</button>
	</div>

	<div class="tvmi__body">
		<!-- System Row -->
		<div class="tvmi__grid">
			<button class="tvmi__btn" onclick={() => sendCmd('house')} disabled={isUnavail}>
				<Icon name="house" size={18} />
				<span>Home</span>
			</button>
			<button class="tvmi__btn" onclick={() => sendCmd('back')} disabled={isUnavail}>
				<Icon name="undo-2" size={18} />
				<span>Back</span>
			</button>
			<button class="tvmi__btn" onclick={() => sendCmd('menu')} disabled={isUnavail}>
				<Icon name="menu" size={18} />
				<span>Menu</span>
			</button>
		</div>

		<!-- D-Pad -->
		<div class="tvmi__navigation">
			<div class="tvmi__dpad">
				<button class="tvmi__dpad-btn tvmi__dpad-btn--up" onclick={() => sendCmd('up')} disabled={isUnavail}><Icon name="chevron-up" size={22} /></button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--left" onclick={() => sendCmd('left')} disabled={isUnavail}><Icon name="chevron-left" size={22} /></button>
				<button class="tvmi__dpad-center" onclick={() => sendCmd('select')} disabled={isUnavail}>OK</button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--right" onclick={() => sendCmd('right')} disabled={isUnavail}><Icon name="chevron-right" size={22} /></button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--down" onclick={() => sendCmd('down')} disabled={isUnavail}><Icon name="chevron-down" size={22} /></button>
			</div>
		</div>

		<!-- Rockers -->
		<div class="tvmi__rockers">
			<div class="tvmi__rocker">
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('volume_up')} disabled={isUnavail}>+</button>
				<span class="tvmi__rocker-label">VOL</span>
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('volume_down')} disabled={isUnavail}>-</button>
			</div>
			<div class="tvmi__rocker">
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('channel_up')} disabled={isUnavail}>+</button>
				<span class="tvmi__rocker-label">CH</span>
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('channel_down')} disabled={isUnavail}>-</button>
			</div>
		</div>
	</div>
</div>

<style>
	.tvmi { display: flex; flex-direction: column; min-height: 100%; color: var(--fg); background: var(--bg-elevated); }
	
	.tvmi__hero { display: flex; align-items: center; gap: 16px; padding: 22px 20px 18px; border-bottom: 1px solid var(--border); }
	.tvmi__icon { 
		width: 52px; height: 52px; border-radius: 12px; 
		display: flex; align-items: center; justify-content: center; 
		background: var(--hover); color: var(--fg-subtle); border: 1px solid var(--border); 
	}
	.tvmi__icon--active { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 25%, transparent); }
	.tvmi__hero-copy { flex: 1; }
	.tvmi__value { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; }
	.tvmi__sub { font-size: 0.75rem; font-weight: 700; color: var(--fg-subtle); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }

	.tvmi__power {
		all: unset; width: 44px; height: 44px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		background: var(--hover); color: var(--fg-muted); border: 1px solid var(--border);
		cursor: pointer; transition: all 0.2s;
	}
	.tvmi__power--on { color: var(--color-on); border-color: color-mix(in srgb, var(--color-on) 30%, transparent); background: color-mix(in srgb, var(--color-on) 10%, transparent); }

	.tvmi__body { padding: 24px 20px; display: flex; flex-direction: column; gap: 32px; }

	.tvmi__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
	.tvmi__btn {
		all: unset; display: flex; flex-direction: column; align-items: center; gap: 8px;
		padding: 14px; border-radius: 16px; border: 1px solid var(--border);
		background: var(--hover); color: var(--fg-muted); font-size: 0.8rem; font-weight: 700;
		cursor: pointer; transition: all 0.2s;
	}
	.tvmi__btn:hover:not(:disabled) { background: var(--active); color: var(--fg); border-color: var(--border-strong); }

	.tvmi__navigation { display: flex; justify-content: center; }
	.tvmi__dpad { display: grid; grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(3, 64px); gap: 12px; }
	.tvmi__dpad-btn {
		all: unset; display: flex; align-items: center; justify-content: center;
		background: var(--hover); border: 1px solid var(--border); border-radius: 16px;
		color: var(--fg-muted); cursor: pointer; transition: all 0.2s;
	}
	.tvmi__dpad-btn--up { grid-column: 2; grid-row: 1; }
	.tvmi__dpad-btn--left { grid-column: 1; grid-row: 2; }
	.tvmi__dpad-btn--right { grid-column: 3; grid-row: 2; }
	.tvmi__dpad-btn--down { grid-column: 2; grid-row: 3; }
	.tvmi__dpad-center {
		grid-column: 2; grid-row: 2; border-radius: 50%; border: none;
		background: var(--accent); color: var(--accent-fg); font-weight: 800; font-size: 1rem; cursor: pointer;
	}

	.tvmi__rockers { display: flex; justify-content: center; gap: 40px; }
	.tvmi__rocker { display: flex; flex-direction: column; align-items: center; width: 64px; background: var(--hover); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
	.tvmi__rocker-btn { all: unset; width: 100%; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; cursor: pointer; }
	.tvmi__rocker-label { font-size: 0.65rem; font-weight: 800; color: var(--fg-subtle); padding: 4px 0; }

	button:disabled { opacity: 0.3 !important; cursor: not-allowed; }
</style>
