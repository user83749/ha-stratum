// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Tile entity data helper
//
// deriveTileEntity() is a plain function (not using runes) that tiles call
// inside $derived.by(() => deriveTileEntity(tile, $optimisticEntities)).
// It merges tile config overrides with live entity state to produce everything
// a tile needs in one object — no prop-drilling, no repeated attribute lookups.
// ─────────────────────────────────────────────────────────────────────────────

import type { HassEntity } from 'home-assistant-js-websocket';
import type { Tile } from '$lib/types/dashboard';
import {
	getDomain,
	getEntityIcon,
	getEntityName,
	getStateColor,
	isActive,
	isUnavailable,
	formatState
} from './entities';
import { stateLabel } from '$lib/utils/format';

// ─── Return type ─────────────────────────────────────────────────────────────

export interface TileEntityData {
	entity: HassEntity | null;
	entityId: string | undefined;
	domain: string | null;
	name: string;
	icon: string;
	/** Raw HA state string e.g. 'on', 'heating', 'playing' */
	state: string;
	/** Formatted for display e.g. '21.5 °C', 'Playing', '72%' */
	stateDisplay: string;
	/** Resolved CSS color value or token */
	color: string;
	/** CSS custom property form e.g. 'var(--color-on)' */
	colorVar: string;
	isActive: boolean;
	isUnavailable: boolean;
	/** Smart secondary line: brightness %, media artist, cover position, etc. */
	secondaryText: string;
	lastChanged: string | undefined;
	lastUpdated: string | undefined;
}

// ─── Color token → CSS var map ────────────────────────────────────────────────

const COLOR_TOKEN_MAP: Record<string, string> = {
	'#10b981': 'var(--color-on)',
	'#ef4444': 'var(--color-danger)',
	'#f59e0b': 'var(--color-warning)',
	'#3b82f6': 'var(--color-info)',
	'#3f3f46': 'var(--color-off)'
};

function resolveColorVar(color: string): string {
	if (color.startsWith('var(')) return color;
	return COLOR_TOKEN_MAP[color] ?? color;
}

// ─── Auto secondary text by domain ───────────────────────────────────────────

function autoSecondaryText(entity: HassEntity, domain: string, active: boolean): string {
	switch (domain) {
		case 'light': {
			if (!active) return '';
			const bri = entity.attributes.brightness as number | undefined;
			return bri !== undefined ? `${Math.round((bri / 255) * 100)}%` : '';
		}

		case 'media_player': {
			const artist = entity.attributes.media_artist as string | undefined;
			const title = entity.attributes.media_title as string | undefined;
			if (artist && title) return `${artist} — ${title}`;
			if (title) return title;
			return '';
		}

		case 'climate': {
			const low = entity.attributes.target_temp_low as number | undefined;
			const high = entity.attributes.target_temp_high as number | undefined;
			if (low !== undefined && high !== undefined) return `${low}°–${high}°`;
			const target = entity.attributes.temperature as number | undefined;
			if (target !== undefined) return `${target}°`;
			const curr = entity.attributes.current_temperature as number | undefined;
			return curr !== undefined ? `${curr}°` : '';
		}

		case 'cover': {
			const pos = entity.attributes.current_position as number | undefined;
			return pos !== undefined ? `${pos}%` : '';
		}

		case 'fan': {
			if (!active) return '';
			const pct = entity.attributes.percentage as number | undefined;
			return pct !== undefined ? `${pct}%` : '';
		}

		case 'vacuum': {
			const battery = entity.attributes.battery_level as number | undefined;
			return battery !== undefined ? `${battery}%` : '';
		}

		case 'update': {
			const latest = entity.attributes.latest_version as string | undefined;
			const current = entity.attributes.installed_version as string | undefined;
			if (latest && current && latest !== current) return `${current} → ${latest}`;
			if (current) return current;
			return '';
		}

		case 'humidifier': {
			const target = entity.attributes.humidity as number | undefined;
			if (target !== undefined) return `${target}%`;
			const hum = entity.attributes.current_humidity as number | undefined;
			return hum !== undefined ? `${hum}%` : '';
		}

		case 'water_heater': {
			const temp = entity.attributes.temperature as number | undefined;
			return temp !== undefined ? `${temp}°` : '';
		}

		case 'alarm_control_panel': {
			const changed = entity.last_changed;
			return changed ? new Date(changed).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
		}

		case 'timer': {
			const remaining = entity.attributes.remaining as string | undefined;
			return remaining ?? '';
		}

		case 'person': {
			return entity.state || '';
		}

		case 'weather': {
			const temp = entity.attributes.temperature as number | undefined;
			const unit = entity.attributes.temperature_unit as string | undefined;
			if (temp !== undefined) return `${temp}${unit ?? '°'}`;
			return '';
		}

		case 'lawn_mower': {
			const battery = entity.attributes.battery_level as number | undefined;
			if (battery !== undefined) return `${battery}%`;
			return '';
		}

		case 'siren': {
			if (!active) return '';
			return (entity.attributes.available_tones as string[] | undefined)?.[0] ?? '';
		}

		default: {
			// Battery sensor
			if ((entity.attributes.device_class as string | undefined) === 'battery') {
				return `${entity.state}%`;
			}
			return '';
		}
	}
}

// ─── Main derivation function ─────────────────────────────────────────────────

/**
 * Compute a rich TileEntityData object from tile config + current entity map.
 *
 * Usage in Svelte 5:
 *   const data = $derived.by(() => deriveTileEntity(tile, $optimisticEntities));
 */
export function deriveTileEntity(
	tile: Tile,
	entities: Record<string, HassEntity>
): TileEntityData {
	const entityId = tile.entity_id;
	const entity = entityId ? (entities[entityId] ?? null) : null;
	const domain = entity ? getDomain(entity.entity_id) : null;

	// ── Name ─────────────────────────────────────────────────────────────────
	const name = tile.config.name
		?? (entity ? getEntityName(entity) : (entityId ?? 'Unknown'));

	// ── Icon ─────────────────────────────────────────────────────────────────
	const icon = tile.config.icon
		?? (entity ? getEntityIcon(entity) : 'help-circle');

	// ── State ─────────────────────────────────────────────────────────────────
	const rawState = entity?.state ?? 'unknown';
	const stateDisp = entity ? formatState(entity) : stateLabel(rawState);

	// ── Color ─────────────────────────────────────────────────────────────────
	const color = entity ? getStateColor(entity) : 'var(--fg-subtle)';
	const colorVar = resolveColorVar(color);

	// ── Flags ─────────────────────────────────────────────────────────────────
	const active = entity ? isActive(entity) : false;
	const unavail = entity ? isUnavailable(entity) : false;

	// ── Secondary text ────────────────────────────────────────────────────────
	let secondaryText = '';

	if (tile.config.secondary_entity_id) {
		const sec = entities[tile.config.secondary_entity_id];
		if (sec) {
			if (tile.config.secondary_attribute) {
				const val = sec.attributes[tile.config.secondary_attribute];
				secondaryText = `${tile.config.secondary_label ?? ''} ${String(val ?? '')}`.trim();
			} else {
				secondaryText = `${tile.config.secondary_label ?? ''} ${formatState(sec)}`.trim();
			}
		}
	} else if (entity && domain) {
		secondaryText = autoSecondaryText(entity, domain, active);
	}

	return {
		entity,
		entityId,
		domain,
		name,
		icon,
		state: rawState,
		stateDisplay: stateDisp,
		color,
		colorVar,
		isActive: active,
		isUnavailable: unavail,
		secondaryText,
		lastChanged: entity?.last_changed,
		lastUpdated: entity?.last_updated
	};
}
