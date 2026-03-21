<script lang="ts">
	// ── TvMoreInfo ────────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import Icon from '$lib/components/ui/Icon.svelte';
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { mediaService, remoteService } from '$lib/ha/services';
	import type { Tile } from '$lib/types/dashboard';
	import { resolveTvCommandEntityId, type TvRemoteCommand } from '$lib/ha/tvRemote';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props { entityId: string; tile?: Tile | null; }
	const { entityId, tile = null }: Props = $props();

	// ── Derived State ─────────────────────────────────────────────────────────
	const tvRemoteEntities = $derived((tile?.config.tv_remote_entities as Record<string, string> | undefined) ?? {});
	const optimisticPreviewEnabled = false;
	const remoteCommandMap: Partial<Record<TvRemoteCommand, string>> = {
		home: 'Home',
		back: 'Return',
		up: 'CursorUp',
		down: 'CursorDown',
		left: 'CursorLeft',
		right: 'CursorRight',
		select: 'DpadCenter'
	};
	function resolveTarget(cmd: TvRemoteCommand): string {
		return resolveTvCommandEntityId(cmd, entityId, tvRemoteEntities, $optimisticEntities);
	}
	const powerTargetId = $derived(resolveTarget('power'));
	const powerTarget = $derived($optimisticEntities[powerTargetId] ?? null);
	const powerDomain = $derived(powerTargetId.split('.')[0] ?? '');
	const powerState = $derived(powerTarget?.state ?? 'off');
	const powerUnavailable = $derived(powerState === 'unavailable' || !powerTarget);
	const isPowered = $derived.by(() => {
		if (powerDomain === 'remote') return powerState === 'on';
		if (powerDomain === 'media_player') {
			return !['off', 'standby', 'unknown', 'unavailable'].includes(powerState);
		}
		return false;
	});
	function targetDomain(cmd: TvRemoteCommand): string {
		return resolveTarget(cmd).split('.')[0] ?? '';
	}

	function canSend(cmd: TvRemoteCommand): boolean {
		const targetId = resolveTarget(cmd);
		const domain = targetDomain(cmd);
		const targetEntity = $optimisticEntities[targetId] ?? null;
		if (!targetEntity || targetEntity.state === 'unavailable') return false;
		if (domain === 'remote') return true;
		if (domain === 'media_player') {
			return ['volume_up', 'volume_down', 'channel_up', 'channel_down', 'select'].includes(cmd);
		}
		return false;
	}

	function canTogglePower(): boolean {
		const domain = targetDomain('power');
		return domain === 'remote' || domain === 'media_player';
	}

	// ── Actions ───────────────────────────────────────────────────────────────
	function sendCmd(cmd: TvRemoteCommand) {
		if (!canSend(cmd)) return;
		if (optimisticPreviewEnabled) return;
		const targetId = resolveTarget(cmd);
		const domain = targetId.split('.')[0] ?? '';

		// If this is a remote.* entity, send navigation/rocker commands.
		if (domain === 'remote') {
			const remoteCommand = remoteCommandMap[cmd] ?? cmd;
			remoteService.sendCommand(targetId, [remoteCommand]).catch(() => {});
			return;
		}

		// For media_player.* TVs, only map commands that HA supports universally.
		switch (cmd) {
			case 'volume_up': if (domain === 'media_player') mediaService.volumeUp(targetId).catch(() => {}); return;
			case 'volume_down': if (domain === 'media_player') mediaService.volumeDown(targetId).catch(() => {}); return;
			case 'channel_up': if (domain === 'media_player') mediaService.next(targetId).catch(() => {}); return;
			case 'channel_down': if (domain === 'media_player') mediaService.previous(targetId).catch(() => {}); return;
			case 'select': if (domain === 'media_player') mediaService.playPause(targetId).catch(() => {}); return;
			default: return;
		}
	}

	function toggle() {
		if (powerUnavailable) return;
		const targetId = resolveTarget('power');
		const domain = targetId.split('.')[0] ?? '';
		if (domain !== 'remote' && domain !== 'media_player') return;
		if (optimisticPreviewEnabled) applyPatch(targetId, { state: isPowered ? 'off' : 'on' });
		else (domain === 'remote'
			? (isPowered ? remoteService.turnOff(targetId) : remoteService.turnOn(targetId))
			: (isPowered ? mediaService.turnOff(targetId) : mediaService.turnOn(targetId))
		).catch(() => {});
	}
