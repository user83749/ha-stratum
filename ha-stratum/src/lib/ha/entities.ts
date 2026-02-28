/**
 * Stratum — Entity helpers
 *
 * Covers the Home Assistant domains and device classes this app currently maps.
 * No dependencies outside of home-assistant-js-websocket types.
 */

import type { HassEntity } from 'home-assistant-js-websocket';

// ─── Domain ──────────────────────────────────────────────────────────────────

export function getDomain(entityId: string): string {
	return entityId.split('.')[0];
}

export function inDomain(entityId: string, ...domains: string[]): boolean {
	return domains.includes(getDomain(entityId));
}

// ─── Name ────────────────────────────────────────────────────────────────────

export function getEntityName(entity: HassEntity): string {
	return (
		(entity.attributes.friendly_name as string | undefined) ??
		entity.entity_id.split('.')[1].replace(/_/g, ' ')
	);
}

// ─── Active state ─────────────────────────────────────────────────────────────

export function isActive(entity: HassEntity): boolean {
	const domain = getDomain(entity.entity_id);
	const state  = entity.state;

	switch (domain) {
		// Binary: on = active
		case 'light':
		case 'switch':
		case 'input_boolean':
		case 'fan':
		case 'humidifier':
		case 'siren':
		case 'group':
		case 'water_heater':
			return state === 'on';

		// Cover: open = active
		case 'cover':
		case 'valve':
			return state === 'open' || state === 'opening';

		// Lock: locked = active (secured)
		case 'lock':
			return state === 'locked';

		// Alarm
		case 'alarm_control_panel':
			return state !== 'disarmed';

		// Media
		case 'media_player':
			return state === 'playing' || state === 'buffering';

		// Climate: anything but off
		case 'climate':
			return state !== 'off';

		// Vacuum / lawn_mower: cleaning = active
		case 'vacuum':
		case 'lawn_mower':
			return state === 'cleaning' || state === 'mowing';

		// Presence
		case 'person':
		case 'device_tracker':
			return state === 'home';

		// Running automations/scripts
		case 'automation':
			return state === 'on';

		case 'script':
			return state === 'on';

		case 'binary_sensor':
			return state === 'on';

		case 'timer':
			return state === 'active';

		case 'update':
			return state === 'on'; // update available

		case 'sun':
			return state === 'above_horizon';

		default:
			return state === 'on';
	}
}

export function isUnavailable(entity: HassEntity): boolean {
	return entity.state === 'unavailable' || entity.state === 'unknown';
}

// ─── State colour ─────────────────────────────────────────────────────────────

