
<script lang="ts">
	import type { HassEntities } from 'home-assistant-js-websocket';
	import type { Tile, Condition } from '$lib/types/dashboard';
	import type { Component } from 'svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { evaluateConditions } from '$lib/ha/entities';
	import { isEditing } from '$lib/stores/editMode';
	import TileWrapper from '$lib/components/tiles/TileWrapper.svelte';

	// ── Props ────────────────────────────────────────────────────────────────

	interface Props {
		tile: Tile;
		pageId?: string;
		sectionId?: string;
		preview?: boolean;
		onEditDragStart?: (event: PointerEvent) => void;
		onEditResizeStart?: (event: PointerEvent) => void;
	}

	const { tile, pageId, sectionId, preview = false, onEditDragStart, onEditResizeStart }: Props = $props();
	const editing = $derived($isEditing);

	// ── Live Entity ──────────────────────────────────────────────────────────

	const liveEntity = $derived(tile.entity_id ? ($optimisticEntities[tile.entity_id] ?? null) : null);
	const PREVIEW_ART_DATA_URI =
		'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 675%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop stop-color=%22%23172a3b%22/%3E%3Cstop offset=%221%22 stop-color=%22%23263b53%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%221200%22 height=%22675%22 fill=%22url(%23g)%22/%3E%3Ccircle cx=%22180%22 cy=%22180%22 r=%2290%22 fill=%22%23ffffff14%22/%3E%3Cpath d=%22M120 560l240-220 160 130 210-250 350 340H120z%22 fill=%22%23ffffff1c%22/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 fill=%22%23f8fbff%22 font-size=%2270%22 text-anchor=%22middle%22 font-family=%22system-ui,-apple-system,Segoe UI,Roboto,sans-serif%22%3ENow Playing%3C/text%3E%3C/svg%3E';

	function makePreviewEntity(entityId: string, state: string, attributes: Record<string, unknown>) {
		const now = new Date().toISOString();
		return {
			entity_id: entityId,
			state,
			attributes,
			last_changed: now,
			last_updated: now,
			context: { id: 'preview', parent_id: null, user_id: null }
		} as const;
	}

	function buildPreviewEntity(tile: Tile, existing: ReturnType<typeof makePreviewEntity> | null) {
		const fallbackName =
			(tile.config?.name as string | undefined) ??
			(existing?.attributes?.friendly_name as string | undefined) ??
			'Preview';
		const entityId = tile.entity_id ?? `${tile.type}.preview`;
		const existingIcon = typeof existing?.attributes?.icon === 'string' ? existing.attributes.icon : undefined;
		const withCommonAttrs = (attrs: Record<string, unknown>) => ({
			...attrs,
			friendly_name: fallbackName,
			...(existingIcon ? { icon: existingIcon } : {})
		});

		// Keep generic entity previews tied to the selected live entity so users see
		// a realistic "entity tile" preview for that source.
		if (tile.type === 'entity' && existing) {
			return makePreviewEntity(entityId, existing.state, withCommonAttrs(existing.attributes as Record<string, unknown>));
		}

		switch (tile.type) {
			case 'light':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					brightness: 178,
					supported_color_modes: ['brightness', 'color_temp'],
					color_temp: 320,
					min_mireds: 153,
					max_mireds: 500
				}));
			case 'climate':
				return makePreviewEntity(entityId, 'cool', withCommonAttrs({
					current_temperature: 72,
					temperature: 70,
					current_humidity: 44,
					hvac_action: 'cooling',
					hvac_modes: ['off', 'cool', 'heat', 'heat_cool', 'auto'],
					min_temp: 60,
					max_temp: 82
				}));
			case 'cover':
				return makePreviewEntity(entityId, 'open', withCommonAttrs({
					current_position: 68,
					device_class: 'blind'
				}));
			case 'media_player':
				return makePreviewEntity(entityId, 'playing', withCommonAttrs({
					media_title: 'Now Playing',
					media_artist: 'Preview Artist',
					media_duration: 240,
					media_position: 74,
					media_position_updated_at: new Date().toISOString(),
					entity_picture: PREVIEW_ART_DATA_URI,
					volume_level: 0.52
				}));
			case 'media_hero':
				return makePreviewEntity(entityId, 'playing', withCommonAttrs({
					media_title: 'Preview Track',
					media_artist: 'Preview Artist',
					media_duration: 240,
					media_position: 74,
					media_position_updated_at: new Date().toISOString(),
					entity_picture: PREVIEW_ART_DATA_URI
				}));
			case 'camera':
				return makePreviewEntity(entityId, 'idle', withCommonAttrs({
					access_token: 'preview',
					entity_picture: PREVIEW_ART_DATA_URI,
					motion_detection: true
				}));
			case 'alarm_panel':
				return makePreviewEntity(entityId, 'disarmed', withCommonAttrs({
					code_format: 'number',
					supported_features: 7
				}));
			case 'siren':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					available_tones: ['Burglar', 'Fire', 'Chime'],
					tone: 'Burglar'
				}));
			case 'fan':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					percentage: 58,
					preset_modes: ['auto', 'sleep', 'boost'],
					preset_mode: 'auto',
					oscillating: true
				}));
			case 'lock':
				return makePreviewEntity(entityId, 'locked', withCommonAttrs({}));
			case 'vacuum':
				return makePreviewEntity(entityId, 'cleaning', withCommonAttrs({
					battery_level: 74,
					fan_speed_list: ['quiet', 'balanced', 'turbo'],
					fan_speed: 'balanced'
				}));
			case 'lawn_mower':
				return makePreviewEntity(entityId, 'mowing', withCommonAttrs({
					activity: 'mowing',
					battery_level: 82
				}));
			case 'humidifier':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					current_humidity: 43,
					humidity: 48,
					mode: 'auto',
					available_modes: ['auto', 'sleep', 'boost']
				}));
			case 'person':
				return makePreviewEntity(entityId, 'home', withCommonAttrs({
					latitude: 40.713,
					longitude: -74.006,
					source: 'gps'
				}));
			case 'slider':
				return makePreviewEntity(entityId, '42', withCommonAttrs({
					min: 0,
					max: 100,
					step: 1,
					unit_of_measurement: '%'
				}));
			case 'input_select':
				return makePreviewEntity(entityId, 'Auto', withCommonAttrs({
					options: ['Off', 'Auto', 'On']
				}));
			case 'remote':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({}));
			case 'timer':
				return makePreviewEntity(entityId, 'active', withCommonAttrs({
					duration: '00:30:00',
					remaining: '00:11:32',
					finishes_at: new Date(Date.now() + 11 * 60 * 1000).toISOString()
				}));
			case 'calendar':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					message: 'Upcoming event',
					start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
					end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
				}));
			case 'weather':
				return makePreviewEntity(entityId, 'partlycloudy', withCommonAttrs({
					temperature: 74,
					temperature_unit: '°F',
					humidity: 41,
					wind_speed: 8,
					wind_speed_unit: 'mph',
					forecast: [
						{ datetime: new Date().toISOString(), temperature: 78, templow: 65, condition: 'partlycloudy' },
						{ datetime: new Date(Date.now() + 86400000).toISOString(), temperature: 81, templow: 67, condition: 'sunny' },
						{ datetime: new Date(Date.now() + 172800000).toISOString(), temperature: 75, templow: 62, condition: 'rainy' }
					]
				}));
			case 'history':
			case 'gauge':
			case 'statistic':
				return makePreviewEntity(entityId, '42.5', withCommonAttrs({
					unit_of_measurement: tile.type === 'gauge' ? '%' : 'kWh',
					device_class: tile.type === 'gauge' ? 'power' : 'energy'
				}));
			case 'logbook':
				return makePreviewEntity(entityId, 'door_opened', withCommonAttrs({}));
			case 'energy':
				return makePreviewEntity(entityId, '1264', withCommonAttrs({
					unit_of_measurement: 'W',
					device_class: 'power'
				}));
			case 'map':
				return makePreviewEntity(entityId, 'home', withCommonAttrs({
					latitude: 40.713,
					longitude: -74.006
				}));
			case 'todo':
				return makePreviewEntity(entityId, '2', withCommonAttrs({
					items: [
						{ summary: 'Replace filter', status: 'needs_action', uid: '1' },
						{ summary: 'Run diagnostics', status: 'needs_action', uid: '2' },
						{ summary: 'Backup config', status: 'completed', uid: '3' }
					]
				}));
			case 'update':
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					title: 'Firmware Update',
					installed_version: '1.0.2',
					latest_version: '1.1.0',
					in_progress: false
				}));
			case 'water_heater':
				return makePreviewEntity(entityId, 'heat', withCommonAttrs({
					current_temperature: 118,
					temperature: 122,
					min_temp: 95,
					max_temp: 140,
					operation_mode: 'heat',
					operation_list: ['off', 'heat', 'eco']
				}));
			default:
				return makePreviewEntity(entityId, 'on', withCommonAttrs({
					unit_of_measurement: '',
					device_class: tile.type
				}));
		}
	}

	const entity = $derived(preview ? buildPreviewEntity(tile, liveEntity as any) : liveEntity);

	type TileComponent = Component<any>;
	type TileLoader = () => Promise<TileComponent>;

	const componentLoaders: Record<Tile['type'], TileLoader> = {
		divider: async () =>
			(await import('$lib/components/tiles/DividerTile.svelte')).default as TileComponent,
		markdown: async () =>
			(await import('$lib/components/tiles/MarkdownTile.svelte')).default as TileComponent,
		entity: async () =>
			(await import('$lib/components/tiles/EntityTile.svelte')).default as TileComponent,
		button: async () =>
			(await import('$lib/components/tiles/ButtonTile.svelte')).default as TileComponent,
		light: async () =>
			(await import('$lib/components/tiles/LightTile.svelte')).default as TileComponent,
		climate: async () =>
			(await import('$lib/components/tiles/ClimateTile.svelte')).default as TileComponent,
		cover: async () =>
			(await import('$lib/components/tiles/CoverTile.svelte')).default as TileComponent,
		lock: async () =>
			(await import('$lib/components/tiles/LockTile.svelte')).default as TileComponent,
		fan: async () =>
			(await import('$lib/components/tiles/FanTile.svelte')).default as TileComponent,
		humidifier: async () =>
			(await import('$lib/components/tiles/HumidifierTile.svelte')).default as TileComponent,
		water_heater: async () =>
			(await import('$lib/components/tiles/WaterHeaterTile.svelte')).default as TileComponent,
		siren: async () =>
			(await import('$lib/components/tiles/SirenTile.svelte')).default as TileComponent,
		media_player: async () =>
			(await import('$lib/components/tiles/MediaPlayerTile.svelte')).default as TileComponent,
		camera: async () =>
			(await import('$lib/components/tiles/CameraTile.svelte')).default as TileComponent,
		alarm_panel: async () =>
			(await import('$lib/components/tiles/AlarmPanelTile.svelte')).default as TileComponent,
		vacuum: async () =>
			(await import('$lib/components/tiles/VacuumTile.svelte')).default as TileComponent,
		lawn_mower: async () =>
			(await import('$lib/components/tiles/LawnMowerTile.svelte')).default as TileComponent,
		person: async () =>
			(await import('$lib/components/tiles/PersonTile.svelte')).default as TileComponent,
		slider: async () =>
			(await import('$lib/components/tiles/SliderTile.svelte')).default as TileComponent,
		input_select: async () =>
			(await import('$lib/components/tiles/InputSelectTile.svelte')).default as TileComponent,
		remote: async () =>
			(await import('$lib/components/tiles/RemoteTile.svelte')).default as TileComponent,
		timer: async () =>
			(await import('$lib/components/tiles/TimerTile.svelte')).default as TileComponent,
		calendar: async () =>
			(await import('$lib/components/tiles/CalendarTile.svelte')).default as TileComponent,
		weather: async () =>
			(await import('$lib/components/tiles/WeatherTile.svelte')).default as TileComponent,
		history: async () =>
			(await import('$lib/components/tiles/GraphTile.svelte')).default as TileComponent,
		gauge: async () =>
			(await import('$lib/components/tiles/GraphTile.svelte')).default as TileComponent,
		statistic: async () =>
			(await import('$lib/components/tiles/GraphTile.svelte')).default as TileComponent,
		logbook: async () =>
			(await import('$lib/components/tiles/LogbookTile.svelte')).default as TileComponent,
		energy: async () =>
			(await import('$lib/components/tiles/EnergyTile.svelte')).default as TileComponent,
		todo: async () =>
			(await import('$lib/components/tiles/TodoTile.svelte')).default as TileComponent,
		update: async () =>
			(await import('$lib/components/tiles/UpdateTile.svelte')).default as TileComponent,
		map: async () =>
			(await import('$lib/components/tiles/MapTile.svelte')).default as TileComponent,
		iframe: async () =>
			(await import('$lib/components/tiles/IframeTile.svelte')).default as TileComponent,
		image: async () =>
			(await import('$lib/components/tiles/ImageTile.svelte')).default as TileComponent,
		media_hero: async () =>
			(await import('$lib/components/tiles/MediaHeroTile.svelte')).default as TileComponent,
		conditional: async () => {
			// 'conditional' is an internal type that requires its own resolution logic.
			// It must NOT silently render as EntityTile — return null so the placeholder
			// renders instead, making misconfigured tiles visible in development.
			console.warn('[stratum] Tile type "conditional" has no standalone renderer. Use visibility conditions on a regular tile instead.');
			return null as unknown as TileComponent;
		}
	};

	let LoadedComponent = $state<TileComponent | null>(null);
	let loadedType = $state<Tile['type'] | null>(null);
	let pendingLoad = 0;
	const componentCache: Partial<Record<Tile['type'], TileComponent>> = {};

	$effect(() => {
		const type = tile.type;

		// Avoid flicker during edit-mode dragging/resizing: the tile object changes
		// frequently (layout updates) but the component type rarely does. Only load
		// when `type` changes or a component hasn't been cached yet.
		if (LoadedComponent && loadedType === type) return;

		const cached = componentCache[type];
		if (cached) {
			LoadedComponent = cached;
			loadedType = type;
			return;
		}

		const loader = componentLoaders[type];
		if (!loader) {
			console.warn('[stratum] No loader found for tile type:', type);
			LoadedComponent = null;
			loadedType = null;
			return;
		}

		// Clear only when the type actually changes (prevents showing wrong component).
		if (loadedType !== type) {
			LoadedComponent = null;
		}

		const loadId = ++pendingLoad;
		void loader()
			.then((component) => {
				if (loadId !== pendingLoad) return;
				componentCache[type] = component;
				LoadedComponent = component;
				loadedType = type;
			})
			.catch((err) => {
				console.error('[stratum] Failed to load tile component:', type, err);
			});
	});

	const shouldShow = $derived.by(() => {
		if (editing) return true;

		// 1. Basic visibility conditions on the tile itself
		if ((tile.conditions?.length ?? 0) > 0 && !evaluateConditions(tile.conditions ?? [], $optimisticEntities)) {
			return false;
		}

		// 2. Entity-less tiles without conditions always show
		return true;
	});

	const previewHistory = $derived.by(() => {
		if (!preview) return [];
		const now = Date.now();
		return [
			{ t: new Date(now - 50 * 60_000).toISOString(), v: 31.2 },
			{ t: new Date(now - 40 * 60_000).toISOString(), v: 34.6 },
			{ t: new Date(now - 30 * 60_000).toISOString(), v: 33.8 },
			{ t: new Date(now - 20 * 60_000).toISOString(), v: 37.4 },
			{ t: new Date(now - 10 * 60_000).toISOString(), v: 39.1 },
			{ t: new Date(now).toISOString(), v: 42.5 }
		];
	});

	const componentProps = $derived.by(() => {
		switch (tile.type) {
			case 'divider':
			case 'markdown':
				return { tile };
			case 'history':
				return { tile, entity, mode: 'history', history: preview ? previewHistory : undefined };
			case 'gauge':
				return { tile, entity, mode: 'gauge', history: preview ? previewHistory : undefined };
			case 'statistic':
				return {
					tile,
					entity,
					mode: 'statistic',
					history: preview ? previewHistory : undefined,
					statisticValue: preview ? 42.5 : undefined
				};
			default:
				return { tile, entity };
		}
	});
</script>

{#if shouldShow}
	<TileWrapper {tile} {entity} {pageId} {sectionId} {preview} {onEditDragStart} {onEditResizeStart}>
		{#if LoadedComponent}
			<LoadedComponent {...componentProps} />
		{:else}
			<div class="tile-renderer__placeholder" aria-hidden="true"></div>
		{/if}
	</TileWrapper>
{/if}

<style>
	.tile-renderer__placeholder {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--hover) 85%, transparent) 0%,
				color-mix(in srgb, var(--active) 55%, transparent) 100%
			);
	}

</style>
