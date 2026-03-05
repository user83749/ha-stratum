// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Home Assistant Service Calls
// Thin typed wrappers around conn.sendMessagePromise for every HA domain.
// ─────────────────────────────────────────────────────────────────────────────

import { get } from 'svelte/store';
import { connection, entities } from './websocket';
import type { Connection } from 'home-assistant-js-websocket';
import { isDemoMode } from '$lib/demo/index';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConn(): Connection {
	const conn = get(connection);
	if (!conn) throw new Error('Not connected to Home Assistant');
	return conn;
}

export interface ServiceTarget {
	entity_id?: string | string[];
	area_id?:   string | string[];
	device_id?: string | string[];
}

/** Raw callService — all typed wrappers delegate here. */
export async function callService(
	domain: string,
	service: string,
	serviceData: Record<string, unknown> = {},
	target?: ServiceTarget
): Promise<void> {
	// In demo mode: fake toggle/turn_on/turn_off by mutating the entities store directly.
	if (isDemoMode()) {
		const entityIds: string[] = [];
		if (target?.entity_id) {
			if (Array.isArray(target.entity_id)) entityIds.push(...target.entity_id);
			else entityIds.push(target.entity_id);
		}
		for (const id of entityIds) {
			if (service === 'toggle') {
				entities.update((all) => {
					const e = all[id];
					if (!e) return all;
					return { ...all, [id]: { ...e, state: e.state === 'on' ? 'off' : 'on' } };
				});
			} else if (service === 'turn_on') {
				entities.update((all) => {
					const e = all[id];
					if (!e) return all;
					const attrs = serviceData.brightness_pct !== undefined
						? { ...e.attributes, brightness: Math.round((serviceData.brightness_pct as number) / 100 * 255) }
						: e.attributes;
					return { ...all, [id]: { ...e, state: 'on', attributes: attrs } };
				});
			} else if (service === 'turn_off') {
				entities.update((all) => {
					const e = all[id];
					if (!e) return all;
					return { ...all, [id]: { ...e, state: 'off' } };
				});
			}
		}
		return;
	}
	const conn = getConn();
	await conn.sendMessagePromise({
		type: 'call_service',
		domain,
		service,
		service_data: serviceData,
		...(target ? { target } : {})
	});
}

/** Shorthand for the very common single-entity target pattern. */
function target(entityId: string): ServiceTarget {
	return { entity_id: entityId };
}

// ─── Homeassistant (generic) ──────────────────────────────────────────────────

export const haService = {
	toggle:      (entityId: string) => callService('homeassistant', 'toggle',       {}, target(entityId)),
	turnOn:      (entityId: string) => callService('homeassistant', 'turn_on',      {}, target(entityId)),
	turnOff:     (entityId: string) => callService('homeassistant', 'turn_off',     {}, target(entityId)),
	updateEntity:(entityId: string) => callService('homeassistant', 'update_entity',{}, target(entityId)),
	reloadAll:   ()                 => callService('homeassistant', 'reload_all')
};

// ─── Light ───────────────────────────────────────────────────────────────────

export interface LightTurnOnData {
	brightness?:       number;   // 0–255
	brightness_pct?:   number;   // 0–100
	color_temp?:       number;   // mireds
	color_temp_kelvin?:number;   // Kelvin
	rgb_color?:        [number, number, number];
	rgbw_color?:       [number, number, number, number];
	hs_color?:         [number, number]; // hue 0–360, saturation 0–100
	xy_color?:         [number, number];
	effect?:           string;
	flash?:            'short' | 'long';
	transition?:       number;   // seconds
}

