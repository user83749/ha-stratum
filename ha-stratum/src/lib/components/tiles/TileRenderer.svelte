<script lang="ts">
	import type { HassEntities } from 'home-assistant-js-websocket';
	import type { Tile, Condition } from '$lib/types/dashboard';
	import type { Component } from 'svelte';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import TileWrapper from '$lib/components/tiles/TileWrapper.svelte';

	// ─── Props ───────────────────────────────────────────────────────────────

	interface Props {
		tile: Tile;
		pageId?: string;
		sectionId?: string;
		onEditDragStart?: (event: PointerEvent) => void;
		onEditResizeStart?: (event: PointerEvent) => void;
	}

	const { tile, pageId, sectionId, onEditDragStart, onEditResizeStart }: Props = $props();

	// ─── Live entity ─────────────────────────────────────────────────────────

	const entity = $derived(tile.entity_id ? ($optimisticEntities[tile.entity_id] ?? null) : null);

	type TileComponent = Component<any>;
	type TileLoader = () => Promise<TileComponent>;

	const componentLoaders: Record<Tile['type'], TileLoader> = {
		divider: async () =>
			(await import('$lib/components/tiles/DividerTile.svelte')).default as TileComponent,
		markdown: async () =>
			(await import('$lib/components/tiles/MarkdownTile.svelte')).default as TileComponent,
		clock: async () =>
			(await import('$lib/components/tiles/ClockTile.svelte')).default as TileComponent,
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
			(await import('$lib/components/tiles/ImageTile.svelte')).default as TileComponent
	};

	let LoadedComponent = $state<TileComponent | null>(null);
	let pendingLoad = 0;

	$effect(() => {
		const loadId = ++pendingLoad;
		const loader = componentLoaders[tile.type];
		LoadedComponent = null;
		void loader().then((component) => {
			if (loadId === pendingLoad) {
				LoadedComponent = component;
			}
		}).catch((err) => {
			console.error('[stratum] Failed to load tile component:', tile.type, err);
		});
	});

	// ─── Condition evaluation ─────────────────────────────────────────────────

	function evaluateConditions(conditions: Condition[], entityMap: HassEntities): boolean {
		return conditions.every((cond) => {
			const e = entityMap[cond.entity_id];
			if (!e) return false;
			const val = cond.attribute ? String(e.attributes[cond.attribute] ?? '') : e.state;
			let match = true;
			if (cond.state !== undefined) match = val === cond.state;
			if (cond.above !== undefined) match = match && parseFloat(val) > cond.above;
			if (cond.below !== undefined) match = match && parseFloat(val) < cond.below;
			return cond.not ? !match : match;
		});
	}

	const shouldShow = $derived(
		!tile.conditions || tile.conditions.length === 0
			? true
			: evaluateConditions(tile.conditions, $optimisticEntities)
	);

	const componentProps = $derived.by(() => {
		switch (tile.type) {
			case 'divider':
			case 'markdown':
			case 'clock':
				return { tile };
			case 'history':
				return { tile, entity, mode: 'history' };
			case 'gauge':
				return { tile, entity, mode: 'gauge' };
			case 'statistic':
				return { tile, entity, mode: 'statistic' };
			default:
				return { tile, entity };
		}
	});
</script>

{#if shouldShow}
	<TileWrapper {tile} {entity} {pageId} {sectionId} {onEditDragStart} {onEditResizeStart}>
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
