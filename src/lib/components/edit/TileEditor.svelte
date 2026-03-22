<script lang="ts">
	// ── TileEditor ────────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import { isTvLikeMediaEntity, TV_REMOTE_BUTTON_DEFS, type TvRemoteCommand, resolveTvCommandEntityId } from '$lib/ha/tvRemote';
	import { getAllowedPresets, getTileSizePreset } from '$lib/layout/tileSizing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { CUSTOM_ICON_NAMES } from '$lib/icons/customIcons';
	import { generateId } from '$lib/utils/uuid';
	import type {
		Tile,
		Action,
		CameraFeedConfig,
		CustomPopupConfig,
		CustomPopupSectionConfig,
		CustomPopupSectionEntityConfig
	} from '$lib/types/dashboard';

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		open: boolean;
		tile: Tile | null;
		pageId: string;
		sectionId: string;
		onclose: () => void;
		onDelete: () => void;
		onDuplicate: () => void;
	}

	// ── Props / Local State ──────────────────────────────────────────────────
	const { open, tile, pageId, sectionId, onclose, onDelete, onDuplicate }: Props = $props();

	let name = $state('');
	let icon = $state('');
	let builtinOpen = $state(false);
	let draggedCameraFeedIndex = $state<number | null>(null);

	// ── Derived State ─────────────────────────────────────────────────────────────
	const domain = $derived(
		tile?.entity_id ? getDomain(tile.entity_id) : (tile?.type ?? '')
	);
	const entity = $derived(
		tile?.entity_id ? ($entities[tile.entity_id] ?? null) : null
	);
	const sectionLayoutMode = $derived.by(() => {
		if (!pageId || !sectionId) return 'grid';
		const page = $dashboardStore.pages.find((p) => p.id === pageId);
		const section = page?.sections.find((s) => s.id === sectionId);
		return section?.layoutMode ?? 'grid';
	});
	const isChipRowSection = $derived(sectionLayoutMode === 'horizontal_chip_row');
	const tvRemoteCandidates = $derived(
		Object.keys($entities)
			.filter((id) => id.startsWith('media_player.') || id.startsWith('remote.'))
			.sort()
	);
	const cameraEntityCandidates = $derived(
		Object.keys($entities)
			.filter((id) => id.startsWith('camera.'))
			.sort()
	);
	const isTvMediaTile = $derived(
		(domain === 'media_player' || tile?.type === 'media_player') && isTvLikeMediaEntity(entity)
	);
	const showTvRemoteMapping = $derived(
		isTvMediaTile ||
		Object.keys(((tile?.config.tv_remote_entities as Record<string, string> | undefined) ?? {})).length > 0
	);
	const entityName = $derived(
		entity ? getEntityName(entity) : (tile?.entity_id ?? tile?.type ?? 'Tile')
	);
	const allowedPresets = $derived(tile ? getAllowedPresets(tile.type) : []);
	const activePreset = $derived(tile ? getTileSizePreset(tile) : 'md');
	const hasTileSpecificSettings = $derived.by(() => {
		if (!tile) return false;
		if ((domain === 'media_player' || tile.type === 'media_player') && showTvRemoteMapping) return true;
		if (tile.type === 'media_hero') return true;
		if (tile.type === 'gauge') return true;
		if (tile.type === 'alarm_panel') return true;
		if (tile.type === 'camera' || domain === 'camera') return true;
		if (tile.type === 'markdown') return true;
		if (tile.type === 'iframe') return true;
		if (tile.type === 'image') return true;
		return false;
	});

	// ── Input Sync ────────────────────────────────────────────────────────────
	$effect(() => {
		if (!tile) return;
		name = (tile.config.name as string | undefined) ?? '';
		icon = (tile.config.icon as string | undefined) ?? '';
	});

	// ── Core Mutations ────────────────────────────────────────────────────────
	function save(patch: Record<string, unknown>) {
		if (!tile) return;
		dashboardStore.updateTile(pageId, sectionId, tile.id, {
			config: { ...tile.config, ...patch }
		});
	}

	function setSizePreset(sizePreset: NonNullable<Tile['sizePreset']>) {
		if (!tile) return;
		dashboardStore.setTileSizePreset(pageId, sectionId, tile.id, sizePreset);
	}

	const ACTION_TYPES = ['none', 'more-info', 'toggle', 'navigate', 'call-service'];
	const tileDefaults = $derived($dashboardStore.tileDefaults);

	// ── Interaction Actions ───────────────────────────────────────────────────
	function actionType(key: string): string {
		const a = tile?.config[key] as Action | undefined;
		if (a?.type) return a.type;
		const def = tileDefaults?.[key as keyof typeof tileDefaults] as Action | undefined;
		return def?.type ?? 'none';
	}

	function setAction(key: string, type: string) {
		if (type === 'none') { save({ [key]: undefined }); return; }
		const action: Action =
			type === 'more-info'    ? { type: 'more-info' } :
			type === 'toggle'       ? { type: 'toggle' } :
			type === 'navigate'     ? { type: 'navigate', path: '/' } :
			type === 'call-service' ? { type: 'call-service', service: '', data: {} } :
			{ type: 'none' };
		save({ [key]: action });
	}

	// ── Media Hero Player Map ────────────────────────────────────────────────

	interface PlayerMapEntry { state: string; entity_id: string; picture_entity: string; name: string; icon: string; }

	function addPlayerEntry() {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map.push({ state: '', entity_id: '', picture_entity: '', name: '', icon: '' });
		save({ player_map: map });
	}

	function removePlayerEntry(i: number) {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map.splice(i, 1);
		save({ player_map: map });
	}

	function updatePlayerEntry(i: number, patch: Partial<PlayerMapEntry>) {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map[i] = { ...map[i], ...patch };
		save({ player_map: map });
	}

	const SHOW_TOGGLES = [
		['show_name',         'Name'],
		['show_state',        'State'],
		['show_icon',         'Icon'],
		['show_last_changed', 'Last changed']
	] as const;


	const TILE_TYPES = [
		'entity', 'light', 'climate', 'cover', 'media_player', 'media_hero', 'camera', 'alarm_panel',
		'fan', 'lock', 'vacuum', 'humidifier', 'person', 'button', 'slider', 'input_select',
		'remote', 'timer', 'weather', 'history', 'gauge', 'markdown', 'iframe', 'image',
		'todo', 'update'
	];

	const TILE_TYPE_LABELS: Record<string, string> = {
		entity: 'Entity', light: 'Light', climate: 'Climate', cover: 'Cover',
		media_player: 'Media Player', media_hero: 'Custom Player', camera: 'Camera',
		alarm_panel: 'Alarm Panel', fan: 'Fan', lock: 'Lock', vacuum: 'Vacuum',
		humidifier: 'Humidifier', person: 'Person', button: 'Button',
		slider: 'Slider', input_select: 'Input Select', remote: 'Remote',
		timer: 'Timer', weather: 'Weather', history: 'History Graph',
		gauge: 'Gauge', markdown: 'Markdown', iframe: 'iFrame',
		image: 'Image', todo: 'To-do', update: 'Update'
	};

	function changeTileType(newType: string) {
		if (!tile || newType === tile.type) return;
		dashboardStore.updateTile(pageId, sectionId, tile.id, { type: newType as Tile['type'] });
	}

	// ── TV Remote Mapping ─────────────────────────────────────────────────────
	function tvButtonEntityValue(command: TvRemoteCommand): string {
		if (!tile) return '';
		const overrides = (tile.config.tv_remote_entities as Record<string, string> | undefined) ?? {};
		const mainEntityId = tile.entity_id ?? entity?.entity_id ?? '';
		return resolveTvCommandEntityId(command, mainEntityId, overrides, $entities);
	}

	function setTvButtonEntity(command: TvRemoteCommand, value: string) {
		if (!tile) return;
		const current = { ...(((tile.config.tv_remote_entities as Record<string, string> | undefined) ?? {})) };
		const trimmed = value.trim();
		if (trimmed) current[command] = trimmed;
		else delete current[command];
		save({
			tv_remote_entities: Object.keys(current).length > 0 ? current : undefined
		});
	}

	// ── Camera Feed Configuration ────────────────────────────────────────────
	function getCameraFeeds(): CameraFeedConfig[] {
		if (!tile) return [];
		const feeds = (tile.config.camera_feeds as CameraFeedConfig[] | undefined) ?? [];
		return feeds.filter((f) => !!f && typeof f.id === 'string' && f.id.length > 0);
	}

	function saveCameraFeeds(feeds: CameraFeedConfig[]) {
		if (!tile) return;
		const normalized = feeds.map((feed) => ({
			id: feed.id || generateId(),
			type: feed.type === 'url' ? 'url' : 'entity',
			entity_id: feed.type === 'entity' ? (feed.entity_id?.trim() || '') : undefined,
			url: feed.type === 'url' ? (feed.url?.trim() || '') : undefined,
			label: feed.label?.trim() || undefined,
			popup_trigger_entity: feed.popup_trigger_entity?.trim() || undefined,
			popup_trigger_state: feed.popup_trigger_state?.trim() || undefined
		}));
		const primary = (tile.config.camera_primary_feed as string | undefined) ?? '';
		const nextPrimary = normalized.some((f) => f.id === primary) ? primary : (normalized[0]?.id ?? undefined);
		save({
			camera_feeds: normalized.length > 0 ? normalized : undefined,
			camera_primary_feed: nextPrimary
		});
	}

	function addCameraEntityFeed() {
		const feeds = getCameraFeeds();
		if (feeds.length >= 4) return;
		feeds.push({
			id: generateId(),
			type: 'entity',
			entity_id: tile?.entity_id ?? '',
			label: ''
		});
		saveCameraFeeds(feeds);
	}

	function addCameraUrlFeed() {
		const feeds = getCameraFeeds();
		if (feeds.length >= 4) return;
		feeds.push({
			id: generateId(),
			type: 'url',
			url: '',
			label: ''
		});
		saveCameraFeeds(feeds);
	}

	function removeCameraFeed(feedId: string) {
		const feeds = getCameraFeeds().filter((f) => f.id !== feedId);
		saveCameraFeeds(feeds);
	}

	function updateCameraFeed(feedId: string, patch: Partial<CameraFeedConfig>) {
		const feeds = getCameraFeeds().map((feed) => (feed.id === feedId ? { ...feed, ...patch } : feed));
		saveCameraFeeds(feeds);
	}

	function reorderCameraFeed(fromIndex: number, toIndex: number) {
		const feeds = getCameraFeeds();
		if (fromIndex < 0 || toIndex < 0 || fromIndex >= feeds.length || toIndex >= feeds.length || fromIndex === toIndex) return;
		const next = [...feeds];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(toIndex, 0, moved);
		saveCameraFeeds(next);
	}

	// ── Camera Auto-Popup Helpers ───────────────────────────────────────────
	const POPUP_AUTO_CLOSE_MIN_SECONDS = 1;
	const POPUP_AUTO_CLOSE_MAX_SECONDS = 3600;

	function normalizedPopupAutoCloseInput(value: string): number | undefined {
		const trimmed = value.trim();
		if (!trimmed) return undefined;
		const parsed = Number.parseInt(trimmed, 10);
		if (!Number.isFinite(parsed)) return undefined;
		const clamped = Math.min(POPUP_AUTO_CLOSE_MAX_SECONDS, Math.max(POPUP_AUTO_CLOSE_MIN_SECONDS, parsed));
		return clamped;
	}

	function savePopupAutoCloseFromInput(rawValue: string) {
		const normalized = normalizedPopupAutoCloseInput(rawValue);
		save({ popup_auto_close_time: normalized });
	}

	// ── Custom Popup Configuration ───────────────────────────────────────────
	function getCustomPopupConfig(): CustomPopupConfig {
		if (!tile) return { enabled: false, sections: [] };
		const raw = (tile.config.custom_popup as CustomPopupConfig | undefined) ?? {};
		const sections = (Array.isArray(raw.sections) ? raw.sections : [])
			.slice(0, 3)
			.map((section): CustomPopupSectionConfig => ({
				id: section.id || generateId(),
				title: section.title ?? '',
				entities: (Array.isArray(section.entities) ? section.entities : []).map((entry): CustomPopupSectionEntityConfig => ({
					id: entry.id || generateId(),
					entity_id: entry.entity_id ?? '',
					name: entry.name ?? '',
					icon: entry.icon ?? ''
				}))
			}));
		return {
			enabled: raw.enabled === true,
			header_title: raw.header_title ?? '',
			header_subtitle: raw.header_subtitle ?? '',
			header_icon: raw.header_icon ?? '',
			sections
		};
	}

	function saveCustomPopupConfig(cfg: CustomPopupConfig) {
		if (!tile) return;
		const sections = (Array.isArray(cfg.sections) ? cfg.sections : [])
			.slice(0, 3)
			.map((section): CustomPopupSectionConfig => ({
				id: section.id || generateId(),
				title: String(section.title ?? '').trim() || undefined,
				entities: (Array.isArray(section.entities) ? section.entities : [])
					.map((entry): CustomPopupSectionEntityConfig => {
						const entityId = String(entry.entity_id ?? '').trim();
						const name = String(entry.name ?? '').trim();
						const icon = String(entry.icon ?? '').trim();
						return {
							id: entry.id || generateId(),
							entity_id: entityId,
							name: name || undefined,
							icon: icon || undefined
						};
					})
			}))
			.filter((section) => section.entities.length > 0 || !!section.title);

		const enabled = cfg.enabled === true;
		const headerTitle = String(cfg.header_title ?? '').trim();
		const headerSubtitle = String(cfg.header_subtitle ?? '').trim();
		const headerIcon = String(cfg.header_icon ?? '').trim();
		const hasConfig = enabled || sections.length > 0 || !!headerTitle || !!headerSubtitle || !!headerIcon;

		save({
			custom_popup: hasConfig ? {
				enabled: enabled || undefined,
				header_title: headerTitle || undefined,
				header_subtitle: headerSubtitle || undefined,
				header_icon: headerIcon || undefined,
				sections: sections.length > 0 ? sections : undefined
			} : undefined
		});
	}

	function setCustomPopupEnabled(enabled: boolean) {
		const cfg = getCustomPopupConfig();
		saveCustomPopupConfig({ ...cfg, enabled });
	}

	function updateCustomPopupHeader(patch: Partial<CustomPopupConfig>) {
		const cfg = getCustomPopupConfig();
		saveCustomPopupConfig({ ...cfg, ...patch });
	}

	function addCustomPopupSection() {
		const cfg = getCustomPopupConfig();
		if ((cfg.sections?.length ?? 0) >= 3) return;
		const sections = [...(cfg.sections ?? [])];
		const nextIndex = sections.length + 1;
		sections.push({ id: generateId(), title: `Section ${nextIndex}`, entities: [] });
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function removeCustomPopupSection(sectionId: string) {
		const cfg = getCustomPopupConfig();
		const sections = (cfg.sections ?? []).filter((section) => section.id !== sectionId);
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function moveCustomPopupSection(fromIndex: number, toIndex: number) {
		const cfg = getCustomPopupConfig();
		const sections = [...(cfg.sections ?? [])];
		if (fromIndex < 0 || toIndex < 0 || fromIndex >= sections.length || toIndex >= sections.length || fromIndex === toIndex) return;
		const [moved] = sections.splice(fromIndex, 1);
		sections.splice(toIndex, 0, moved);
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function updateCustomPopupSection(sectionId: string, patch: Partial<CustomPopupSectionConfig>) {
		const cfg = getCustomPopupConfig();
		const sections = (cfg.sections ?? []).map((section) =>
			section.id === sectionId ? { ...section, ...patch } : section
		);
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function addCustomPopupEntity(sectionId: string) {
		const cfg = getCustomPopupConfig();
		const target = (cfg.sections ?? []).find((s) => s.id === sectionId);
		if (!target || target.entities.length >= 10) return;
		const sections = (cfg.sections ?? []).map((section) =>
			section.id === sectionId
				? { ...section, entities: [...section.entities, { id: generateId(), entity_id: '', name: '', icon: '' }] }
				: section
		);
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function removeCustomPopupEntity(sectionId: string, entryId: string) {
		const cfg = getCustomPopupConfig();
		const sections = (cfg.sections ?? []).map((section) =>
			section.id === sectionId
				? { ...section, entities: section.entities.filter((entry) => entry.id !== entryId) }
				: section
		);
		saveCustomPopupConfig({ ...cfg, sections });
	}

	function updateCustomPopupEntity(
		sectionId: string,
		entryId: string,
		patch: Partial<CustomPopupSectionEntityConfig>
	) {
		const cfg = getCustomPopupConfig();
		const sections = (cfg.sections ?? []).map((section) =>
			section.id === sectionId
				? {
					...section,
					entities: section.entities.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry))
				}
				: section
		);
		saveCustomPopupConfig({ ...cfg, sections });
	}
</script>

{#if open && tile}
	<!-- ── Backdrop ───────────────────────────────────────────────────────────── -->
	<div class="te__backdrop" onclick={onclose} aria-hidden="true"></div>

	<!-- ── Editor Panel ───────────────────────────────────────────────────────────── -->
	<aside class="te" aria-label="Tile editor">
		<!-- ── Header ───────────────────────────────────────────────────────────── -->
		<div class="te__header">
			<button class="te__hbtn" onclick={onclose} title="Close" aria-label="Close tile editor">
				<Icon name="x" size={17} />
			</button>
			<div class="te__title">
				<span class="te__badge">{TILE_TYPE_LABELS[tile.type] ?? tile.type}</span>
				<span class="te__name">{entityName}</span>
			</div>
			<div class="te__header-btns">
				<button class="te__hbtn" onclick={onDuplicate} title="Duplicate tile" aria-label="Duplicate">
					<Icon name="copy" size={15} />
				</button>
				<button class="te__hbtn te__hbtn--danger" onclick={onDelete} title="Delete tile" aria-label="Delete">
					<Icon name="trash-2" size={15} />
				</button>
			</div>
		</div>

		<!-- ── Body ───────────────────────────────────────────────────────────── -->
		<div class="te__body">
			<!-- ── Type & Identity ───────────────────────────────────────────────────────────── -->
			<div class="te__group">
				<span class="te__section-title">Tile type</span>
				<select
					class="te__select"
					value={tile.type}
					onchange={(e) => changeTileType((e.target as HTMLSelectElement).value)}
				>
					{#each TILE_TYPES as t}
						<option value={t}>{TILE_TYPE_LABELS[t] ?? t}</option>
					{/each}
				</select>
			</div>

			<div class="te__group">
				<span class="te__section-title">Identity</span>
				{#if isChipRowSection}
					<p class="te__hint">
						Horizontal Chip row renders icon + name only. State and tile-card visuals are ignored here.
					</p>
				{/if}
				<span class="te__label">Name override</span>
				<input class="te__input" type="text" placeholder="Entity name" bind:value={name} oninput={() => save({ name: name || undefined })} />
				<span class="te__label">Icon override</span>
				<input class="te__input" type="text" placeholder="e.g. mdi:lightbulb or floorlamp" bind:value={icon} oninput={() => save({ icon: icon || undefined })} />
				<div class="te__icon-links">
					<a class="te__icon-finder" href="https://icon-sets.iconify.design/" target="_blank" rel="noopener noreferrer">Icon Finder ↗</a>
					<button class="te__icon-finder te__builtin-btn" onclick={() => builtinOpen = !builtinOpen} type="button">
						Built-in icons {builtinOpen ? '▲' : '▼'}
					</button>
				</div>
				{#if builtinOpen}
					<div class="te__builtin-list">
						{#each CUSTOM_ICON_NAMES as n}
							<button
								class="te__builtin-item-box"
								class:te__builtin-item-box--active={icon === n}
								onclick={() => { icon = n; save({ icon: n }); }}
								title={n}
								type="button"
							>
								<div class="te__builtin-preview">
									<Icon name={n} size={20} />
								</div>
								<span class="te__builtin-name">{n}</span>
							</button>
						{/each}
					</div>
				{/if}
				{#if isChipRowSection}
					<span class="te__label te__mt12">Notify badge entity (optional)</span>
					<input
						class="te__input"
						type="text"
						list="te-chip-notify-entities"
						placeholder="sensor.hassio_updates_available"
						value={(tile.config.chip_notify_entity_id as string) ?? ''}
						oninput={(e) => save({ chip_notify_entity_id: (e.target as HTMLInputElement).value || undefined })}
					/>
					<span class="te__label">Notify badge attribute (optional)</span>
					<input
						class="te__input"
						type="text"
						placeholder="e.g. count"
						value={(tile.config.chip_notify_attribute as string) ?? ''}
						oninput={(e) => save({ chip_notify_attribute: (e.target as HTMLInputElement).value || undefined })}
					/>
					<p class="te__hint">
						Badge shows when this value is truthy or greater than 0. If attribute is empty, state is used.
					</p>
					<datalist id="te-chip-notify-entities">
						{#each Object.keys($entities).sort() as candidate}
							<option value={candidate}></option>
						{/each}
					</datalist>
				{/if}
			</div>

				{#if !isChipRowSection}
					<div class="te__group">
						<!-- ── Size ───────────────────────────────────────────────────────────── -->
						<span class="te__section-title">Tile size</span>
					<div class="te__preset-row">
						{#each allowedPresets as preset}
							<button
								class="te__preset"
								class:te__preset--active={activePreset === preset}
								onclick={() => setSizePreset(preset)}
							>
								{preset === 'sm' ? 'Small' : preset === 'md' ? 'Medium' : preset === 'lg' ? 'Large' : 'XL'}
							</button>
						{/each}
					</div>
				</div>
			{/if}

				{#if hasTileSpecificSettings}
				<div class="te__group">
					<!-- ── Tile-specific Settings ───────────────────────────────────────────────────────────── -->
					<span class="te__section-title">Tile-specific settings</span>

				{#if domain === 'media_player' || tile.type === 'media_player'}
					{#if showTvRemoteMapping}
						<span class="te__label te__mt12">TV remote button entities</span>
						<p class="te__hint">
							Set which entity each TV remote button controls. Use <code>remote.*</code> for navigation buttons and
							<code>media_player.*</code> for volume/channel/power if needed.
						</p>
						{#each TV_REMOTE_BUTTON_DEFS as btn (btn.key)}
							<span class="te__label">{btn.label}</span>
							<input
								class="te__input"
								type="text"
								list="te-tv-entity-candidates"
								placeholder="remote.living_room_tv"
								value={tvButtonEntityValue(btn.key)}
								oninput={(e) => setTvButtonEntity(btn.key, (e.target as HTMLInputElement).value)}
							/>
						{/each}
						<datalist id="te-tv-entity-candidates">
							{#each tvRemoteCandidates as candidate}
								<option value={candidate}></option>
							{/each}
						</datalist>
					{/if}
				{/if}

				{#if tile.type === 'media_hero'}
					<div class="te__row te__row--gap">
						<label class="te__check">
							<input type="checkbox" checked={tile.config.show_artwork !== false} onchange={(e) => save({ show_artwork: (e.target as HTMLInputElement).checked })} />
							Show artwork
						</label>
						<label class="te__check">
							<input type="checkbox" checked={tile.config.show_progress !== false} onchange={(e) => save({ show_progress: (e.target as HTMLInputElement).checked })} />
							Progress bar
						</label>
					</div>

					<span class="te__label">Switcher Entity (optional)</span>
					<div class="te__row te__row--gap te__mb4">
						<input
							class="te__input"
							type="text"
							placeholder="select.conditional_media"
							value={(tile.config.switcher_entity_id as string) ?? ''}
							oninput={(e) => save({ switcher_entity_id: (e.target as HTMLInputElement).value || undefined })}
						/>
					</div>
					<p class="te__hint">
						Selecting an entity here (like <code>select.conditional_media</code>) enables dynamic player switching.
						The tile will show its main entity as a fallback when no player is active.
					</p>

					<span class="te__label te__mt12">Aggregator sensor (optional)</span>
					<input
						class="te__input"
						type="text"
						placeholder="sensor.active_media_players"
						value={(tile.config.sensor_entity as string) ?? ''}
						oninput={(e) => save({ sensor_entity: (e.target as HTMLInputElement).value || undefined })}
					/>
					<p class="te__hint">
						Optional sensor whose attributes supply <code>media_title</code>, <code>media_artist</code>,
						<code>entity_picture</code>. Leave blank to read directly from each media player.
					</p>

					<span class="te__section-title te__mt12">Player map</span>
					<p class="te__hint">
						Configure which states of the Switcher Entity (or the main entity if no switcher is set) map to which media players.
					</p>

					{@const switchId = (tile.config.switcher_entity_id as string) || tile.entity_id}
					{@const selectEntity = switchId ? ($entities[switchId] ?? null) : null}
					{@const selectOptions = (selectEntity?.attributes?.options as string[] | undefined) ?? []}
					{@const usedStates = new Set(((tile.config.player_map ?? []) as PlayerMapEntry[]).map(e => e.state).filter(Boolean))}

					{#if switchId && selectOptions.length === 0}
						<p class="te__hint te__hint--warn">
							⚠ Entity <code>{tile.entity_id}</code> has no <code>options</code> attribute.
							Make sure it's a <code>select.*</code> or <code>input_select.*</code> entity.
						</p>
					{/if}

					<div class="te__player-map">
						{#each ((tile.config.player_map ?? []) as PlayerMapEntry[]) as entry, i}
							<div class="te__pm-row">
								<div class="te__pm-header">
									<span class="te__pm-index">#{i + 1}</span>
									{#if i > 0}
										<button
											class="te__icon-btn te__pm-move"
											onclick={() => { const map = [...((tile.config.player_map ?? []) as PlayerMapEntry[])]; if (i > 0) { [map[i-1], map[i]] = [map[i], map[i-1]]; save({ player_map: map }); } }}
											title="Move up (higher priority)"
											aria-label="Move up"
										>
											<Icon name="chevron-up" size={12} />
										</button>
									{/if}
									{#if i < ((tile.config.player_map ?? []) as PlayerMapEntry[]).length - 1}
										<button
											class="te__icon-btn te__pm-move"
											onclick={() => { const map = [...((tile.config.player_map ?? []) as PlayerMapEntry[])]; [map[i], map[i+1]] = [map[i+1], map[i]]; save({ player_map: map }); }}
											title="Move down (lower priority)"
											aria-label="Move down"
										>
											<Icon name="chevron-down" size={12} />
										</button>
									{/if}
									<button class="te__icon-btn te__icon-btn--danger te__pm-del" onclick={() => removePlayerEntry(i)}>
										<Icon name="trash-2" size={13} />
									</button>
								</div>
								<div class="te__pm-grid">
									<div>
										<span class="te__label">When select =</span>
										{#if selectOptions.length > 0}
											<select
												class="te__select te__select--sm"
												value={entry.state}
												onchange={(e) => updatePlayerEntry(i, { state: (e.target as HTMLSelectElement).value })}
											>
												<option value="">— Pick an option —</option>
												{#each selectOptions as opt}
													<option
														value={opt}
														disabled={usedStates.has(opt) && opt !== entry.state}
													>{opt}{usedStates.has(opt) && opt !== entry.state ? ' (used)' : ''}</option>
												{/each}
											</select>
										{:else}
											<input
												class="te__input te__input--sm"
												placeholder="e.g. CoreELEC"
												value={entry.state}
												oninput={(e) => updatePlayerEntry(i, { state: (e.target as HTMLInputElement).value })}
											/>
										{/if}
									</div>
									<div>
										<span class="te__label">Media player entity</span>
										<input
											class="te__input te__input--sm"
											placeholder="media_player.xyz"
											value={entry.entity_id}
											oninput={(e) => updatePlayerEntry(i, { entity_id: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Artwork entity (optional)</span>
										<input
											class="te__input te__input--sm"
											placeholder="sensor.kodi_poster"
											value={entry.picture_entity ?? ''}
											oninput={(e) => updatePlayerEntry(i, { picture_entity: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Display name</span>
										<input
											class="te__input te__input--sm"
											placeholder="e.g. Now Playing"
											value={entry.name}
											oninput={(e) => updatePlayerEntry(i, { name: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Icon</span>
										<input
											class="te__input te__input--sm"
											placeholder="e.g. tv-2, speaker"
											value={entry.icon}
											oninput={(e) => updatePlayerEntry(i, { icon: (e.target as HTMLInputElement).value })}
										/>
									</div>
								</div>
							</div>
						{/each}
						<button class="te__add-btn te__add-btn--large" onclick={addPlayerEntry}>
							<Icon name="plus" size={14} /> <span>Add player mapping</span>
						</button>
					</div>
				{/if}

				{#if tile.type === 'gauge'}
					<div class="te__grid3">
						{#each [['min','Min'],['max','Max']] as [key, label]}
							<div>
								<span class="te__label">{label}</span>
								<input class="te__input te__input--num" type="number" value={(tile.config[key] as number) ?? (key === 'min' ? 0 : 100)} oninput={(e) => save({ [key]: parseFloat((e.target as HTMLInputElement).value) })} />
							</div>
						{/each}
					</div>
				{/if}

					{#if tile.type === 'alarm_panel'}
						<label class="te__check">
							<input type="checkbox" checked={tile.config.show_keypad !== false}
								onchange={(e) => save({ show_keypad: (e.target as HTMLInputElement).checked })} />
							Show keypad
						</label>
					{/if}

					{#if tile.type === 'camera' || domain === 'camera'}
						{@const popupTriggersEnabled = (tile.config.popup_trigger_enabled as boolean | undefined) !== false}
						{@const cameraFeeds = getCameraFeeds()}
						{@const feedCount = cameraFeeds.length}
						{@const feedsAtMax = feedCount >= 4}

						<!-- ── Additional Feeds ─────────────────────────────────────────────────────── -->
						<div class="te__group">
							<span class="te__section-title">Camera Feeds</span>
							<p class="te__hint">
								Add secondary camera entities or URLs as tabs in this popup. Up to 4 feeds total.
								{#if popupTriggersEnabled}
									Feed-specific trigger overrides are available below.
								{:else}
									Enable auto-popup triggers below to configure feed-specific trigger overrides.
								{/if}
							</p>
							<div class="te__row te__row--gap">
								<button class="te__add-btn te__add-btn--large" type="button" onclick={addCameraEntityFeed} disabled={feedsAtMax}>
									<Icon name="plus" size={14} /> <span>{feedsAtMax ? 'Max 4 feeds' : 'Add camera entity'}</span>
								</button>
								<button class="te__add-btn te__add-btn--large" type="button" onclick={addCameraUrlFeed} disabled={feedsAtMax}>
									<Icon name="plus" size={14} /> <span>{feedsAtMax ? 'Max 4 feeds' : 'Add custom URL'}</span>
								</button>
							</div>
							{#if feedCount === 0}
								<p class="te__hint">
									No extra feeds configured. The tile entity feed is used by default.
								</p>
							{:else}
								<div class="te__player-map">
									{#each cameraFeeds as feed, i (feed.id)}
									<div
										class="te__pm-row te__feed-row"
										role="listitem"
										draggable="true"
										ondragstart={() => { draggedCameraFeedIndex = i; }}
										ondragover={(e) => e.preventDefault()}
										ondrop={(e) => {
											e.preventDefault();
											if (draggedCameraFeedIndex !== null) reorderCameraFeed(draggedCameraFeedIndex, i);
											draggedCameraFeedIndex = null;
										}}
										ondragend={() => { draggedCameraFeedIndex = null; }}
									>
										<div class="te__pm-header">
											<span class="te__pm-index">#{i + 1}</span>
											<span class="te__feed-drag" title="Drag to reorder">
												<Icon name="grip-vertical" size={12} />
											</span>
											<label class="te__feed-primary">
												<input
													type="radio"
													name="camera-primary-feed"
													checked={(tile.config.camera_primary_feed as string | undefined) === feed.id}
													onchange={() => save({ camera_primary_feed: feed.id })}
												/>
												Primary
											</label>
											<button class="te__icon-btn te__icon-btn--danger te__pm-del" onclick={() => removeCameraFeed(feed.id)} type="button">
												<Icon name="trash-2" size={13} />
											</button>
										</div>
										<div class="te__pm-grid">
											<div>
												<span class="te__label">Source type</span>
												<select
													class="te__select te__select--sm"
													value={feed.type}
													onchange={(e) => {
														const nextType = (e.target as HTMLSelectElement).value as 'entity' | 'url';
														updateCameraFeed(feed.id, nextType === 'entity'
															? { type: 'entity', entity_id: tile.entity_id ?? '', url: undefined }
															: { type: 'url', url: '', entity_id: undefined }
														);
													}}
												>
													<option value="entity">Camera entity</option>
													<option value="url">Custom URL</option>
												</select>
											</div>
											<div>
												<span class="te__label">{feed.type === 'url' ? 'Feed URL' : 'Camera entity'}</span>
												<input
													class="te__input te__input--sm"
													type={feed.type === 'url' ? 'url' : 'text'}
													list={feed.type === 'entity' ? 'te-camera-entity-candidates' : undefined}
													placeholder={feed.type === 'url' ? 'https://…' : 'camera.front_door'}
													value={feed.type === 'url' ? (feed.url ?? '') : (feed.entity_id ?? '')}
													oninput={(e) =>
														updateCameraFeed(feed.id, feed.type === 'url'
															? { url: (e.target as HTMLInputElement).value }
															: { entity_id: (e.target as HTMLInputElement).value }
														)
													}
												/>
											</div>
											<div>
												<span class="te__label">Label (optional)</span>
												<input
													class="te__input te__input--sm"
													type="text"
													placeholder="Front Door"
													value={feed.label ?? ''}
													oninput={(e) => updateCameraFeed(feed.id, { label: (e.target as HTMLInputElement).value })}
												/>
											</div>

											{#if popupTriggersEnabled}
												<div class="te__camera-popup-divider">
													<span class="te__camera-popup-heading">Feed-specific Trigger (Optional Override)</span>
												</div>
												<div class="te__camera-popup-full">
													<span class="te__label">Trigger entity (optional)</span>
													<input
														class="te__input te__input--sm"
														type="text"
														placeholder="e.g. binary_sensor.front_door_motion"
														value={feed.popup_trigger_entity ?? ''}
														oninput={(e) => updateCameraFeed(feed.id, { popup_trigger_entity: (e.target as HTMLInputElement).value || undefined })}
													/>
												</div>
												<div>
													<span class="te__label">Open when state is</span>
													<input
														class="te__input te__input--sm"
														type="text"
														placeholder="on"
														value={feed.popup_trigger_state ?? ''}
														oninput={(e) => updateCameraFeed(feed.id, { popup_trigger_state: (e.target as HTMLInputElement).value || undefined })}
													/>
												</div>
											{/if}
										</div>
									</div>
									{/each}
									<datalist id="te-camera-entity-candidates">
										{#each cameraEntityCandidates as candidate}
											<option value={candidate}></option>
										{/each}
									</datalist>
								</div>
							{/if}
						</div>

						<!-- ── Auto-popup Settings ──────────────────────────────────────────────────── -->
						<div class="te__group te__group--boxed">
							<span class="te__section-title">Auto-popup Settings</span>
							<span class="te__label">Enable auto-popup triggers</span>
							<Toggle
								checked={popupTriggersEnabled}
								onchange={(checked) => save({ popup_trigger_enabled: checked })}
								label="Enable auto-popup triggers"
							/>
							<p class="te__hint">Allow automatic popup opening when the dashboard is visible and a trigger entity changes to its target state.</p>

							{#if popupTriggersEnabled}
								<span class="te__label te__mt12">Auto-close after (seconds)</span>
								<input
									class="te__input te__input--sm te__input--num"
									type="number"
									placeholder="e.g. 15 — leave blank to keep open"
									min={POPUP_AUTO_CLOSE_MIN_SECONDS}
									max={POPUP_AUTO_CLOSE_MAX_SECONDS}
									step="1"
									value={(tile.config.popup_auto_close_time as number) ?? ''}
									oninput={(e) => savePopupAutoCloseFromInput((e.target as HTMLInputElement).value)}
									onblur={(e) => {
										const input = e.target as HTMLInputElement;
										const normalized = normalizedPopupAutoCloseInput(input.value);
										input.value = normalized === undefined ? '' : String(normalized);
										save({ popup_auto_close_time: normalized });
									}}
								/>
								<p class="te__hint">Applies to all triggers — tile-level and feed-specific. Leave blank to keep the popup open indefinitely.</p>

								<span class="te__label te__mt12">Tile trigger entity (optional)</span>
								<p class="te__hint">Opens the primary camera feed when this entity transitions to the state below. Independent of per-feed triggers.</p>
								<input
									class="te__input te__input--sm te__mb4"
									type="text"
									placeholder="e.g. binary_sensor.front_door_motion"
									value={(tile.config.popup_trigger_entity as string) ?? ''}
									oninput={(e) => save({ popup_trigger_entity: (e.target as HTMLInputElement).value || undefined })}
								/>
								<span class="te__label">Open when state is</span>
								<input
									class="te__input te__input--sm"
									type="text"
									placeholder="on"
									value={(tile.config.popup_trigger_state as string) ?? ''}
									oninput={(e) => save({ popup_trigger_state: (e.target as HTMLInputElement).value || undefined })}
								/>
							{:else}
								<p class="te__hint">Auto-popup triggers are disabled. Manual popup opening still works.</p>
							{/if}
						</div>
					{/if}

					{#if tile.type === 'markdown'}
						<span class="te__label">Content</span>
						<textarea class="te__textarea" rows={8} value={(tile.config.content as string) ?? ''} oninput={(e) => save({ content: (e.target as HTMLTextAreaElement).value })}></textarea>
					{/if}

					{#if tile.type === 'iframe'}
						<span class="te__label">URL</span>
						<input class="te__input" type="url" placeholder="https://…" value={(tile.config.url as string) ?? ''} oninput={(e) => save({ url: (e.target as HTMLInputElement).value })} />
					{/if}

					{#if tile.type === 'image'}
						<span class="te__label">Image URL</span>
						<input class="te__input" type="url" placeholder="https://…" value={(tile.config.url as string) ?? ''} oninput={(e) => save({ url: (e.target as HTMLInputElement).value })} />
					{/if}

				</div>
			{/if}

			{#if tile && tile.type === 'entity'}
				{@const customPopup = getCustomPopupConfig()}
				<div class="te__group te__group--boxed">
					<!-- ── Custom Popup Card ───────────────────────────────────────────────────────────── -->
					<span class="te__section-title">Custom Popup Card</span>
					<span class="te__label">Enable custom popup layout</span>
					<Toggle
						checked={customPopup.enabled === true}
						onchange={setCustomPopupEnabled}
						label="Enable custom popup layout"
					/>
					<p class="te__hint">
						When enabled, this tile opens a custom sectioned popup instead of the default domain popup.
					</p>

					{#if customPopup.enabled}
						<div class="te__subgroup te__mt12">
							<span class="te__section-title">Header</span>
							<p class="te__hint">Customize the popup title area shown at the top of this tile’s popup.</p>
							<span class="te__label">Header title</span>
							<input
								class="te__input"
								type="text"
								placeholder="System"
								value={(customPopup.header_title as string) ?? ''}
								oninput={(e) => updateCustomPopupHeader({ header_title: (e.target as HTMLInputElement).value })}
							/>
							<div class="te__grid2">
								<div>
									<span class="te__label">Header subtitle (optional)</span>
									<input
										class="te__input"
										type="text"
										placeholder="Quick controls"
										value={(customPopup.header_subtitle as string) ?? ''}
										oninput={(e) => updateCustomPopupHeader({ header_subtitle: (e.target as HTMLInputElement).value })}
									/>
								</div>
								<div>
									<span class="te__label">Header icon (optional)</span>
									<input
										class="te__input"
										type="text"
										placeholder="mdi:home-assistant"
										value={(customPopup.header_icon as string) ?? ''}
										oninput={(e) => updateCustomPopupHeader({ header_icon: (e.target as HTMLInputElement).value })}
									/>
								</div>
							</div>
						</div>

						<div class="te__subgroup">
							<div class="te__subgroup-head">
								<span class="te__section-title">Sections</span>
								<button
									class="te__add-btn"
									type="button"
									onclick={addCustomPopupSection}
									disabled={(customPopup.sections?.length ?? 0) >= 3}
								>
									<Icon name="plus" size={14} />
									<span>{(customPopup.sections?.length ?? 0) >= 3 ? 'Max 3 sections' : 'Add section'}</span>
								</button>
							</div>
							<p class="te__hint">
								Add up to 3 sections. Each section can contain entities with optional name/icon overrides.
							</p>

							{#if (customPopup.sections?.length ?? 0) === 0}
								<p class="te__hint">No sections yet. Add your first section to start building this popup.</p>
							{/if}

							<div class="te__player-map">
								{#each (customPopup.sections ?? []) as section, sectionIndex (section.id)}
									<div class="te__pm-row">
										<div class="te__pm-header">
											<span class="te__pm-index">Section #{sectionIndex + 1}</span>
											{#if sectionIndex > 0}
												<button
													class="te__icon-btn te__pm-move"
													onclick={() => moveCustomPopupSection(sectionIndex, sectionIndex - 1)}
													aria-label="Move section up"
													title="Move up"
												>
													<Icon name="chevron-up" size={12} />
												</button>
											{/if}
											{#if sectionIndex < (customPopup.sections ?? []).length - 1}
												<button
													class="te__icon-btn te__pm-move"
													onclick={() => moveCustomPopupSection(sectionIndex, sectionIndex + 1)}
													aria-label="Move section down"
													title="Move down"
												>
													<Icon name="chevron-down" size={12} />
												</button>
											{/if}
											<button
												class="te__icon-btn te__icon-btn--danger te__pm-del"
												onclick={() => removeCustomPopupSection(section.id)}
												aria-label="Delete section"
												title="Delete section"
											>
												<Icon name="trash-2" size={13} />
											</button>
										</div>

										<span class="te__label">Section title</span>
										<input
											class="te__input te__input--sm"
											type="text"
											placeholder="Home Assistant"
											value={section.title ?? ''}
											oninput={(e) => updateCustomPopupSection(section.id, { title: (e.target as HTMLInputElement).value })}
										/>

										{#if section.entities.length === 0}
											<p class="te__hint">No entities in this section yet.</p>
										{/if}

										{#each section.entities as entry (entry.id)}
											<div class="te__pm-grid">
												<div>
													<span class="te__label">Entity</span>
													<input
														class="te__input te__input--sm"
														type="text"
														list="te-custom-popup-entities"
														placeholder="sensor.current_version"
														value={entry.entity_id}
														oninput={(e) => updateCustomPopupEntity(section.id, entry.id, { entity_id: (e.target as HTMLInputElement).value })}
													/>
												</div>
												<div>
													<span class="te__label">Name override (optional)</span>
													<input
														class="te__input te__input--sm"
														type="text"
														placeholder="Core"
														value={entry.name ?? ''}
														oninput={(e) => updateCustomPopupEntity(section.id, entry.id, { name: (e.target as HTMLInputElement).value })}
													/>
												</div>
												<div>
													<span class="te__label">Icon override (optional)</span>
													<input
														class="te__input te__input--sm"
														type="text"
														placeholder="mdi:home-assistant"
														value={entry.icon ?? ''}
														oninput={(e) => updateCustomPopupEntity(section.id, entry.id, { icon: (e.target as HTMLInputElement).value })}
													/>
												</div>
												<div class="te__row">
													<button
														class="te__icon-btn te__icon-btn--danger"
														onclick={() => removeCustomPopupEntity(section.id, entry.id)}
														aria-label="Delete entity"
														title="Delete entity"
													>
														<Icon name="trash-2" size={13} />
													</button>
												</div>
											</div>
										{/each}

										<button
											class="te__add-btn"
											type="button"
											onclick={() => addCustomPopupEntity(section.id)}
											disabled={section.entities.length >= 10}
										>
											<Icon name="plus" size={14} />
											<span>{section.entities.length >= 10 ? 'Max 10 entities' : 'Add entity'}</span>
										</button>
									</div>
								{/each}
							</div>

							<datalist id="te-custom-popup-entities">
								{#each Object.keys($entities).sort() as candidate}
									<option value={candidate}></option>
								{/each}
							</datalist>
						</div>
					{/if}
				</div>
			{/if}

				{#if !isChipRowSection}
					<div class="te__group">
						<!-- ── Visibility ───────────────────────────────────────────────────────────── -->
						<span class="te__section-title">Visibility</span>
					{#each SHOW_TOGGLES as [key, label]}
						<label class="te__check">
							<input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />
							{label}
						</label>
					{/each}
				</div>
			{/if}

				<div class="te__group">
					<!-- ── Interactions ───────────────────────────────────────────────────────────── -->
					<span class="te__section-title">Interactions</span>
				{#each [['tap_action','Tap'],['hold_action','Hold'],['double_tap_action','Double tap']] as [key, label]}
					<div class="te__action-row">
						<span class="te__label">{label} action</span>
						<select class="te__select" value={actionType(key)} onchange={(e) => setAction(key, (e.target as HTMLSelectElement).value)}>
							{#each ACTION_TYPES as t}
								<option value={t}>{t === 'none' ? 'None' : t === 'more-info' ? 'More info' : t === 'call-service' ? 'Call service' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
							{/each}
						</select>
						{#if actionType(key) === 'navigate'}
							<input
								class="te__input"
								type="text"
								placeholder="/page-path"
								value={(tile.config[key] as Action & { path?: string })?.path ?? ''}
								oninput={(e) => save({ [key]: { ...(tile.config[key] as Action), path: (e.target as HTMLInputElement).value } })}
							/>
						{/if}
					</div>
				{/each}
				<label class="te__check">
					<input type="checkbox" checked={!!tile.config.confirm_action} onchange={(e) => save({ confirm_action: (e.target as HTMLInputElement).checked || undefined })} />
					Confirm before action
				</label>
			</div>
		</div>
	</aside>
{/if}

<style>
	/* ── Shell ───────────────────────────────────────────────────────────── */
	.te__backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 349;
		background: transparent;
	}
	@media (max-width: 639px) {
		.te__backdrop { display: block; }
	}

	.te {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(390px, 95dvw);
		z-index: 350;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	/* ── Header ───────────────────────────────────────────────────────────── */
	.te__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		gap: 8px;
	}

	.te__title {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.te__badge {
		flex-shrink: 0;
		font-size: 0.6rem;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.te__name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--fg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.te__header-btns {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.te__hbtn {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-muted);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.te__hbtn:hover { background: var(--hover); color: var(--fg); }
	.te__hbtn--danger { color: var(--color-danger); }

	/* ── Body / Groups ───────────────────────────────────────────────────────────── */
	.te__body {
		flex: 1;
		overflow: auto;
		padding: 16px 14px 20px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.te__group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 2px;
	}
	.te__group--boxed {
		padding: 12px;
		border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
		border-radius: var(--radius-sm);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--accent) 8%, var(--surface)) 0%,
				color-mix(in srgb, var(--accent) 4%, var(--surface)) 100%
			);
		box-shadow: inset 0 1px 0 color-mix(in srgb, white 6%, transparent);
	}
	.te__group--boxed .te__section-title {
		color: color-mix(in srgb, var(--fg) 72%, var(--accent));
	}
	.te__group--boxed .te__label {
		color: color-mix(in srgb, var(--fg) 82%, transparent);
	}
	.te__group--boxed .te__hint {
		color: color-mix(in srgb, var(--fg) 74%, transparent);
	}
	.te__subgroup {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 10px;
		border-top: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
	}
	.te__subgroup-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}

	.te__section-title {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
	}

	.te__label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--fg-subtle);
	}

	.te__input,
	.te__select,
	.te__textarea {
		width: 100%;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg);
		border-radius: var(--radius-sm);
		padding: 10px 12px;
		font: inherit;
	}

	.te__textarea {
		resize: vertical;
		min-height: 120px;
	}

	.te__input--num { padding-right: 8px; }

	/* ── Icon Picker ───────────────────────────────────────────────────────────── */
	.te__icon-links {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.te__icon-finder {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--accent);
		text-decoration: none;
		opacity: 0.8;
		transition: opacity var(--transition);
	}
	.te__icon-finder:hover { opacity: 1; }

	.te__builtin-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.te__builtin-list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		max-height: 240px;
		overflow-y: auto;
	}

	.te__builtin-item-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 4px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		font: inherit;
		transition: all var(--transition);
	}

	.te__builtin-item-box:hover {
		background: var(--hover);
		color: var(--fg);
		border-color: var(--fg-subtle);
	}

	.te__builtin-item-box--active {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.te__builtin-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		position: relative;
		overflow: hidden;
		isolation: isolate;
		transition: transform var(--transition);
	}

	.te__builtin-item-box:hover .te__builtin-preview {
		transform: scale(1.1);
	}

	.te__builtin-name {
		font-size: 0.62rem;
		font-weight: 600;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		opacity: 0.8;
	}

	/* ── Form Helpers ───────────────────────────────────────────────────────────── */
	.te__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.84rem;
		color: var(--fg);
		cursor: pointer;
	}
	.te__check input { margin: 0; }

	.te__row { display: flex; align-items: center; }

	.te__preset-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.te__preset {
		height: 38px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		font: inherit;
		cursor: pointer;
	}

	.te__preset--active {
		border-color: var(--accent);
		color: var(--fg);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.te__action-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.te__grid3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
	.te__grid2 {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	/* ── Camera Popup Editor ─────────────────────────────────────────────── */
	.te__camera-popup-divider {
		grid-column: 1 / -1;
		margin-top: 4px;
		border-top: 1px solid var(--border);
		padding-top: 12px;
	}
	.te__camera-popup-heading {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--fg);
	}
	.te__camera-popup-full {
		grid-column: 1 / -1;
	}

	.te__input--sm, .te__select--sm {
		padding: 6px 8px;
		font-size: 0.75rem;
	}

	.te__icon-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--fg-muted);
		border-radius: 4px;
		cursor: pointer;
	}
	.te__icon-btn:hover { background: var(--hover); color: var(--fg); }
	.te__icon-btn--danger:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); }

	.te__add-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
		background: none;
		border: none;
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		opacity: 0.8;
	}
	.te__add-btn:hover { opacity: 1; }

	.te__add-btn--large {
		justify-content: center;
		padding: 10px;
		border: 1px dashed var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.78rem;
	}

	/* ── Player Map & Feeds ───────────────────────────────────────────────────────────── */

	.te__mt12 { margin-top: 12px; }

	.te__hint {
		font-size: 0.72rem;
		color: var(--fg-subtle);
		line-height: 1.5;
		margin: 0;
	}
	.te__hint code {
		font-family: monospace;
		background: var(--hover);
		padding: 1px 4px;
		border-radius: 3px;
	}
	.te__hint--warn { color: #d4a04a; }

	.te__player-map {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.te__pm-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--surface) 50%, transparent);
	}

	.te__pm-header {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.te__pm-index {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--fg-subtle);
		min-width: 20px;
		flex: 1;
	}

	.te__pm-move {
		width: 22px;
		height: 22px;
		color: var(--fg-subtle);
	}
	.te__pm-move:hover { color: var(--fg); }

	.te__pm-grid {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.te__row--gap { gap: 16px; }
	.te__feed-row { cursor: grab; }
	.te__feed-row:active { cursor: grabbing; }
	.te__feed-drag {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		color: var(--fg-subtle);
	}
	.te__feed-primary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		color: var(--fg-subtle);
		margin-left: auto;
	}
	.te__feed-primary input {
		margin: 0;
	}

	.te__pm-del {
		flex-shrink: 0;
		margin-left: 6px;
	}
</style>