export const lightService = {
	toggle:  (entityId: string, data?: LightTurnOnData) =>
		callService('light', 'toggle',   (data ?? {}) as Record<string, unknown>, target(entityId)),
	turnOn:  (entityId: string, data?: LightTurnOnData) =>
		callService('light', 'turn_on',  (data ?? {}) as Record<string, unknown>, target(entityId)),
	turnOff: (entityId: string, data?: { transition?: number; flash?: 'short' | 'long' }) =>
		callService('light', 'turn_off', data ?? {}, target(entityId)),
	setBrightness: (entityId: string, pct: number) =>
		callService('light', 'turn_on', { brightness_pct: Math.round(Math.max(0, Math.min(100, pct))) }, target(entityId)),
	setColorTemp: (entityId: string, kelvin: number) =>
		callService('light', 'turn_on', { color_temp_kelvin: kelvin }, target(entityId)),
	setRgb: (entityId: string, r: number, g: number, b: number) =>
		callService('light', 'turn_on', { rgb_color: [r, g, b] }, target(entityId)),
	setEffect: (entityId: string, effect: string) =>
		callService('light', 'turn_on', { effect }, target(entityId))
};

// ─── Switch ───────────────────────────────────────────────────────────────────

export const switchService = {
	toggle:  (entityId: string) => callService('switch', 'toggle',   {}, target(entityId)),
	turnOn:  (entityId: string) => callService('switch', 'turn_on',  {}, target(entityId)),
	turnOff: (entityId: string) => callService('switch', 'turn_off', {}, target(entityId))
};

// ─── Climate ─────────────────────────────────────────────────────────────────

export type HvacMode = 'off' | 'heat' | 'cool' | 'heat_cool' | 'auto' | 'dry' | 'fan_only';
export type FanMode  = 'auto' | 'low' | 'medium' | 'high' | 'top' | 'middle' | 'focus' | 'diffuse' | string;
export type SwingMode = 'off' | 'on' | 'vertical' | 'horizontal' | 'both' | string;
export type PresetMode = 'none' | 'eco' | 'away' | 'boost' | 'comfort' | 'house' | 'sleep' | 'activity' | string;

export const climateService = {
	setTemperature:  (entityId: string, temperature: number, hvacMode?: HvacMode) =>
		callService('climate', 'set_temperature', { temperature, ...(hvacMode ? { hvac_mode: hvacMode } : {}) }, target(entityId)),
	setTargetTempRange: (entityId: string, low: number, high: number) =>
		callService('climate', 'set_temperature', { target_temp_low: low, target_temp_high: high }, target(entityId)),
	setHvacMode:     (entityId: string, hvacMode: HvacMode) =>
		callService('climate', 'set_hvac_mode',     { hvac_mode: hvacMode },     target(entityId)),
	setFanMode:      (entityId: string, fanMode: FanMode) =>
		callService('climate', 'set_fan_mode',      { fan_mode: fanMode },        target(entityId)),
	setPresetMode:   (entityId: string, presetMode: PresetMode) =>
		callService('climate', 'set_preset_mode',   { preset_mode: presetMode },  target(entityId)),
	setSwingMode:    (entityId: string, swingMode: SwingMode) =>
		callService('climate', 'set_swing_mode',    { swing_mode: swingMode },    target(entityId)),
	setHumidity:     (entityId: string, humidity: number) =>
		callService('climate', 'set_humidity',      { humidity },                 target(entityId)),
	turnOn:          (entityId: string) => callService('climate', 'turn_on',  {}, target(entityId)),
	turnOff:         (entityId: string) => callService('climate', 'turn_off', {}, target(entityId))
};

// ─── Cover ───────────────────────────────────────────────────────────────────

export const coverService = {
	open:        (entityId: string) => callService('cover', 'open_cover',   {}, target(entityId)),
	close:       (entityId: string) => callService('cover', 'close_cover',  {}, target(entityId)),
	stop:        (entityId: string) => callService('cover', 'stop_cover',   {}, target(entityId)),
	toggle:      (entityId: string) => callService('cover', 'toggle',       {}, target(entityId)),
	setPosition: (entityId: string, position: number) =>
		callService('cover', 'set_cover_position', { position: Math.round(Math.max(0, Math.min(100, position))) }, target(entityId)),
	openTilt:    (entityId: string) => callService('cover', 'open_cover_tilt',  {}, target(entityId)),
	closeTilt:   (entityId: string) => callService('cover', 'close_cover_tilt', {}, target(entityId)),
	stopTilt:    (entityId: string) => callService('cover', 'stop_cover_tilt',  {}, target(entityId)),
	setTilt:     (entityId: string, position: number) =>
		callService('cover', 'set_cover_tilt_position', { tilt_position: Math.round(Math.max(0, Math.min(100, position))) }, target(entityId))
};

