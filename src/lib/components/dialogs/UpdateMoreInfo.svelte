<script lang="ts">
	import { optimisticEntities, applyPatch } from '$lib/ha/optimistic';
	import { updateService } from '$lib/ha/services';
	import { isDemoMode } from '$lib/demo/index';
	import { browser } from '$app/environment';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isDemo = $derived(browser ? isDemoMode() : false);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	
	const installed = $derived(entity?.attributes.installed_version as string | undefined);
	const latest = $derived(entity?.attributes.latest_version as string | undefined);
	const releaseNotes = $derived(entity?.attributes.release_notes as string | undefined);
	const releaseUrl = $derived(entity?.attributes.release_url as string | undefined);
	const title = $derived(entity?.attributes.title as string | undefined);

	const isUpdateAvailable = $derived(entity?.state === 'on');

	function install() {
		if (isUnavail) return;
		if (isDemo) { 
			applyPatch(entityId, { state: 'off', attributes: { installed_version: latest ?? installed } }); 
			return; 
		}
		updateService.install(entityId).catch(() => {});
	}

	function skip() {
		if (isUnavail) return;
		if (isUpdateAvailable) {
			if (isDemo) return;
			updateService.skip(entityId).catch(() => {});
		}
	}
</script>

<div class="umi">
	<div class="umi__header">
		<div class="umi__icon-wrap" class:umi__icon-wrap--active={isUpdateAvailable}>
			<Icon name="download" size={28} />
		</div>
		<div class="umi__titles">
			<h2 class="umi__title">{title ?? (entity?.attributes.friendly_name || 'Update')}</h2>
			<span class="umi__subtitle">{isUpdateAvailable ? 'Update Available' : 'Up to Date'}</span>
		</div>
		{#if isUpdateAvailable}
			<div class="umi__status-dot"></div>
		{/if}
	</div>

	<div class="umi__body">
		<div class="umi__versions">
			<div class="umi__version-card">
				<span class="umi__version-label">Installed</span>
				<span class="umi__version-val">{installed ?? '—'}</span>
			</div>
			<div class="umi__version-arrow">
				<Icon name="chevron-right" size={20} />
			</div>
			<div class="umi__version-card" class:umi__version-card--highlight={isUpdateAvailable}>
				<span class="umi__version-label">Latest</span>
				<span class="umi__version-val">{latest ?? '—'}</span>
			</div>
		</div>

		{#if isUpdateAvailable}
			<div class="umi__main-action">
				<button class="umi__install-btn" onclick={install} disabled={isUnavail}>
					<Icon name="download" size={20} />
					<span>Install Update</span>
				</button>
				<button class="umi__skip-btn" onclick={skip} disabled={isUnavail}>
					<span>Skip this version</span>
				</button>
			</div>
		{/if}

		{#if releaseNotes || releaseUrl}
			<div class="umi__section">
				<h3 class="umi__section-title">Release Information</h3>
				<div class="umi__release-box">
					{#if releaseNotes}
						<div class="umi__release-notes">
							{@html releaseNotes}
						</div>
					{/if}
					{#if releaseUrl}
						<a href={releaseUrl} target="_blank" rel="noreferrer" class="umi__release-link">
							<Icon name="external-link" size={14} />
							<span>View full release notes</span>
						</a>
					{/if}
				</div>
			</div>
		{/if}

		<div class="umi__meta">
			<div class="umi__meta-row">
				<span class="umi__meta-key">Entity ID</span>
				<span class="umi__meta-val">{entityId}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.umi {
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		min-height: 480px;
		color: var(--fg);
	}

	.umi__header {
		display: flex;
		align-items: center;
		padding: 24px;
		gap: 16px;
		border-bottom: 1px solid var(--border);
	}

	.umi__icon-wrap {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--hover);
		color: var(--fg-subtle);
		border: 1px solid var(--border);
	}

	.umi__icon-wrap--active {
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.umi__titles {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.umi__title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
	}

	.umi__subtitle {
		font-size: 0.85rem;
		color: var(--fg-muted);
		font-weight: 600;
	}

	.umi__status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 8px var(--accent);
	}

	.umi__body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 32px;
		flex: 1;
	}

	.umi__versions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.umi__version-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 16px;
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
	}

	.umi__version-card--highlight {
		background: color-mix(in srgb, var(--accent) 5%, var(--hover));
		border-color: color-mix(in srgb, var(--accent) 20%, var(--border));
	}

	.umi__version-label {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
	}

	.umi__version-val {
		font-size: 0.9rem;
		font-weight: 800;
		color: var(--fg);
	}

	.umi__version-arrow {
		color: var(--fg-subtle);
		opacity: 0.5;
	}

	.umi__main-action {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.umi__install-btn {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 16px;
		background: var(--accent);
		color: var(--accent-fg);
		border-radius: 16px;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.umi__install-btn:hover {
		transform: translateY(-2px);
		filter: brightness(1.1);
	}

	.umi__skip-btn {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		color: var(--fg-subtle);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.umi__skip-btn:hover {
		background: var(--hover);
		color: var(--fg-muted);
	}

	.umi__section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.umi__section-title {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-subtle);
		margin: 0;
	}

	.umi__release-box {
		background: var(--hover);
		border-radius: 16px;
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.umi__release-notes {
		padding: 16px;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--fg-muted);
		max-height: 160px;
		overflow-y: auto;
	}

	.umi__release-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background: color-mix(in srgb, var(--fg) 4%, transparent);
		border-top: 1px solid var(--border);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--accent);
		text-decoration: none;
	}

	.umi__meta {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: auto;
	}

	.umi__meta-row {
		display: flex;
		justify-content: space-between;
		padding-bottom: 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
	}

	.umi__meta-key {
		font-size: 0.85rem;
		color: var(--fg-subtle);
	}

	.umi__meta-val {
		font-size: 0.85rem;
		font-weight: 600;
	}
</style>
