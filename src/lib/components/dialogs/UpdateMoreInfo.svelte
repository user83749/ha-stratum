<script lang="ts">
	// ── UpdateMoreInfo ────────────────────────────────────────────────────────

	// ── Imports ───────────────────────────────────────────────────────────────
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { updateService } from '$lib/ha/services';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getEntityIcon, getEntityName } from '$lib/ha/entities';
	import { sanitizeHtml } from '$lib/utils/sanitizeHtml';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props { entityId: string; }
	const { entityId }: Props = $props();

	// ── Derived State ─────────────────────────────────────────────────────────
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const isUnavail = $derived(!entity || entity.state === 'unavailable');
	
	const installed = $derived(entity?.attributes.installed_version as string | undefined);
	const latest = $derived(entity?.attributes.latest_version as string | undefined);
	const entityPicture = $derived((entity?.attributes.entity_picture as string | undefined) ?? undefined);
	const releaseUrl = $derived(entity?.attributes.release_url as string | undefined);
	const title = $derived(entity?.attributes.title as string | undefined);
	let fetchedReleaseNotes = $state('');
	let releaseFetchKey = '';
	let releaseFetchSeq = 0;

	// ── Helpers ───────────────────────────────────────────────────────────────
	function normalizeReleaseNotes(input: unknown): string {
		if (input == null) return '';
		if (typeof input === 'string') return input.trim();
		if (Array.isArray(input)) {
			return input.map((part) => normalizeReleaseNotes(part)).filter(Boolean).join('\n\n').trim();
		}
		if (typeof input === 'object') {
			const obj = input as Record<string, unknown>;
			for (const key of ['en', 'body', 'content', 'text', 'message', 'release_notes', 'release_summary', 'notes', 'changelog']) {
				const v = normalizeReleaseNotes(obj[key]);
				if (v) return v;
			}
			const all = Object.values(obj).map((v) => normalizeReleaseNotes(v)).filter(Boolean);
			if (all.length) return all.join('\n\n').trim();
		}
		return String(input).trim();
	}
	function escapeHtml(input: string): string {
		return input
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}
	function renderTextNotes(input: string): string {
		return escapeHtml(input)
			.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')
			.replace(/\n/g, '<br>');
	}
	function looksLikeHtml(input: string): boolean {
		return /<\/?[a-z][\s\S]*>/i.test(input);
	}
	function toGithubApiReleaseEndpoint(url: string): string | null {
		const trimmed = url.trim();
		const latestMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/latest\/?$/i);
		if (latestMatch) {
			const [, owner, repo] = latestMatch;
			return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
		}
		const tagMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/?#]+)\/?$/i);
		if (tagMatch) {
			const [, owner, repo, rawTag] = tagMatch;
			return `https://api.github.com/repos/${owner}/${repo}/releases/tags/${decodeURIComponent(rawTag)}`;
		}
		return null;
	}
	async function fetchReleaseNotesFromUrl(url: string): Promise<string> {
		const githubApi = toGithubApiReleaseEndpoint(url);
		if (githubApi) {
			const response = await fetch(githubApi, {
				headers: { Accept: 'application/vnd.github+json' }
			});
			if (!response.ok) return '';
			const json = (await response.json()) as Record<string, unknown>;
			return normalizeReleaseNotes(json.body ?? json.release_notes ?? '');
		}
		const response = await fetch(url);
		if (!response.ok) return '';
		const type = (response.headers.get('content-type') ?? '').toLowerCase();
		if (type.includes('application/json')) {
			const json = (await response.json()) as Record<string, unknown>;
			return normalizeReleaseNotes(
				json.body ?? json.release_notes ?? json.release_summary ?? json.notes ?? json.changelog ?? ''
			);
		}
		const text = await response.text();
		return normalizeReleaseNotes(text);
	}
	const releaseNotesFromEntity = $derived.by(() => {
		const attrs = entity?.attributes ?? {};
		const candidates: unknown[] = [
			(attrs.release_notes as unknown),
			(attrs.release_summary as unknown),
			(attrs.notes as unknown),
			(attrs.changelog as unknown),
			(attrs.body as unknown)
		];
		for (const candidate of candidates) {
			const normalized = normalizeReleaseNotes(candidate);
			if (normalized) return normalized;
		}

		return '';
	});
	$effect(() => {
		const url = (releaseUrl ?? '').trim();
		const key = `${entityId}|${url}`;
		if (!url || releaseNotesFromEntity) {
			releaseFetchKey = '';
			if (fetchedReleaseNotes) fetchedReleaseNotes = '';
			return;
		}
		if (releaseFetchKey === key) return;
		releaseFetchKey = key;
		fetchedReleaseNotes = '';
		const seq = ++releaseFetchSeq;
		void fetchReleaseNotesFromUrl(url)
			.then((notes) => {
				if (releaseFetchKey !== key) return;
				if (seq !== releaseFetchSeq) return;
				fetchedReleaseNotes = notes;
			})
			.catch(() => {});
	});
	const releaseNotesText = $derived((releaseNotesFromEntity || fetchedReleaseNotes).trim());
	const sanitizedReleaseNotes = $derived.by(() => {
		if (!releaseNotesText) return '';
		return looksLikeHtml(releaseNotesText)
			? sanitizeHtml(releaseNotesText)
			: renderTextNotes(releaseNotesText);
	});

	const isUpdateAvailable = $derived(entity?.state === 'on');
	const iconName = $derived(entity ? getEntityIcon(entity) : 'download');
	let pictureFailed = $state(false);
	$effect(() => {
		entityPicture;
		pictureFailed = false;
	});
	let installState = $state<'idle' | 'installing' | 'queued' | 'error'>('idle');
	let installTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		return () => {
			if (installTimer) {
				clearTimeout(installTimer);
				installTimer = null;
			}
		};
	});
	const displayName = $derived.by(() => {
		if (!entity) return 'Update';
		const raw = (title ?? getEntityName(entity) ?? entityId).trim();
		// Many HA update entities use a friendly name like "Hassio Update" —
		// avoid duplicating "Update" since the subtitle already states availability.
		const cleaned = raw.replace(/\s*update\s*$/i, '').trim();
		return cleaned || raw;
	});

	function install() {
		if (isUnavail) return;
		if (installState === 'installing') return;
		if (installTimer) {
			clearTimeout(installTimer);
			installTimer = null;
		}
		installState = 'installing';
		updateService.install(entityId)
			.then(() => {
				installState = 'queued';
				installTimer = setTimeout(() => {
					installState = 'idle';
					installTimer = null;
				}, 1800);
			})
			.catch(() => {
				installState = 'error';
				installTimer = setTimeout(() => {
					installState = 'idle';
					installTimer = null;
				}, 2200);
			});
	}

	function skip() {
		if (isUnavail) return;
		if (isUpdateAvailable) {
			updateService.skip(entityId).catch(() => {});
		}
	}