export function getStateColor(entity: HassEntity): string {
	// Semantic state color is for icon/chip/text accents inside tile components.
	// It is not the source of the shared active tile background treatment.
	const domain     = getDomain(entity.entity_id);
	const state      = entity.state;
	const dc         = entity.attributes.device_class as string | undefined;

	if (state === 'unavailable' || state === 'unknown') return 'var(--fg-subtle)';

	switch (domain) {
		case 'alarm_control_panel':
			if (state === 'triggered') return 'var(--color-danger)';
			if (state === 'arming' || state === 'pending') return 'var(--color-warning)';
			if (state !== 'disarmed') return 'var(--color-warning)';
			return 'var(--color-on)';

		case 'binary_sensor': {
			if (state !== 'on') return 'var(--color-off)';
			// Problem / safety sensors → danger
			if (['smoke', 'gas', 'carbon_monoxide', 'fire', 'safety', 'problem', 'tamper'].includes(dc ?? ''))
				return 'var(--color-danger)';
			// Security → warning
			if (['door', 'window', 'garage_door', 'opening', 'moisture', 'leak'].includes(dc ?? ''))
				return 'var(--color-warning)';
			// Motion / presence → accent
			if (['motion', 'occupancy', 'presence', 'running', 'moving'].includes(dc ?? ''))
				return 'var(--accent)';
			return 'var(--color-on)';
		}

		case 'cover':
		case 'valve':
			return (state === 'open' || state === 'opening') ? 'var(--accent)' : 'var(--color-off)';

		case 'lock':
			if (state === 'locked')    return 'var(--color-on)';
			if (state === 'unlocked')  return 'var(--color-warning)';
			if (state === 'jammed')    return 'var(--color-danger)';
			return 'var(--fg-subtle)';

		case 'climate': {
			const hvacAction = entity.attributes.hvac_action as string | undefined;
			if (hvacAction === 'heating') return '#f97316';   // orange
			if (hvacAction === 'cooling') return '#38bdf8';   // sky blue
			if (hvacAction === 'drying')  return '#a3e635';   // green
			if (hvacAction === 'fan')     return 'var(--accent)';
			return state === 'off' ? 'var(--color-off)' : 'var(--color-warning)';
		}

		case 'media_player':
			return state === 'playing' ? 'var(--accent)' : 'var(--color-off)';

		case 'vacuum':
		case 'lawn_mower':
			if (state === 'cleaning' || state === 'mowing') return 'var(--accent)';
			if (state === 'error') return 'var(--color-danger)';
			return 'var(--color-off)';

		case 'person':
		case 'device_tracker':
			return state === 'home' ? 'var(--color-on)' : 'var(--fg-subtle)';

		case 'sensor': {
			// Battery low warning
			if (dc === 'battery') {
				const lvl = parseFloat(state);
				if (!isNaN(lvl)) {
					if (lvl <= 10) return 'var(--color-danger)';
					if (lvl <= 25) return 'var(--color-warning)';
					return 'var(--color-on)';
				}
			}
			// Problem sensor
			if (dc === 'problem') return state !== '0' ? 'var(--color-danger)' : 'var(--color-off)';
			return 'var(--fg-muted)';
		}

		case 'update':
			return state === 'on' ? 'var(--color-warning)' : 'var(--color-off)';

		case 'timer':
			return state === 'active' ? 'var(--accent)' : 'var(--color-off)';

		case 'sun':
			return state === 'above_horizon' ? '#f59e0b' : '#475569';

		default:
			return isActive(entity) ? 'var(--color-on)' : 'var(--color-off)';
	}
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

export function getEntityIcon(entity: HassEntity): string {
	const domain = getDomain(entity.entity_id);
	const state  = entity.state;
	const dc     = entity.attributes.device_class as string | undefined;
	const active = isActive(entity);

	// HA-supplied mdi: icon → strip prefix, convert underscores to dashes
	const haIcon = entity.attributes.icon as string | undefined;
	if (haIcon) {
		return haIcon.replace(/^mdi:/, '').replace(/_/g, '-');
	}

	switch (domain) {
		// ── Actuators ──────────────────────────────────────────────────────
		case 'light':
			return active ? 'lightbulb' : 'lightbulb-off';

		case 'switch':
			switch (dc) {
				case 'outlet': return active ? 'plug-zap' : 'plug';
				default:       return active ? 'toggle-right' : 'toggle-left';
			}

		case 'input_boolean':
			return active ? 'toggle-right' : 'toggle-left';

		case 'fan':
			return 'fan';

		case 'humidifier':
			return active ? 'droplets' : 'droplet';

		case 'water_heater':
			return 'flame-kindling';

		case 'siren':
			return active ? 'siren' : 'bell-off';

		// ── Cover / Valve ──────────────────────────────────────────────────
		case 'cover':
			switch (dc) {
				case 'awning':   return 'tent';
				case 'blind':    return 'blinds';
				case 'curtain':  return active ? 'panel-left-open' : 'panel-left';
				case 'damper':   return 'wind';
				case 'door':     return active ? 'door-open' : 'door-closed';
				case 'garage':   return active ? 'door-open' : 'door-closed';
				case 'gate':     return active ? 'arrow-up-square' : 'square';
				case 'shade':    return active ? 'sun' : 'moon';
				case 'shutter':  return active ? 'arrow-up' : 'arrow-down';
				case 'window':   return active ? 'aperture' : 'circle';
				default:         return active ? 'chevrons-up' : 'chevrons-down';
			}

		case 'valve':
			return active ? 'droplets' : 'droplet';

		case 'lock': {
			if (state === 'locked')   return 'lock';
			if (state === 'unlocked') return 'lock-open';
			if (state === 'jammed')   return 'lock-open';
			return 'lock';
		}

		// ── Climate ────────────────────────────────────────────────────────
		case 'climate': {
			const hvacAction = entity.attributes.hvac_action as string | undefined;
			if (hvacAction === 'heating') return 'flame';
			if (hvacAction === 'cooling') return 'snowflake';
			if (hvacAction === 'drying')  return 'droplets';
			if (hvacAction === 'fan')     return 'fan';
			return 'thermometer';
		}

		// ── Media & Display ────────────────────────────────────────────────
		case 'media_player': {
			const mediaType = entity.attributes.media_content_type as string | undefined;
			if (mediaType === 'music')  return 'music';
			if (mediaType === 'tvshow' || mediaType === 'movie') return 'tv';
			if (state === 'playing')    return 'circle-play';
			return 'tv';
		}

		case 'camera':
			return 'camera';

		// ── Security ──────────────────────────────────────────────────────
		case 'alarm_control_panel':
			if (state === 'triggered') return 'siren';
			if (state !== 'disarmed')  return 'shield-check';
			return 'shield';

		// ── Mobility ──────────────────────────────────────────────────────
		case 'vacuum':
			if (state === 'cleaning') return 'bot';
			if (state === 'docked')   return 'plug';
			if (state === 'error')    return 'alert-circle';
			return 'bot';

		case 'lawn_mower':
			if (state === 'mowing')    return 'scissors';
			if (state === 'docked')    return 'plug';
			if (state === 'error')     return 'alert-circle';
			return 'scissors';

		case 'person':
			return state === 'home' ? 'house' : 'user-round';

		case 'device_tracker':
			return state === 'home' ? 'house' : 'map-pin';

		// ── Input Controls ─────────────────────────────────────────────────
		case 'button':
		case 'input_button':
			return 'mouse-pointer-click';

		case 'scene':
			return 'sparkles';

		case 'script':
			return 'code';

		case 'automation':
			return active ? 'zap' : 'zap-off';

		case 'input_number':
		case 'number':
			return 'sliders-horizontal';

		case 'input_select':
		case 'select':
			return 'list';

		case 'input_text':
		case 'text':
			return 'type';

		case 'input_datetime':
			return 'calendar-clock';

		case 'counter':
			return 'hash';

		case 'remote':
			return 'tv';

		// ── Time ──────────────────────────────────────────────────────────
		case 'timer':
			if (state === 'active')  return 'timer';
			if (state === 'paused')  return 'timer';
			return 'timer-off';

		case 'calendar':
			return 'calendar';

		// ── Sensor ────────────────────────────────────────────────────────
		case 'sensor':
			switch (dc) {
				case 'apparent_power':    return 'zap';
				case 'aqi':               return 'wind';
				case 'atmospheric_pressure': return 'gauge';
				case 'battery':
					return parseBatteryIcon(parseFloat(state));
				case 'carbon_dioxide':    return 'cloud';
				case 'carbon_monoxide':   return 'cloud';
				case 'current':           return 'zap';
				case 'data_rate':         return 'activity';
				case 'data_size':         return 'hard-drive';
				case 'date':              return 'calendar';
				case 'distance':          return 'ruler';
				case 'duration':          return 'clock';
				case 'energy':
				case 'energy_storage':    return 'bolt';
				case 'frequency':         return 'activity';
				case 'gas':               return 'flame';
				case 'humidity':          return 'droplets';
				case 'illuminance':       return 'sun';
				case 'irradiance':        return 'sun';
				case 'moisture':          return 'droplets';
				case 'monetary':          return 'circle-dollar-sign';
				case 'nitrogen_dioxide':
				case 'nitrogen_monoxide':
				case 'nitrous_oxide':     return 'wind';
				case 'ozone':             return 'wind';
				case 'ph':                return 'flask-conical';
				case 'pm1':
				case 'pm10':
				case 'pm25':              return 'cloud';
				case 'power':             return 'zap';
				case 'power_factor':      return 'zap';
				case 'precipitation':
				case 'precipitation_intensity': return 'cloud-rain';
				case 'pressure':          return 'gauge';
				case 'reactive_power':    return 'zap';
				case 'signal_strength':   return 'wifi';
				case 'sound_pressure':    return 'volume-2';
				case 'speed':             return 'gauge';
				case 'sulphur_dioxide':   return 'wind';
				case 'temperature':       return 'thermometer';
				case 'timestamp':         return 'clock';
				case 'volatile_organic_compounds':
				case 'volatile_organic_compounds_parts': return 'wind';
				case 'voltage':           return 'zap';
				case 'volume':
				case 'volume_storage':    return 'droplets';
				case 'volume_flow_rate':  return 'waves';
				case 'water':             return 'droplet';
				case 'weight':            return 'weight';
				case 'wind_speed':        return 'wind';
				default:                  return 'activity';
			}

		// ── Binary Sensor ─────────────────────────────────────────────────
		case 'binary_sensor':
			switch (dc) {
				case 'battery':          return state === 'on' ? 'battery-low' : 'battery-full';
				case 'battery_charging': return 'battery-charging';
				case 'carbon_monoxide':  return 'cloud';
				case 'cold':             return 'snowflake';
				case 'connectivity':     return state === 'on' ? 'wifi' : 'wifi-off';
				case 'door':             return state === 'on' ? 'door-open' : 'door-closed';
				case 'garage_door':      return state === 'on' ? 'door-open' : 'door-closed';
				case 'gas':              return 'flame';
				case 'heat':             return 'thermometer-sun';
				case 'light':            return state === 'on' ? 'sun' : 'moon';
				case 'lock':             return state === 'on' ? 'lock-open' : 'lock';
				case 'moisture':
				case 'leak':             return state === 'on' ? 'droplets' : 'droplet';
				case 'motion':           return 'activity';
				case 'moving':           return 'move';
				case 'occupancy':        return state === 'on' ? 'person-standing' : 'circle-dashed';
				case 'opening':          return state === 'on' ? 'minimize-2' : 'maximize-2';
				case 'plug':             return state === 'on' ? 'plug-zap' : 'plug';
				case 'power':            return state === 'on' ? 'zap' : 'zap-off';
				case 'presence':         return state === 'on' ? 'radar' : 'circle-dashed';
				case 'problem':          return state === 'on' ? 'triangle-alert' : 'circle-check';
				case 'running':          return state === 'on' ? 'circle-play' : 'circle-pause';
				case 'safety':           return state === 'on' ? 'shield-alert' : 'shield-check';
				case 'smoke':            return state === 'on' ? 'flame' : 'flame-kindling';
				case 'sound':            return state === 'on' ? 'volume-2' : 'volume-x';
				case 'tamper':           return state === 'on' ? 'octagon-alert' : 'shield';
				case 'update':           return state === 'on' ? 'circle-arrow-up' : 'circle-check';
				case 'vibration':        return 'waves';
				case 'window':           return state === 'on' ? 'aperture' : 'circle';
				default:                 return state === 'on' ? 'circle-dot' : 'circle';
			}

		// ── Data & Monitoring ──────────────────────────────────────────────
		case 'weather':
			return getWeatherIcon(entity.state, entity.attributes.is_night as boolean | undefined);

		case 'sun':
			return active ? 'sun' : 'moon';

		case 'todo':
			return 'list-checks';

		case 'update':
			return state === 'on' ? 'circle-arrow-up' : 'circle-check';

		case 'plant':
			return 'flower-2';

		case 'event':
			return 'calendar-days';

		// ── Groups ────────────────────────────────────────────────────────
		case 'group':
			return 'layers';

		// ── Zone ──────────────────────────────────────────────────────────
		case 'zone':
			return 'map-pin';

		default:
			return 'circle-dot';
	}
}

function parseBatteryIcon(level: number): string {
	if (isNaN(level)) return 'battery';
	if (level <= 10)  return 'battery-low';
	if (level <= 40)  return 'battery-medium';
	if (level <= 80)  return 'battery';
	return 'battery-full';
}

function getWeatherIcon(condition: string, isNight?: boolean): string {
	const night = isNight === true;
	switch (condition) {
		case 'sunny':
		case 'clear-night':
			return night ? 'moon' : 'sun';
		case 'partlycloudy':
			return night ? 'cloud-moon' : 'cloud-sun';
		case 'cloudy':
			return 'cloud';
		case 'fog':
			return 'cloud-fog';
		case 'hail':
			return 'cloud-hail';
		case 'lightning':
			return 'cloud-lightning';
		case 'lightning-rainy':
			return 'cloud-lightning';
		case 'pouring':
			return 'cloud-drizzle';
		case 'rainy':
			return 'cloud-rain';
		case 'snowy':
			return 'cloud-snow';
		case 'snowy-rainy':
			return 'cloud-snow';
		case 'windy':
		case 'windy-variant':
			return 'wind';
		case 'exceptional':
			return 'triangle-alert';
		default:
			return 'cloud-sun';
	}
}

// ─── State formatting ─────────────────────────────────────────────────────────

export function formatState(
	entity: HassEntity,
	precision?: number
): string {
	const { state, attributes } = entity;
	const domain = getDomain(entity.entity_id);

	if (state === 'unavailable') return 'Unavailable';
	if (state === 'unknown')     return 'Unknown';

	// Numeric with unit
	const unit = attributes.unit_of_measurement as string | undefined;
	if (unit) {
		const numericValue = parseFloat(state);
		if (!isNaN(numericValue)) {
			const p = precision ?? inferPrecision(numericValue, unit);
			return `${numericValue.toFixed(p)} ${unit}`;
		}
	}

	// Domain-specific
	switch (domain) {
		case 'climate':         return formatClimateState(state);
		case 'cover':
		case 'valve':           return formatCoverState(state, entity);
		case 'lock':            return formatLockState(state);
		case 'alarm_control_panel': return formatAlarmState(state);
		case 'media_player':    return formatMediaState(state);
		case 'vacuum':          return formatVacuumState(state);
		case 'lawn_mower':      return formatLawnMowerState(state);
		case 'person':
		case 'device_tracker':  return state === 'home' ? 'Home' : 'Away';
		case 'timer':           return formatTimerState(state, entity);
		case 'binary_sensor':   return formatBinarySensorState(state, entity);
		case 'sun':             return state === 'above_horizon' ? 'Above horizon' : 'Below horizon';
		case 'update':          return state === 'on' ? 'Update available' : 'Up to date';
		case 'automation':      return state === 'on' ? 'On' : 'Off';
		case 'script':          return state === 'on' ? 'Running' : 'Off';
		case 'scene':           return 'Activate';
		case 'button':
		case 'input_button':    return 'Press';
		case 'group':           return capitalize(state);
		case 'weather':         return formatWeatherState(state);
		default:                return capitalize(state);
	}
}

function inferPrecision(value: number, unit: string): number {
	if (unit === '°C' || unit === '°F' || unit === 'K') return 1;
	if (unit === '%') return 0;
	if (unit === 'ppm' || unit === 'ppb' || unit === 'μg/m³') return 0;
	if (unit === 'W' || unit === 'kW' || unit === 'VA') return 1;
	if (unit === 'kWh' || unit === 'Wh') return 2;
	if (unit === 'V' || unit === 'A') return 2;
	if (Math.abs(value) >= 100) return 0;
	if (Math.abs(value) >= 10)  return 1;
	return 2;
}

function formatClimateState(state: string): string {
	const map: Record<string, string> = {
		heat: 'Heating', cool: 'Cooling', heat_cool: 'Heat / Cool',
		auto: 'Auto', dry: 'Dry', fan_only: 'Fan', off: 'Off'
	};
	return map[state] ?? capitalize(state);
}

function formatCoverState(state: string, entity: HassEntity): string {
	const pos = entity.attributes.current_position as number | undefined;
	const map: Record<string, string> = {
		open: 'Open', closed: 'Closed', opening: 'Opening', closing: 'Closing'
	};
	const base = map[state] ?? capitalize(state);
	if ((state === 'open' || state === 'closed') && pos !== undefined) {
		return `${base} (${pos}%)`;
	}
	return base;
}

function formatLockState(state: string): string {
	const map: Record<string, string> = {
		locked: 'Locked', unlocked: 'Unlocked', locking: 'Locking',
		unlocking: 'Unlocking', jammed: 'Jammed'
	};
	return map[state] ?? capitalize(state);
}

function formatAlarmState(state: string): string {
	const map: Record<string, string> = {
		disarmed: 'Disarmed', armed_home: 'Armed Home', armed_away: 'Armed Away',
		armed_night: 'Armed Night', armed_vacation: 'Armed Vacation',
		armed_custom_bypass: 'Armed Custom', pending: 'Pending',
		arming: 'Arming', triggered: 'Triggered'
	};
	return map[state] ?? capitalize(state);
}

function formatMediaState(state: string): string {
	const map: Record<string, string> = {
		playing: 'Playing', paused: 'Paused', idle: 'Idle',
		standby: 'Standby', 'off': 'Off', buffering: 'Buffering',
		on: 'On'
	};
	return map[state] ?? capitalize(state);
}

function formatVacuumState(state: string): string {
	const map: Record<string, string> = {
		cleaning: 'Cleaning', docked: 'Docked', idle: 'Idle',
		paused: 'Paused', returning: 'Returning', error: 'Error'
	};
	return map[state] ?? capitalize(state);
}

function formatLawnMowerState(state: string): string {
	const map: Record<string, string> = {
		mowing: 'Mowing', docked: 'Docked', paused: 'Paused',
		returning: 'Returning', error: 'Error', idle: 'Idle'
	};
	return map[state] ?? capitalize(state);
}

function formatTimerState(state: string, entity: HassEntity): string {
	if (state === 'active') {
		const remaining = entity.attributes.remaining as string | undefined;
		return remaining ? `${remaining}` : 'Running';
	}
	if (state === 'paused') return 'Paused';
	return 'Idle';
}

function formatBinarySensorState(state: string, entity: HassEntity): string {
	const dc = entity.attributes.device_class as string | undefined;
	if (!dc) return state === 'on' ? 'On' : 'Off';

	const onMap: Record<string, string> = {
		door: 'Open', window: 'Open', garage_door: 'Open', opening: 'Open',
		lock: 'Unlocked', plug: 'Plugged in', battery: 'Low', battery_charging: 'Charging',
		cold: 'Cold', heat: 'Hot', gas: 'Detected', carbon_monoxide: 'Detected',
		moisture: 'Wet', leak: 'Leaking', motion: 'Detected', occupancy: 'Occupied',
		presence: 'Detected', problem: 'Problem', safety: 'Unsafe', smoke: 'Detected',
		sound: 'Detected', tamper: 'Tampered', vibration: 'Detected', moving: 'Moving',
		running: 'Running', connectivity: 'Connected', light: 'Light', power: 'On',
		update: 'Update available'
	};
	const offMap: Record<string, string> = {
		door: 'Closed', window: 'Closed', garage_door: 'Closed', opening: 'Closed',
		lock: 'Locked', plug: 'Unplugged', battery: 'OK', battery_charging: 'Not charging',
		cold: 'Normal', heat: 'Normal', gas: 'Clear', carbon_monoxide: 'Clear',
		moisture: 'Dry', leak: 'Dry', motion: 'Clear', occupancy: 'Clear',
		presence: 'Clear', problem: 'OK', safety: 'Safe', smoke: 'Clear',
		sound: 'Clear', tamper: 'OK', vibration: 'Still', moving: 'Still',
		running: 'Not running', connectivity: 'Disconnected', light: 'No light', power: 'Off',
		update: 'Up to date'
	};
	return state === 'on'
		? (onMap[dc] ?? 'On')
		: (offMap[dc] ?? 'Off');
}

function formatWeatherState(condition: string): string {
	const map: Record<string, string> = {
		'clear-night': 'Clear', sunny: 'Sunny', partlycloudy: 'Partly cloudy',
		cloudy: 'Cloudy', fog: 'Foggy', hail: 'Hail', lightning: 'Lightning',
		'lightning-rainy': 'Thunderstorm', pouring: 'Pouring', rainy: 'Rainy',
		snowy: 'Snowy', 'snowy-rainy': 'Sleet', windy: 'Windy',
		'windy-variant': 'Windy', exceptional: 'Exceptional'
	};
	return map[condition] ?? capitalize(condition);
}

export function capitalize(s: string): string {
	if (!s) return s;
	return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Attribute helpers ────────────────────────────────────────────────────────

export function getBrightness(entity: HassEntity): number | null {
	const b = entity.attributes.brightness as number | undefined;
	return b !== undefined ? Math.round((b / 255) * 100) : null;
}

export function getColorTemp(entity: HassEntity): number | null {
	return (
		(entity.attributes.color_temp_kelvin as number | undefined) ??
		(entity.attributes.color_temp as number | undefined) ??
		null
	);
}

export function getTemperature(entity: HassEntity): number | null {
	return (entity.attributes.temperature as number | undefined) ?? null;
}

export function getCurrentTemperature(entity: HassEntity): number | null {
	return (entity.attributes.current_temperature as number | undefined) ?? null;
}

export function getFanMode(entity: HassEntity): string | null {
	return (entity.attributes.fan_mode as string | undefined) ?? null;
}

export function getHvacMode(entity: HassEntity): string | null {
	return entity.state;
}

export function getHvacModes(entity: HassEntity): string[] {
	return (entity.attributes.hvac_modes as string[] | undefined) ?? [];
}

export function getPresetModes(entity: HassEntity): string[] {
	return (entity.attributes.preset_modes as string[] | undefined) ?? [];
}

export function getPresetMode(entity: HassEntity): string | null {
	return (entity.attributes.preset_mode as string | undefined) ?? null;
}

export function getVolumeLevel(entity: HassEntity): number | null {
	const v = entity.attributes.volume_level as number | undefined;
	return v !== undefined ? Math.round(v * 100) : null;
}

export function getMediaTitle(entity: HassEntity): string | null {
	return (entity.attributes.media_title as string | undefined) ?? null;
}

export function getMediaArtist(entity: HassEntity): string | null {
	return (entity.attributes.media_artist as string | undefined) ??
		(entity.attributes.app_name as string | undefined) ?? null;
}

export function getEntityPicture(entity: HassEntity): string | null {
	return (entity.attributes.entity_picture as string | undefined) ?? null;
}

export function getCoverPosition(entity: HassEntity): number | null {
	return (entity.attributes.current_position as number | undefined) ?? null;
}

export function getFanSpeed(entity: HassEntity): number | null {
	const pct = entity.attributes.percentage as number | undefined;
	return pct ?? null;
}

export function getSupportedFeatures(entity: HassEntity): number {
	return (entity.attributes.supported_features as number | undefined) ?? 0;
}

export function supportsFeature(entity: HassEntity, featureBit: number): boolean {
	return (getSupportedFeatures(entity) & featureBit) !== 0;
}

// ─── HA feature flag constants ────────────────────────────────────────────────

export const LIGHT_FEATURES = {
	BRIGHTNESS:   1,
	COLOR_TEMP:   2,
	EFFECT:       4,
	FLASH:        8,
	COLOR:        16,
	TRANSITION:   32,
} as const;

export const COVER_FEATURES = {
	OPEN:         1,
	CLOSE:        2,
	SET_POSITION: 4,
	STOP:         8,
	OPEN_TILT:    16,
	CLOSE_TILT:   32,
	STOP_TILT:    64,
	SET_TILT:     128,
} as const;

export const MEDIA_FEATURES = {
	PAUSE:           1,
	SEEK:            2,
	VOLUME_SET:      4,
	VOLUME_MUTE:     8,
	PREVIOUS_TRACK:  16,
	NEXT_TRACK:      32,
	TURN_ON:         128,
	TURN_OFF:        256,
	PLAY_MEDIA:      512,
	VOLUME_BUTTONS:  1024,
	SELECT_SOURCE:   2048,
	STOP:            4096,
	CLEAR_PLAYLIST:  8192,
	PLAY:            16384,
	SHUFFLE_SET:     32768,
	SELECT_SOUND_MODE: 65536,
	REPEAT_SET:      262144,
} as const;

export const FAN_FEATURES = {
	SET_SPEED:        1,
	OSCILLATE:        2,
	DIRECTION:        4,
	PRESET_MODE:      8,
} as const;
