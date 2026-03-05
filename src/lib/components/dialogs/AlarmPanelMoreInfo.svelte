<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { alarmService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	const __state = $derived((entity?.state as string | undefined) ?? 'unknown');
	
	const codeFormat = $derived(entity?.attributes.code_format as string | undefined);
	const codeRequired = $derived(entity?.attributes.code_arm_required as boolean | undefined);

	let code = $state('');

	const statusColor = $derived(
		__state === 'disarmed' ? 'var(--color-on)' :
		__state === 'pending' || __state === 'arming' ? 'var(--color-warning)' :
		__state === 'triggered' ? 'var(--color-danger)' :
		'var(--color-danger)' // Armed (Away/Home/Night)
	);

	const statusIcon = $derived(
		__state === 'disarmed' ? 'shield-check' :
		__state === 'triggered' ? 'shield-alert' :
		'shield-lock'
	);

	function addDigit(digit: string) { if (code.length < 8) code += digit; }
	function clearCode() { code = ''; }

	function handleAction(action: 'disarm' | 'arm_home' | 'arm_away' | 'arm_night' | 'arm_vacation') {
		if (isUnavail) return;
		if (isDemo) {
			applyPatch(entityId, { state: action === 'disarm' ? 'disarmed' : action });
			code = '';
			return;
		}
		
		const call = 
			action === 'disarm' ? alarmService.disarm(entityId, code) :
			action === 'arm_home' ? alarmService.armHome(entityId, code) :
			action === 'arm_away' ? alarmService.armAway(entityId, code) :
			action === 'arm_night' ? alarmService.armNight(entityId, code) :
			alarmService.armAway(entityId, code);

		call.then(() => { code = ''; }).catch(() => {});
	}
</script>

<div class="ami">
	<div class="ami__header" style="--sc: {statusColor};">
		<div class="ami__icon-wrap">
			<Icon name={statusIcon} size={32} />
		</div>
		<div class="ami__titles">
			<h2 class="ami__title">{__state.replace(/_/g, ' ')}</h2>
			<span class="ami__subtitle">{entity?.attributes.friendly_name ?? 'Alarm System'}</span>
		</div>
		<div class="ami__status-badge" style="background: {statusColor};">
			{__state === 'disarmed' ? 'Secure' : 'Protected'}
		</div>
	</div>

	<div class="ami__body">
		<div class="ami__keypad-section">
			<div class="ami__code-display">
				{#each Array(code.length) as _}
					<div class="ami__dot"></div>
				{/each}
				{#if code.length === 0}
					<span class="ami__placeholder">Enter Code</span>
				{/if}
			</div>

			<div class="ami__keypad">
				{#each ['1','2','3','4','5','6','7','8','9'] as d}
					<button class="ami__key" onclick={() => addDigit(d)}>{d}</button>
				{/each}
				<button class="ami__key ami__key--clear" onclick={clearCode}>C</button>
				<button class="ami__key" onclick={() => addDigit('0')}>0</button>
				<button class="ami__key ami__key--back" onclick={() => code = code.slice(0,-1)}>
					<Icon name="delete" size={20} />
				</button>
			</div>
		</div>

		<div class="ami__actions">
			{#if __state === 'disarmed'}
				<div class="ami__action-grid">
					<button class="ami__action-btn" onclick={() => handleAction('arm_home')}>
						<Icon name="home" size={20} />
						<span>Arm Home</span>
					</button>
					<button class="ami__action-btn ami__action-btn--primary" onclick={() => handleAction('arm_away')}>
						<Icon name="shield-lock" size={20} />
						<span>Arm Away</span>
					</button>
					<button class="ami__action-btn" onclick={() => handleAction('arm_night')}>
						<Icon name="moon" size={20} />
						<span>Arm Night</span>
					</button>
				</div>
			{:else}
				<button 
					class="ami__disarm-btn" 
					onclick={() => handleAction('disarm')} 
					disabled={codeRequired && code.length === 0}
				>
					<Icon name="shield-check" size={24} />
					<span>Disarm System</span>
				</button>
			{/if}
		</div>

		<div class="ami__meta">
			<div class="ami__meta-row">
				<span class="ami__meta-key">Entity ID</span>
				<span class="ami__meta-val">{entityId}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.ami {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 620px;
		color: var(--fg);
	}

	.ami__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.ami__icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(in srgb, var(--sc) 12%, transparent);
		color: var(--sc);
		border: 1px solid color-mix(in srgb, var(--sc) 25%, transparent);
	}

	.ami__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ami__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.ami__subtitle {
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.ami__status-badge {
		padding: 6px 14px;
		border-radius: 99px;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: white;
	}

	.ami__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.ami__keypad-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	.ami__code-display {
		width: 100%;
		max-width: 240px;
		height: 56px;
		background: var(--hover);
		border: 2px solid var(--border);
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		position: relative;
	}

	.ami__dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--fg);
	}

	.ami__placeholder {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--fg-subtle);
		opacity: 0.6;
	}

	.ami__keypad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		width: 100%;
		max-width: 260px;
	}

	.ami__key {
		all: unset;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--active);
		border: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.ami__key:hover {
		background: var(--hover);
		border-color: var(--border-strong);
		transform: scale(1.05);
	}

	.ami__key:active {
		transform: scale(0.95);
		background: var(--border);
	}

	.ami__key--clear { color: var(--color-danger); }
	.ami__key--back { color: var(--fg-subtle); }

	.ami__actions {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ami__action-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
	}

	.ami__action-btn {
		all: unset;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px 8px;
		background: var(--hover);
		border: 1px solid var(--border);
		border-radius: 16px;
		font-size: 0.75rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		color: var(--fg-muted);
	}

	.ami__action-btn:hover {
		background: var(--active);
		border-color: var(--border-strong);
		color: var(--fg);
	}

	.ami__action-btn--primary {
		background: color-mix(in srgb, var(--color-danger) 10%, var(--hover));
		border-color: color-mix(in srgb, var(--color-danger) 30%, var(--border));
		color: var(--fg);
	}

	.ami__disarm-btn {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 20px;
		background: var(--color-on);
		color: white;
		border-radius: 20px;
		font-size: 1rem;
		font-weight: 800;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--color-on) 30%, transparent);
	}

	.ami__disarm-btn:hover:not(:disabled) {
		filter: brightness(1.1);
		transform: translateY(-2px);
	}

	.ami__disarm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	.ami__meta {
		margin-top: auto;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.ami__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.ami__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.ami__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
