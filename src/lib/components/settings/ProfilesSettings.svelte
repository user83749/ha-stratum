<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — ProfilesSettings.svelte
	// List, create, rename, delete user profiles.
	// ─────────────────────────────────────────────────────────────────────────

	import { generateId } from '$lib/utils/uuid';
	import { dashboardStore } from '$lib/stores/dashboard';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { UserProfile } from '$lib/types/dashboard';

	let cfg = $derived($dashboardStore);
	let profiles = $derived(cfg.profiles);
	let activeProfileId = $derived(cfg.activeProfileId);

	// ── Add profile ────────────────────────────────────────────────────────

	function addProfile() {
		const id = generateId();
		const profile: UserProfile = {
			id,
			name: 'New Profile'
		};
		dashboardStore.addProfile(profile);
		dashboardStore.setActiveProfile(id);
	}

	// ── Rename ─────────────────────────────────────────────────────────────

	function rename(id: string, name: string) {
		dashboardStore.updateProfile(id, { name: name || 'Profile' });
	}

	// ── Delete ─────────────────────────────────────────────────────────────

	let confirmDeleteId = $state<string | null>(null);

	function deleteProfile(id: string) {
		if (confirmDeleteId === id) {
			dashboardStore.deleteProfile(id);
			confirmDeleteId = null;
		} else {
			confirmDeleteId = id;
			setTimeout(() => {
				if (confirmDeleteId === id) confirmDeleteId = null;
			}, 3000);
		}
	}

	function setActiveProfile(id: string) {
		dashboardStore.setActiveProfile(id);
	}
</script>

<div class="ps">

	<!-- Header row with add button -->
	<div class="ps__header">
		<span class="s-label">User profiles ({profiles.length})</span>
		<button class="ps__add-btn" onclick={addProfile}>
			<Icon name="plus" size={14} />
			Add profile
		</button>
	</div>

	<!-- Empty state -->
	{#if profiles.length === 0}
		<div class="ps__empty">
			<Icon name="user" size={24} />
			<span>No profiles yet. Create one to get started.</span>
		</div>
	{:else}
		<div class="ps__list">
			{#each profiles as profile}
				<div class="ps__item" class:ps__item--first={activeProfileId === profile.id}>
					<!-- Avatar/icon -->
					<div class="ps__avatar">
						{#if profile.avatar?.startsWith('mdi:')}
							<Icon name={profile.avatar.slice(4)} size={16} />
						{:else}
							<span class="ps__avatar-initial">
								{profile.name.charAt(0).toUpperCase()}
							</span>
						{/if}
					</div>

					<!-- Name input -->
					<div class="ps__info">
						<input
							class="ps__name-input"
							type="text"
							value={profile.name}
							onchange={(e) => rename(profile.id, (e.target as HTMLInputElement).value)}
							aria-label="Profile name"
						/>
						<button
							class="ps__badge"
							class:ps__badge--active={activeProfileId === profile.id}
							onclick={() => setActiveProfile(profile.id)}
							aria-label="Set active profile"
							title="Set active profile"
						>
							{activeProfileId === profile.id ? 'Active' : 'Set Active'}
						</button>
					</div>

					<!-- Delete button -->
					<button
						class="ps__delete"
						class:ps__delete--confirm={confirmDeleteId === profile.id}
						onclick={() => deleteProfile(profile.id)}
						title={confirmDeleteId === profile.id ? 'Click again to confirm' : 'Delete profile'}
						aria-label={confirmDeleteId === profile.id ? 'Confirm delete' : 'Delete profile'}
					>
						{#if confirmDeleteId === profile.id}
							<Icon name="triangle-alert" size={14} />
						{:else}
							<Icon name="trash-2" size={14} />
						{/if}
					</button>
				</div>
			{/each}
		</div>
	{/if}

</div>

<style>
	.ps {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* ── Header ────────────────────────────────────────────────────────────── */

	.ps__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ps__add-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
		font-weight: 500;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		cursor: pointer;
		transition:
			background-color var(--transition),
			border-color var(--transition);
	}

	.ps__add-btn:hover {
		background: color-mix(in srgb, var(--accent) 22%, transparent);
	}

	/* ── Empty ─────────────────────────────────────────────────────────────── */

	.ps__empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 32px 16px;
		color: var(--fg-subtle);
		font-size: 0.83rem;
		text-align: center;
	}

	/* ── List ──────────────────────────────────────────────────────────────── */

	.ps__list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ps__item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
		transition: border-color var(--transition);
	}

	.ps__item--first {
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		background: color-mix(in srgb, var(--accent) 5%, var(--surface));
	}

	/* ── Avatar ────────────────────────────────────────────────────────────── */

	.ps__avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		flex-shrink: 0;
		font-size: 0.85rem;
		font-weight: 700;
	}

	.ps__avatar-initial {
		font-size: 0.9rem;
		font-weight: 700;
	}

	/* ── Info ──────────────────────────────────────────────────────────────── */

	.ps__info {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.ps__name-input {
		flex: 1;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--fg);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 4px 7px;
		min-width: 0;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.ps__name-input:hover {
		border-color: var(--border);
		background: var(--hover);
	}

	.ps__name-input:focus {
		border-color: var(--accent);
		background: var(--bg-elevated);
		outline: none;
	}

	.ps__badge {
		flex-shrink: 0;
		font-size: 0.62rem;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 999px;
		background: var(--hover);
		border: 1px solid var(--border);
		color: var(--fg-muted);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.ps__badge--active {
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
		color: var(--accent);
	}

	/* ── Delete ────────────────────────────────────────────────────────────── */

	.ps__delete {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-subtle);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			background-color var(--transition),
			color var(--transition);
	}

	.ps__delete:hover {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
	}

	.ps__delete--confirm {
		background: color-mix(in srgb, var(--color-danger) 15%, transparent);
		color: var(--color-danger);
	}
</style>