</script>

<div class="umi">
	<div class="umi__header">
		<div class="umi__icon-wrap" class:umi__icon-wrap--active={isUpdateAvailable}>
			{#if entityPicture && !pictureFailed}
				<img
					class="umi__entity-image"
					src={entityPicture}
					alt=""
					aria-hidden="true"
					onerror={() => { pictureFailed = true; }}
				/>
			{:else}
				<Icon name={iconName} entity={entity} size={28} />
			{/if}
		</div>
		<div class="umi__titles">
			<h2 class="umi__title">{displayName}</h2>
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
				<button
					class="umi__install-btn"
					class:umi__install-btn--installing={installState === 'installing'}
					class:umi__install-btn--queued={installState === 'queued'}
					class:umi__install-btn--error={installState === 'error'}
					onclick={install}
					disabled={isUnavail || installState === 'installing'}
				>
					<Icon
						name={installState === 'queued' ? 'check' : installState === 'error' ? 'alert-circle' : 'download'}
						size={20}
					/>
					<span>
						{installState === 'installing'
							? 'Installing…'
							: installState === 'queued'
								? 'Queued'
								: installState === 'error'
									? 'Failed — Retry'
									: 'Install Update'}
					</span>
				</button>
				<button class="umi__skip-btn" onclick={skip} disabled={isUnavail || installState === 'installing'}>
					<span>Skip this version</span>
				</button>
			</div>
		{/if}

		{#if releaseNotesText || releaseUrl}
			<div class="umi__section">
				<h3 class="umi__section-title">Release Information</h3>
				<div class="umi__release-box">
					{#if sanitizedReleaseNotes}
						<div class="umi__release-notes">
							{@html sanitizedReleaseNotes}
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
		border-radius: var(--dialog-radius);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--hover);
		color: var(--fg-subtle);
		border: 1px solid var(--border);
	}
	.umi__entity-image {
		width: 30px;
		height: 30px;
		object-fit: contain;
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
		border-radius: var(--dialog-radius);
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
		padding: 12px;
		background: var(--accent);
		color: var(--accent-fg);
		border-radius: var(--dialog-radius);
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
	}
	.umi__install-btn--installing {
		opacity: 0.86;
	}
	.umi__install-btn--queued {
		background: color-mix(in srgb, #22c55e 22%, transparent);
		border-color: color-mix(in srgb, #22c55e 45%, var(--border));
		color: color-mix(in srgb, #22c55e 80%, white);
	}
	.umi__install-btn--error {
		background: color-mix(in srgb, #ef4444 14%, transparent);
		border-color: color-mix(in srgb, #ef4444 38%, var(--border));
		color: color-mix(in srgb, #ef4444 85%, white);
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
		border-radius: var(--dialog-radius);
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
		border-radius: var(--dialog-radius);
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
