<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — MoreInfoDialog.svelte
	// Root dialog dispatcher. Reads the active dialog from uiStore and
	// the dialog config from dashboardStore, then renders MoreInfoShell with
	// the appropriate tile-type-specific or domain-specific content inside.
	// ─────────────────────────────────────────────────────────────────────────

	import { dashboardStore } from '$lib/stores/dashboard';
	import { uiStore, activeDialog } from '$lib/stores/ui';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import MoreInfoShell  from './MoreInfoShell.svelte';
	import EntityMoreInfo from './EntityMoreInfo.svelte';
	import AlarmPanelMoreInfo from './AlarmPanelMoreInfo.svelte';
	import ActionMoreInfo from './ActionMoreInfo.svelte';
	import CameraMoreInfo from './CameraMoreInfo.svelte';
	import CalendarMoreInfo from './CalendarMoreInfo.svelte';
	import ClimateMoreInfo from './ClimateMoreInfo.svelte';
	import CounterMoreInfo from './CounterMoreInfo.svelte';
	import CoverMoreInfo from './CoverMoreInfo.svelte';
	import DateTimeMoreInfo from './DateTimeMoreInfo.svelte';
	import LightMoreInfo  from './LightMoreInfo.svelte';
	import FanMoreInfo    from './FanMoreInfo.svelte';
	import HumidifierMoreInfo from './HumidifierMoreInfo.svelte';
	import GraphTileMoreInfo from './GraphTileMoreInfo.svelte';
	import GroupMoreInfo from './GroupMoreInfo.svelte';
	import LockMoreInfo from './LockMoreInfo.svelte';
	import LawnMowerMoreInfo from './LawnMowerMoreInfo.svelte';
	import LogbookTileMoreInfo from './LogbookTileMoreInfo.svelte';
	import MapTileMoreInfo from './MapTileMoreInfo.svelte';
	import MediaMoreInfo  from './MediaMoreInfo.svelte';
	import NumberMoreInfo from './NumberMoreInfo.svelte';
	import PersonMoreInfo from './PersonMoreInfo.svelte';
	import RemoteMoreInfo from './RemoteMoreInfo.svelte';
	import SelectMoreInfo from './SelectMoreInfo.svelte';
	import SensorMoreInfo from './SensorMoreInfo.svelte';
	import SirenMoreInfo from './SirenMoreInfo.svelte';
	import SwitchMoreInfo from './SwitchMoreInfo.svelte';
	import SunMoreInfo from './SunMoreInfo.svelte';
	import TimerMoreInfo from './TimerMoreInfo.svelte';
	import TextMoreInfo from './TextMoreInfo.svelte';
	import TodoMoreInfo from './TodoMoreInfo.svelte';
	import TvMoreInfo     from './TvMoreInfo.svelte';
	import UpdateMoreInfo from './UpdateMoreInfo.svelte';
	import ValveMoreInfo from './ValveMoreInfo.svelte';
	import VacuumMoreInfo from './VacuumMoreInfo.svelte';
	import WaterHeaterMoreInfo from './WaterHeaterMoreInfo.svelte';
	import WeatherMoreInfo from './WeatherMoreInfo.svelte';
	import ZoneMoreInfo from './ZoneMoreInfo.svelte';

	// ─── Dialog state ─────────────────────────────────────────────────────────

	const dialog    = $derived($activeDialog);
	const isOpen    = $derived(dialog !== null);
	const entityId  = $derived(dialog?.entityId ?? '');
	const tileId    = $derived(dialog?.tileId ?? '');
	const tileType  = $derived(dialog?.tileType);

	// ─── Config ───────────────────────────────────────────────────────────────

	const storeState = $derived($dashboardStore);
	const cfg        = $derived(storeState.dialog);
	// styleOverride from the tile's openDialog call takes priority over global config
	const style      = $derived(dialog?.styleOverride ?? cfg.moreInfoStyle);
	const side       = $derived(cfg.drawerSide);

	// ─── Panel title ──────────────────────────────────────────────────────────

	const entity = $derived(entityId ? ($optimisticEntities[entityId] ?? null) : null);
	const selectedTile = $derived.by(() => {
		if (!tileId) return null;
		for (const page of storeState.pages) {
			for (const section of page.sections) {
				const tile = section.tiles.find((t) => t.id === tileId);
				if (tile) return tile;
			}
		}
		return null;
	});
	const title  = $derived(
		entity ? getEntityName(entity) :
		(selectedTile ? ((selectedTile.config.name as string | undefined) ?? selectedTile.type) : entityId)
	);

	// ─── Domain routing ───────────────────────────────────────────────────────

	const domain = $derived(entityId ? getDomain(entityId) : '');

	// TV detection: device_class first, then media_content_type as fallback
	const TV_CONTENT_TYPES = new Set(['tvshow', 'video', 'movie', 'episode', 'channel']);
	const isTV = $derived(
		domain === 'media_player' && (
			(entity?.attributes.device_class as string | undefined) === 'tv' ||
			TV_CONTENT_TYPES.has((entity?.attributes.media_content_type as string | undefined) ?? '')
		)
	);

	function close() {
		uiStore.closeDialog();
	}