// ─── Fan ─────────────────────────────────────────────────────────────────────

export type FanDirection = 'forward' | 'reverse';

export const fanService = {
	toggle:         (entityId: string) => callService('fan', 'toggle',    {}, target(entityId)),
	turnOn:         (entityId: string) => callService('fan', 'turn_on',   {}, target(entityId)),
	turnOff:        (entityId: string) => callService('fan', 'turn_off',  {}, target(entityId)),
	setPercentage:  (entityId: string, percentage: number) =>
		callService('fan', 'set_percentage', { percentage: Math.round(Math.max(0, Math.min(100, percentage))) }, target(entityId)),
	setPresetMode:  (entityId: string, presetMode: string) =>
		callService('fan', 'set_preset_mode', { preset_mode: presetMode }, target(entityId)),
	setDirection:   (entityId: string, direction: FanDirection) =>
		callService('fan', 'set_direction', { direction }, target(entityId)),
	oscillate:      (entityId: string, oscillating: boolean) =>
		callService('fan', 'oscillate', { oscillating }, target(entityId))
};

// ─── Lock ─────────────────────────────────────────────────────────────────────

export const lockService = {
	lock:      (entityId: string, code?: string) =>
		callService('lock', 'lock',   code ? { code } : {}, target(entityId)),
	unlock:    (entityId: string, code?: string) =>
		callService('lock', 'unlock', code ? { code } : {}, target(entityId)),
	open:      (entityId: string, code?: string) =>
		callService('lock', 'open',   code ? { code } : {}, target(entityId))
};

// ─── Alarm control panel ──────────────────────────────────────────────────────

export type AlarmAction = 'arm_home' | 'arm_away' | 'arm_night' | 'arm_vacation' | 'arm_custom_bypass';