</script>

<div class="tvmi">
	<!-- Hero Status Row -->
	<div class="tvmi__hero">
		<div class="tvmi__icon" class:tvmi__icon--active={isPowered}>
			<Icon name="tv" size={26} />
		</div>
		<div class="tvmi__hero-copy">
			<div class="tvmi__value">{isPowered ? 'Powered On' : 'Standby'}</div>
			<div class="tvmi__sub">Television Status</div>
		</div>
		<button class="tvmi__power" class:tvmi__power--on={isPowered} onclick={toggle} disabled={powerUnavailable || !canTogglePower()}>
			<Icon name="power" size={18} />
		</button>
	</div>

	<div class="tvmi__body">
		<!-- System Row -->
		<div class="tvmi__grid">
			<button class="tvmi__btn" onclick={() => sendCmd('home')} disabled={!canSend('home')}>
				<Icon name="house" size={18} />
				<span>Home</span>
			</button>
			<button class="tvmi__btn" onclick={() => sendCmd('back')} disabled={!canSend('back')}>
				<Icon name="undo-2" size={18} />
				<span>Back</span>
			</button>
			<button class="tvmi__btn" onclick={() => sendCmd('menu')} disabled={!canSend('menu')}>
				<Icon name="menu" size={18} />
				<span>Menu</span>
			</button>
		</div>

		<!-- D-Pad -->
		<div class="tvmi__navigation">
			<div class="tvmi__dpad">
				<button class="tvmi__dpad-btn tvmi__dpad-btn--up" onclick={() => sendCmd('up')} disabled={!canSend('up')}><Icon name="chevron-up" size={22} /></button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--left" onclick={() => sendCmd('left')} disabled={!canSend('left')}><Icon name="chevron-left" size={22} /></button>
				<button class="tvmi__dpad-center" onclick={() => sendCmd('select')} disabled={!canSend('select')}>OK</button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--right" onclick={() => sendCmd('right')} disabled={!canSend('right')}><Icon name="chevron-right" size={22} /></button>
				<button class="tvmi__dpad-btn tvmi__dpad-btn--down" onclick={() => sendCmd('down')} disabled={!canSend('down')}><Icon name="chevron-down" size={22} /></button>
			</div>
		</div>

		<!-- Rockers -->
		<div class="tvmi__rockers">
			<div class="tvmi__rocker">
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('volume_up')} disabled={!canSend('volume_up')}>+</button>
				<span class="tvmi__rocker-label">VOL</span>
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('volume_down')} disabled={!canSend('volume_down')}>-</button>
			</div>
			<div class="tvmi__rocker">
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('channel_up')} disabled={!canSend('channel_up')}>+</button>
				<span class="tvmi__rocker-label">CH</span>
				<button class="tvmi__rocker-btn" onclick={() => sendCmd('channel_down')} disabled={!canSend('channel_down')}>-</button>
			</div>
		</div>
	</div>
</div>