</script>

<MoreInfoShell
	open={isOpen}
	{style}
	{side}
	{title}
	onclose={close}
>
	{#if tileType === 'map' && selectedTile}
		<MapTileMoreInfo tile={selectedTile} {entity} />
	{:else if (tileType === 'history' || tileType === 'gauge' || tileType === 'statistic') && selectedTile}
		<GraphTileMoreInfo tile={selectedTile} {entity} mode={tileType} />
	{:else if tileType === 'logbook' && selectedTile}
		<LogbookTileMoreInfo tile={selectedTile} {entity} />
	{:else if domain === 'light'}
		<LightMoreInfo {entityId} />
	{:else if domain === 'fan'}
		<FanMoreInfo {entityId} />
	{:else if domain === 'alarm_control_panel'}
		<AlarmPanelMoreInfo {entityId} />
	{:else if domain === 'camera'}
		<CameraMoreInfo {entityId} />
	{:else if domain === 'calendar'}
		<CalendarMoreInfo {entityId} />
	{:else if domain === 'climate'}
		<ClimateMoreInfo {entityId} />
	{:else if domain === 'counter'}
		<CounterMoreInfo {entityId} />
	{:else if domain === 'cover'}
		<CoverMoreInfo {entityId} />
	{:else if domain === 'input_datetime'}
		<DateTimeMoreInfo {entityId} />
	{:else if domain === 'group'}
		<GroupMoreInfo {entityId} />
	{:else if domain === 'humidifier'}
		<HumidifierMoreInfo {entityId} />
	{:else if domain === 'button' || domain === 'input_button' || domain === 'scene' || domain === 'script' || domain === 'automation'}
		<ActionMoreInfo {entityId} />
	{:else if domain === 'lock'}
		<LockMoreInfo {entityId} />
	{:else if domain === 'lawn_mower'}
		<LawnMowerMoreInfo {entityId} />
	{:else if domain === 'media_player' && isTV}
		<TvMoreInfo {entityId} />
	{:else if domain === 'media_player'}
		<MediaMoreInfo {entityId} />
	{:else if domain === 'input_number' || domain === 'number'}
		<NumberMoreInfo {entityId} />
	{:else if domain === 'person' || domain === 'device_tracker'}
		<PersonMoreInfo {entityId} />
	{:else if domain === 'remote'}
		<RemoteMoreInfo {entityId} />
	{:else if domain === 'input_select' || domain === 'select'}
		<SelectMoreInfo {entityId} />
	{:else if domain === 'sensor' || domain === 'binary_sensor'}
		<SensorMoreInfo {entityId} />
	{:else if domain === 'siren'}
		<SirenMoreInfo {entityId} />
	{:else if domain === 'switch' || domain === 'input_boolean'}
		<SwitchMoreInfo {entityId} />
	{:else if domain === 'sun'}
		<SunMoreInfo {entityId} />
	{:else if domain === 'timer'}
		<TimerMoreInfo {entityId} />
	{:else if domain === 'input_text' || domain === 'text'}
		<TextMoreInfo {entityId} />
	{:else if domain === 'todo'}
		<TodoMoreInfo {entityId} />
	{:else if domain === 'update'}
		<UpdateMoreInfo {entityId} />
	{:else if domain === 'valve'}
		<ValveMoreInfo {entityId} />
	{:else if domain === 'vacuum'}
		<VacuumMoreInfo {entityId} />
	{:else if domain === 'water_heater'}
		<WaterHeaterMoreInfo {entityId} />
	{:else if domain === 'weather'}
		<WeatherMoreInfo {entityId} />
	{:else if domain === 'zone'}
		<ZoneMoreInfo {entityId} />
	{:else}
		<EntityMoreInfo {entityId} />
	{/if}
</MoreInfoShell>