export const alarmService = {
	disarm:        (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_disarm',         code ? { code } : {}, target(entityId)),
	armHome:       (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_arm_home',       code ? { code } : {}, target(entityId)),
	armAway:       (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_arm_away',       code ? { code } : {}, target(entityId)),
	armNight:      (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_arm_night',      code ? { code } : {}, target(entityId)),
	armVacation:   (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_arm_vacation',   code ? { code } : {}, target(entityId)),
	armCustom:     (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_arm_custom_bypass', code ? { code } : {}, target(entityId)),
	trigger:       (entityId: string, code?: string) =>
		callService('alarm_control_panel', 'alarm_trigger',        code ? { code } : {}, target(entityId))
};

// ─── Media player ─────────────────────────────────────────────────────────────

export type MediaType    = 'music' | 'tvshow' | 'video' | 'episode' | 'channel' | 'playlist' | string;
export type RepeatMode   = 'off' | 'all' | 'one';

export const mediaService = {
	toggle:             (entityId: string) => callService('media_player', 'toggle',             {}, target(entityId)),
	turnOn:             (entityId: string) => callService('media_player', 'turn_on',            {}, target(entityId)),
	turnOff:            (entityId: string) => callService('media_player', 'turn_off',           {}, target(entityId)),
	play:               (entityId: string) => callService('media_player', 'media_play',         {}, target(entityId)),
	pause:              (entityId: string) => callService('media_player', 'media_pause',        {}, target(entityId)),
	playPause:          (entityId: string) => callService('media_player', 'media_play_pause',   {}, target(entityId)),
	stop:               (entityId: string) => callService('media_player', 'media_stop',         {}, target(entityId)),
	next:               (entityId: string) => callService('media_player', 'media_next_track',   {}, target(entityId)),
	previous:           (entityId: string) => callService('media_player', 'media_previous_track',{},target(entityId)),
	setVolume:          (entityId: string, level: number) =>
		callService('media_player', 'volume_set', { volume_level: Math.max(0, Math.min(1, level)) }, target(entityId)),
	volumeUp:           (entityId: string) => callService('media_player', 'volume_up',          {}, target(entityId)),
	volumeDown:         (entityId: string) => callService('media_player', 'volume_down',        {}, target(entityId)),
	mute:               (entityId: string, muted: boolean) =>
		callService('media_player', 'volume_mute', { is_volume_muted: muted }, target(entityId)),
	toggleMute:         (entityId: string) =>
		callService('media_player', 'volume_mute', { is_volume_muted: true }, target(entityId)), // caller should derive from state
	setSource:          (entityId: string, source: string) =>
		callService('media_player', 'select_source', { source }, target(entityId)),
	setSoundMode:       (entityId: string, soundMode: string) =>
		callService('media_player', 'select_sound_mode', { sound_mode: soundMode }, target(entityId)),
	seek:               (entityId: string, position: number) =>
		callService('media_player', 'media_seek', { seek_position: position }, target(entityId)),
	shuffle:            (entityId: string, shuffleMode: boolean) =>
		callService('media_player', 'shuffle_set', { shuffle: shuffleMode }, target(entityId)),
	repeat:             (entityId: string, repeatMode: RepeatMode) =>
		callService('media_player', 'repeat_set', { repeat: repeatMode }, target(entityId)),
	playMedia:          (entityId: string, mediaContentId: string, mediaContentType: MediaType, extra?: Record<string, unknown>) =>
		callService('media_player', 'play_media', { media_content_id: mediaContentId, media_content_type: mediaContentType, ...extra }, target(entityId)),
	joinGroup:          (entityId: string, groupMembers: string[]) =>
		callService('media_player', 'join', { group_members: groupMembers }, target(entityId)),
	unjoinGroup:        (entityId: string) => callService('media_player', 'unjoin', {}, target(entityId))
};

// ─── Vacuum ───────────────────────────────────────────────────────────────────

export const vacuumService = {
	start:        (entityId: string) => callService('vacuum', 'start',        {}, target(entityId)),
	pause:        (entityId: string) => callService('vacuum', 'pause',        {}, target(entityId)),
	stop:         (entityId: string) => callService('vacuum', 'stop',         {}, target(entityId)),
	returnToBase: (entityId: string) => callService('vacuum', 'return_to_base',{},target(entityId)),
	cleanSpot:    (entityId: string) => callService('vacuum', 'clean_spot',   {}, target(entityId)),
	locate:       (entityId: string) => callService('vacuum', 'locate',       {}, target(entityId)),
	setFanSpeed:  (entityId: string, fanSpeed: string) =>
		callService('vacuum', 'set_fan_speed', { fan_speed: fanSpeed }, target(entityId)),
	sendCommand:  (entityId: string, command: string, params?: Record<string, unknown>) =>
		callService('vacuum', 'send_command', { command, ...(params ? { params } : {}) }, target(entityId))
};

// ─── Lawn mower ───────────────────────────────────────────────────────────────

export const lawnMowerService = {
	startMowing:  (entityId: string) => callService('lawn_mower', 'start_mowing',   {}, target(entityId)),
	pause:        (entityId: string) => callService('lawn_mower', 'pause',           {}, target(entityId)),
	dock:         (entityId: string) => callService('lawn_mower', 'dock',            {}, target(entityId))
};

// ─── Humidifier ───────────────────────────────────────────────────────────────

export const humidifierService = {
	toggle:       (entityId: string) => callService('humidifier', 'toggle',    {}, target(entityId)),
	turnOn:       (entityId: string) => callService('humidifier', 'turn_on',   {}, target(entityId)),
	turnOff:      (entityId: string) => callService('humidifier', 'turn_off',  {}, target(entityId)),
	setHumidity:  (entityId: string, humidity: number) =>
		callService('humidifier', 'set_humidity', { humidity: Math.round(humidity) }, target(entityId)),
	setMode:      (entityId: string, mode: string) =>
		callService('humidifier', 'set_mode', { mode }, target(entityId))
};

// ─── Water heater ─────────────────────────────────────────────────────────────

export const waterHeaterService = {
	setTemperature:   (entityId: string, temperature: number) =>
		callService('water_heater', 'set_temperature', { temperature }, target(entityId)),
	setOperationMode: (entityId: string, operationMode: string) =>
		callService('water_heater', 'set_operation_mode', { operation_mode: operationMode }, target(entityId)),
	setAwayMode:      (entityId: string, awayMode: boolean) =>
		callService('water_heater', 'set_away_mode', { away_mode: awayMode }, target(entityId)),
	turnOn:           (entityId: string) => callService('water_heater', 'turn_on',  {}, target(entityId)),
	turnOff:          (entityId: string) => callService('water_heater', 'turn_off', {}, target(entityId))
};

// ─── Siren ────────────────────────────────────────────────────────────────────

export const sirenService = {
	toggle:  (entityId: string) => callService('siren', 'toggle',   {}, target(entityId)),
	turnOn:  (entityId: string, tone?: string, duration?: number, volume?: number) =>
		callService('siren', 'turn_on', {
			...(tone     ? { tone }             : {}),
			...(duration ? { duration }          : {}),
			...(volume   ? { volume_level: volume }: {})
		}, target(entityId)),
	turnOff: (entityId: string) => callService('siren', 'turn_off', {}, target(entityId))
};

// ─── Input boolean ────────────────────────────────────────────────────────────

export const inputBooleanService = {
	toggle:  (entityId: string) => callService('input_boolean', 'toggle',   {}, target(entityId)),
	turnOn:  (entityId: string) => callService('input_boolean', 'turn_on',  {}, target(entityId)),
	turnOff: (entityId: string) => callService('input_boolean', 'turn_off', {}, target(entityId))
};

// ─── Input number ─────────────────────────────────────────────────────────────

export const inputNumberService = {
	setValue:   (entityId: string, value: number) =>
		callService('input_number', 'set_value', { value }, target(entityId)),
	increment:  (entityId: string) => callService('input_number', 'increment', {}, target(entityId)),
	decrement:  (entityId: string) => callService('input_number', 'decrement', {}, target(entityId))
};

// ─── Number ───────────────────────────────────────────────────────────────────

export const numberService = {
	setValue: (entityId: string, value: number) =>
		callService('number', 'set_value', { value }, target(entityId))
};

// ─── Input select ─────────────────────────────────────────────────────────────

export const inputSelectService = {
	selectOption: (entityId: string, option: string) =>
		callService('input_select', 'select_option', { option }, target(entityId)),
	selectFirst:  (entityId: string) => callService('input_select', 'select_first',    {}, target(entityId)),
	selectLast:   (entityId: string) => callService('input_select', 'select_last',     {}, target(entityId)),
	selectNext:   (entityId: string, cycle?: boolean) =>
		callService('input_select', 'select_next', cycle !== undefined ? { cycle } : {}, target(entityId)),
	selectPrevious: (entityId: string, cycle?: boolean) =>
		callService('input_select', 'select_previous', cycle !== undefined ? { cycle } : {}, target(entityId))
};

// ─── Select ───────────────────────────────────────────────────────────────────

export const selectService = {
	selectOption: (entityId: string, option: string) =>
		callService('select', 'select_option', { option }, target(entityId)),
	selectFirst:  (entityId: string) => callService('select', 'select_first',    {}, target(entityId)),
	selectLast:   (entityId: string) => callService('select', 'select_last',     {}, target(entityId)),
	selectNext:   (entityId: string, cycle?: boolean) =>
		callService('select', 'select_next', cycle !== undefined ? { cycle } : {}, target(entityId)),
	selectPrevious: (entityId: string, cycle?: boolean) =>
		callService('select', 'select_previous', cycle !== undefined ? { cycle } : {}, target(entityId))
};

// ─── Input text ───────────────────────────────────────────────────────────────

export const inputTextService = {
	setValue: (entityId: string, value: string) =>
		callService('input_text', 'set_value', { value }, target(entityId))
};

// ─── Text ─────────────────────────────────────────────────────────────────────

export const textService = {
	setValue: (entityId: string, value: string) =>
		callService('text', 'set_value', { value }, target(entityId))
};

// ─── Input datetime ───────────────────────────────────────────────────────────

export const inputDatetimeService = {
	setDatetime:  (entityId: string, datetime: string) =>
		callService('input_datetime', 'set_datetime', { datetime }, target(entityId)),
	setDate:      (entityId: string, date: string) =>
		callService('input_datetime', 'set_datetime', { date }, target(entityId)),
	setTime:      (entityId: string, time: string) =>
		callService('input_datetime', 'set_datetime', { time }, target(entityId)),
	setTimestamp: (entityId: string, timestamp: number) =>
		callService('input_datetime', 'set_datetime', { timestamp }, target(entityId))
};

// ─── Input button ────────────────────────────────────────────────────────────

export const inputButtonService = {
	press: (entityId: string) => callService('input_button', 'press', {}, target(entityId))
};

// ─── Button ───────────────────────────────────────────────────────────────────

export const buttonService = {
	press: (entityId: string) => callService('button', 'press', {}, target(entityId))
};

// ─── Scene ────────────────────────────────────────────────────────────────────

export const sceneService = {
	turnOn: (entityId: string, transitionSeconds?: number) =>
		callService('scene', 'turn_on', transitionSeconds !== undefined ? { transition: transitionSeconds } : {}, target(entityId))
};

// ─── Script ───────────────────────────────────────────────────────────────────

export const scriptService = {
	turnOn:  (entityId: string, variables?: Record<string, unknown>) =>
		callService('script', 'turn_on', variables ? { variables } : {}, target(entityId)),
	turnOff: (entityId: string) => callService('script', 'turn_off', {}, target(entityId)),
	toggle:  (entityId: string) => callService('script', 'toggle',   {}, target(entityId))
};

// ─── Automation ───────────────────────────────────────────────────────────────

export const automationService = {
	trigger: (entityId: string, skipCondition?: boolean) =>
		callService('automation', 'trigger', skipCondition ? { skip_condition: true } : {}, target(entityId)),
	turnOn:  (entityId: string) => callService('automation', 'turn_on',  {}, target(entityId)),
	turnOff: (entityId: string, stopActions?: boolean) =>
		callService('automation', 'turn_off', stopActions ? { stop_actions: true } : {}, target(entityId)),
	toggle:  (entityId: string) => callService('automation', 'toggle',   {}, target(entityId))
};

// ─── Counter ─────────────────────────────────────────────────────────────────

export const counterService = {
	increment: (entityId: string) => callService('counter', 'increment', {}, target(entityId)),
	decrement: (entityId: string) => callService('counter', 'decrement', {}, target(entityId)),
	reset:     (entityId: string) => callService('counter', 'reset',     {}, target(entityId))
};

// ─── Timer ────────────────────────────────────────────────────────────────────

export const timerService = {
	start:  (entityId: string, duration?: string) =>
		callService('timer', 'start',  duration ? { duration } : {}, target(entityId)),
	pause:  (entityId: string) => callService('timer', 'pause',  {}, target(entityId)),
	cancel: (entityId: string) => callService('timer', 'cancel', {}, target(entityId)),
	finish: (entityId: string) => callService('timer', 'finish', {}, target(entityId)),
	change: (entityId: string, duration: string) =>
		callService('timer', 'change', { duration }, target(entityId))
};

// ─── Todo ────────────────────────────────────────────────────────────────────

export type TodoStatus = 'needs_action' | 'completed';

export const todoService = {
	addItem:    (entityId: string, summary: string, description?: string, dueDate?: string, dueDateTime?: string) =>
		callService('todo', 'add_item', {
			item: summary,
			...(description  ? { description }   : {}),
			...(dueDate      ? { due_date: dueDate } : {}),
			...(dueDateTime  ? { due_datetime: dueDateTime } : {})
		}, target(entityId)),
	updateItem: (entityId: string, item: string, status?: TodoStatus, rename?: string, description?: string) =>
		callService('todo', 'update_item', {
			item,
			...(status      ? { status }         : {}),
			...(rename      ? { rename }          : {}),
			...(description ? { description }     : {})
		}, target(entityId)),
	removeItem: (entityId: string, item: string) =>
		callService('todo', 'remove_item', { item }, target(entityId)),
	removeCompleted: (entityId: string) =>
		callService('todo', 'remove_completed_items', {}, target(entityId))
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateService = {
	install:    (entityId: string, version?: string, backup?: boolean) =>
		callService('update', 'install', {
			...(version !== undefined ? { version } : {}),
			...(backup  !== undefined ? { backup }  : {})
		}, target(entityId)),
	skip:       (entityId: string) => callService('update', 'skip',       {}, target(entityId)),
	clearSkipped:(entityId: string) => callService('update', 'clear_skipped', {}, target(entityId))
};

// ─── Valve ────────────────────────────────────────────────────────────────────

export const valveService = {
	open:        (entityId: string) => callService('valve', 'open_valve',        {}, target(entityId)),
	close:       (entityId: string) => callService('valve', 'close_valve',       {}, target(entityId)),
	stop:        (entityId: string) => callService('valve', 'stop_valve',        {}, target(entityId)),
	toggle:      (entityId: string) => callService('valve', 'toggle',            {}, target(entityId)),
	setPosition: (entityId: string, position: number) =>
		callService('valve', 'set_valve_position', { position: Math.round(Math.max(0, Math.min(100, position))) }, target(entityId))
};

// ─── Notify ───────────────────────────────────────────────────────────────────

export interface NotifyData {
	message: string;
	title?:  string;
	data?:   Record<string, unknown>;
}

export const notifyService = {
	notify: (service: string, data: NotifyData) =>
		callService('notify', service, data as unknown as Record<string, unknown>)
};

// ─── TTS ─────────────────────────────────────────────────────────────────────

export const ttsService = {
	speak: (entityId: string, message: string, language?: string) =>
		callService('tts', 'speak', {
			media_player_entity_id: entityId,
			message,
			...(language ? { language } : {})
		})
};

// ─── Persistent notification ──────────────────────────────────────────────────

export const persistentNotificationService = {
	create: (message: string, title?: string, notificationId?: string) =>
		callService('persistent_notification', 'create', {
			message,
			...(title          ? { title }              : {}),
			...(notificationId ? { notification_id: notificationId } : {})
		}),
	dismiss: (notificationId: string) =>
		callService('persistent_notification', 'dismiss', { notification_id: notificationId }),
	dismissAll: () =>
		callService('persistent_notification', 'dismiss_all')
};

// ─── Remote ───────────────────────────────────────────────────────────────────

export const remoteService = {
	sendCommand: (entityId: string, commands: string[], device?: string, numRepeats?: number, delaySecs?: number) =>
		callService('remote', 'send_command', {
			command: commands,
			...(device      ? { device }                : {}),
			...(numRepeats  ? { num_repeats: numRepeats } : {}),
			...(delaySecs   ? { delay_secs: delaySecs }   : {})
		}, { entity_id: entityId }),
	turnOn: (entityId: string, activity?: string) =>
		callService('remote', 'turn_on', activity ? { activity } : {}, { entity_id: entityId }),
	turnOff: (entityId: string) =>
		callService('remote', 'turn_off', {}, { entity_id: entityId }),
	togglePower: (entityId: string) =>
		callService('remote', 'toggle', {}, { entity_id: entityId })
};

// ─── Action dispatcher ────────────────────────────────────────────────────────
// Handles TileConfig action types — used by TileWrapper and action hooks.

import type { Action } from '$lib/types/dashboard';
import { uiStore } from '$lib/stores/ui';
import { goto } from '$app/navigation';

export async function handleAction(action: Action, entityId?: string): Promise<void> {
	switch (action.type) {
		case 'none':
			break;

		case 'toggle':
			if (entityId) await haService.toggle(entityId);
			break;

		case 'more-info':
			if (entityId) uiStore.openDialog(entityId, undefined);
			break;

		case 'navigate':
			await goto(action.path);
			break;

		case 'url':
			if (action.new_tab) {
				window.open(action.url, '_blank', 'noopener,noreferrer');
			} else {
				window.location.href = action.url;
			}
			break;

		case 'call-service': {
			const [domain, service] = action.service.split('.');
			if (domain && service) {
				const t = action.target ?? (entityId ? target(entityId) : undefined);
				await callService(domain, service, action.data ?? {}, t);
			}
			break;
		}
	}
}