<style>
	.tvmi {
		display: flex;
		flex-direction: column;
		min-height: 100%;
		color: var(--fg);
		background: var(--bg-elevated);
		--tvmi-radius-md: var(--radius);
		--tvmi-radius-lg: var(--radius-lg);
		--tvmi-surface-soft: var(--hover);
		--tvmi-surface-strong: var(--active);
	}
	
	.tvmi__hero { display: flex; align-items: center; gap: 16px; padding: 22px 20px 18px; border-bottom: 1px solid var(--border); }
	.tvmi__icon { 
		width: 52px; height: 52px; border-radius: var(--tvmi-radius-md);
		display: flex; align-items: center; justify-content: center; 
		background: var(--tvmi-surface-soft); color: var(--fg-subtle); border: 1px solid var(--border); 
	}
	.tvmi__icon--active { background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 25%, transparent); }
	.tvmi__hero-copy { flex: 1; }
	.tvmi__value { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.01em; }
	.tvmi__sub { font-size: 0.75rem; font-weight: 700; color: var(--fg-subtle); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }

	.tvmi__power {
		all: unset; width: 44px; height: 44px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		background: var(--tvmi-surface-soft); color: var(--fg-muted); border: 1px solid var(--border);
		cursor: pointer; transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease, filter 0.12s ease;
	}
	.tvmi__power--on { color: var(--color-on); border-color: color-mix(in srgb, var(--color-on) 30%, transparent); background: color-mix(in srgb, var(--color-on) 10%, transparent); }
	.tvmi__power:hover:not(:disabled) { background: var(--tvmi-surface-strong); color: var(--fg); border-color: var(--border-strong); }
	.tvmi__power--on:hover:not(:disabled) { background: color-mix(in srgb, var(--color-on) 18%, transparent); color: var(--color-on); border-color: color-mix(in srgb, var(--color-on) 38%, transparent); }
	.tvmi__power:active:not(:disabled) { background: var(--tvmi-surface-strong); color: var(--fg); border-color: var(--border-strong); filter: brightness(1.08); }
	.tvmi__power--on:active:not(:disabled) { background: color-mix(in srgb, var(--color-on) 22%, transparent); color: var(--color-on); border-color: color-mix(in srgb, var(--color-on) 42%, transparent); filter: brightness(1.08); }

	.tvmi__body { padding: 24px 20px; display: flex; flex-direction: column; gap: 32px; }

	.tvmi__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
	.tvmi__btn {
		all: unset; display: flex; flex-direction: column; align-items: center; gap: 8px;
		padding: 14px; border-radius: var(--tvmi-radius-lg); border: 1px solid var(--border);
		background: var(--tvmi-surface-soft); color: var(--fg-muted); font-size: 0.8rem; font-weight: 700;
		cursor: pointer; transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease, filter 0.12s ease;
	}
	.tvmi__btn:hover:not(:disabled) { background: var(--tvmi-surface-strong); color: var(--fg); border-color: var(--border-strong); }
	.tvmi__btn:active:not(:disabled) { background: var(--tvmi-surface-strong); color: var(--fg); border-color: var(--border-strong); filter: brightness(1.08); }

	.tvmi__navigation { display: flex; justify-content: center; }
	.tvmi__dpad { display: grid; grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(3, 64px); gap: 12px; }
	.tvmi__dpad-btn {
		all: unset; display: flex; align-items: center; justify-content: center;
		background: var(--tvmi-surface-soft); border: 1px solid var(--border); border-radius: var(--tvmi-radius-lg);
		color: var(--fg-muted); cursor: pointer; transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease, filter 0.12s ease;
	}
	.tvmi__dpad-btn:active:not(:disabled) { background: var(--tvmi-surface-strong); color: var(--fg); border-color: var(--border-strong); filter: brightness(1.08); }
	.tvmi__dpad-btn--up { grid-column: 2; grid-row: 1; }
	.tvmi__dpad-btn--left { grid-column: 1; grid-row: 2; }
	.tvmi__dpad-btn--right { grid-column: 3; grid-row: 2; }
	.tvmi__dpad-btn--down { grid-column: 2; grid-row: 3; }
	.tvmi__dpad-center {
		grid-column: 2; grid-row: 2; border-radius: 50%; border: none;
		background: var(--accent); color: var(--accent-fg); font-weight: 800; font-size: 1rem; cursor: pointer;
		transition: filter 0.12s ease;
	}
	.tvmi__dpad-center:active:not(:disabled) { filter: brightness(1.12); }

	.tvmi__rockers { display: flex; justify-content: center; gap: 40px; }
	.tvmi__rocker { display: flex; flex-direction: column; align-items: center; width: 64px; background: var(--tvmi-surface-soft); border: 1px solid var(--border); border-radius: var(--tvmi-radius-lg); overflow: hidden; }
	.tvmi__rocker-btn {
		all: unset; width: 100%; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; cursor: pointer;
		transition: background-color 0.12s ease, filter 0.12s ease;
	}
	.tvmi__rocker-btn:active:not(:disabled) { background: color-mix(in srgb, var(--fg) 8%, transparent); filter: brightness(1.08); }
	.tvmi__rocker-label { font-size: 0.65rem; font-weight: 800; color: var(--fg-subtle); padding: 4px 0; }

	button:disabled { opacity: 0.3 !important; cursor: not-allowed; }
</style>
