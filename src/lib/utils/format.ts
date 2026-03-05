// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Formatting utilities
// ─────────────────────────────────────────────────────────────────────────────

// ─── Number formatting ────────────────────────────────────────────────────────

/**
 * Format a number with given decimal places, using dot or comma separator.
 * If `precision` is omitted the function uses 0 decimals for whole numbers
 * and 1 decimal for fractional values.
 */
export function formatNumber(
	value: number,
	precision?: number,
	numberFormat?: 'dot' | 'comma'
): string {
	const effectivePrecision =
		precision !== undefined ? precision : Number.isInteger(value) ? 0 : 1;
	const formatted = value.toFixed(effectivePrecision);
	return numberFormat === 'comma' ? formatted.replace('.', ',') : formatted;
}

/**
 * Format a numeric state value with an optional unit.
 * Non-numeric strings (e.g. 'on', 'unavailable') are returned as-is.
 */
export function formatStateValue(
	value: string | number,
	precision?: number,
	unit?: string,
	numberFormat?: 'dot' | 'comma'
): string {
	const numeric = typeof value === 'number' ? value : parseFloat(value as string);
	const formatted = Number.isNaN(numeric)
		? String(value)
		: formatNumber(numeric, precision, numberFormat);
	return unit ? `${formatted}\u202f${unit}` : formatted;
}

// ─── Temperature ─────────────────────────────────────────────────────────────

export function celsiusToFahrenheit(c: number): number {
	return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
	return ((f - 32) * 5) / 9;
}

/**
 * Format a temperature value with the correct unit symbol.
 * @param value     temperature in the given unit
 * @param unit      'c' (default) or 'f'
 * @param precision decimal places (default 1)
 */
export function formatTemperature(value: number, unit: 'c' | 'f' = 'c', precision = 1): string {
	const symbol = unit === 'f' ? '°F' : '°C';
	return `${formatNumber(value, precision)}${symbol}`;
}

// ─── Duration ────────────────────────────────────────────────────────────────

/**
 * Parse a Home Assistant duration string (HH:MM:SS or H:MM:SS) to total seconds.
 * Returns 0 for unrecognised inputs.
 */
export function parseDuration(duration: string): number {
	const parts = duration.trim().split(':');
	if (parts.length === 3) {
		const [h, m, s] = parts.map((p) => parseInt(p, 10));
		if ([h, m, s].some(Number.isNaN)) return 0;
		return h * 3600 + m * 60 + s;
	}
	if (parts.length === 2) {
		const [m, s] = parts.map((p) => parseInt(p, 10));
		if ([m, s].some(Number.isNaN)) return 0;
		return m * 60 + s;
	}
	return 0;
}

/**
 * Format seconds into HH:MM:SS, or MM:SS when under one hour and
 * `alwaysShowHours` is false.
 */
export function formatDuration(seconds: number, alwaysShowHours = false): string {
	const total = Math.max(0, Math.floor(seconds));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, '0');
	const ss = String(s).padStart(2, '0');
	if (h > 0 || alwaysShowHours) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
	return `${mm}:${ss}`;
}

/**
 * Format seconds into a human-readable string: "2h 15m", "45s".
 * Seconds are omitted when hours are shown.
 */
export function formatDurationHuman(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	if (total === 0) return '0s';
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const parts: string[] = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (s > 0 && h === 0) parts.push(`${s}s`);
	return parts.join(' ');
}

// ─── Relative time ───────────────────────────────────────────────────────────

function toDate(date: Date | string | number): Date {
	return date instanceof Date ? date : new Date(date);
}

/**
 * Format a date/timestamp into relative text.
 * Thresholds: <60s="just now", <1h="X minutes ago", <24h="X hours ago",
 * <7d="X days ago", else=formatted date.
 */
export function relativeTime(date: Date | string | number): string {
	const target = toDate(date);
	const diffSec = Math.floor((Date.now() - target.getTime()) / 1000);

	if (diffSec < 0) {
		const abs = Math.abs(diffSec);
		if (abs < 60) return 'just now';
		if (abs < 3600) return `in ${Math.floor(abs / 60)}m`;
		if (abs < 86400) return `in ${Math.floor(abs / 3600)}h`;
		return formatDate(target);
	}

	if (diffSec < 60) return 'just now';
	if (diffSec < 3600) {
		const m = Math.floor(diffSec / 60);
		return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
	}
	if (diffSec < 86400) {
		const h = Math.floor(diffSec / 3600);
		return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
	}
	if (diffSec < 604800) {
		const d = Math.floor(diffSec / 86400);
		return `${d} ${d === 1 ? 'day' : 'days'} ago`;
	}
	return formatDate(target);
}

/**
 * Compact relative time: "<1m", "5m", "3h", "2d", "1w".
 */
export function relativeTimeShort(date: Date | string | number): string {
	const diffSec = Math.floor(Math.abs(Date.now() - toDate(date).getTime()) / 1000);
	if (diffSec < 60) return '<1m';
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
	if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`;
	return `${Math.floor(diffSec / 604800)}w`;
}

// ─── Clock / Date ────────────────────────────────────────────────────────────

export function formatTime(
	date: Date,
	format: '12h' | '24h',
	showSeconds = false,
	timezone?: string
): string {
	const opts: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit',
		hour12: format === '12h',
		...(showSeconds ? { second: '2-digit' } : {}),
		...(timezone ? { timeZone: timezone } : {})
	};
	return new Intl.DateTimeFormat(undefined, opts).format(date);
}

export function formatDate(date: Date, locale?: string, timezone?: string): string {
	const opts: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		...(timezone ? { timeZone: timezone } : {})
	};
	return new Intl.DateTimeFormat(locale ?? undefined, opts).format(date);
}

export function formatDatetime(
	date: Date,
	timeFormat: '12h' | '24h',
	locale?: string,
	timezone?: string
): string {
	const opts: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: timeFormat === '12h',
		...(timezone ? { timeZone: timezone } : {})
	};
	return new Intl.DateTimeFormat(locale ?? undefined, opts).format(date);
}

// ─── State labels ─────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
	home: 'Home',
	away: 'Away',
	locked: 'Locked',
	unlocked: 'Unlocked',
	open: 'Open',
	closed: 'Closed',
	opening: 'Opening',
	closing: 'Closing',
	unavailable: 'Unavailable',
	unknown: 'Unknown',
	idle: 'Idle',
	standby: 'Standby',
	playing: 'Playing',
	paused: 'Paused',
	buffering: 'Buffering',
	active: 'Active',
	inactive: 'Inactive',
	disarmed: 'Disarmed',
	armed_home: 'Armed Home',
	armed_away: 'Armed Away',
	armed_night: 'Armed Night',
	armed_vacation: 'Armed Vacation',
	armed_custom_bypass: 'Armed Custom',
	pending: 'Pending',
	triggered: 'Triggered',
	mowing: 'Mowing',
	docked: 'Docked',
	cleaning: 'Cleaning',
	returning: 'Returning',
	charging: 'Charging',
	error: 'Error',
	heat: 'Heat',
	cool: 'Cool',
	heat_cool: 'Heat/Cool',
	auto: 'Auto',
	dry: 'Dry',
	fan_only: 'Fan Only',
	heating: 'Heating',
	cooling: 'Cooling',
	preheating: 'Preheating',
	drying: 'Drying',
	fan: 'Fan'
};

/**
 * Map a HA state string to a human-readable label.
 * 'on'/'off' use caller-supplied labels or 'On'/'Off'.
 * Everything else is looked up in STATE_LABELS, then title-cased as fallback.
 */
export function stateLabel(state: string, onLabel?: string, offLabel?: string): string {
	const lower = state.toLowerCase();
	if (lower === 'on') return onLabel ?? 'On';
	if (lower === 'off') return offLabel ?? 'Off';
	if (STATE_LABELS[lower]) return STATE_LABELS[lower];
	// Title-case fallback: replace underscores and capitalise
	return lower.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Unit conversion ─────────────────────────────────────────────────────────

export const kmhToMph    = (kmh: number)    => kmh * 0.621371;
export const mphToKmh    = (mph: number)    => mph * 1.60934;
export const msToKmh     = (ms: number)     => ms  * 3.6;
export const mmToInches  = (mm: number)     => mm  / 25.4;
export const inchesToMm  = (inches: number) => inches * 25.4;

// ─── Clamp / percent ─────────────────────────────────────────────────────────

export const clamp = (value: number, min: number, max: number): number =>
	Math.min(max, Math.max(min, value));

export const toPercent = (value: number, min: number, max: number): number =>
	max === min ? 0 : clamp(((value - min) / (max - min)) * 100, 0, 100);

export const brightnessToPercent = (brightness: number): number =>
	Math.round(clamp((brightness / 255) * 100, 0, 100));

export const percentToBrightness = (percent: number): number =>
	Math.round(clamp((percent / 100) * 255, 0, 255));

// ─── Color utilities ──────────────────────────────────────────────────────────

/** Convert HS (hue 0-360, sat 0-100) to CSS hsl() string */
export function hsToHsl(hue: number, sat: number, lightness = 50): string {
	return `hsl(${Math.round(hue)}, ${Math.round(sat)}%, ${lightness}%)`;
}

/** Convert RGB [0-255] to hex string '#rrggbb' */
export function rgbToHex(r: number, g: number, b: number): string {
	return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

/** Convert hex string to RGB tuple */
export function hexToRgb(hex: string): [number, number, number] | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
		: null;
}

/** Convert color temp mireds to Kelvin */
export function miredsToKelvin(mireds: number): number {
	return Math.round(1_000_000 / mireds);
}

/** Convert Kelvin to mireds */
export function kelvinToMireds(kelvin: number): number {
	return Math.round(1_000_000 / kelvin);
}

/**
 * Approximate RGB color for a color temperature in Kelvin.
 * Useful for tinting light tile icons.
 * Range: 1000K (warm orange) → 10000K (cool blue-white)
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
	const temp = clamp(kelvin, 1000, 10000) / 100;
	let r: number, g: number, b: number;

	// Red channel
	if (temp <= 66) {
		r = 255;
	} else {
		r = clamp(329.698727446 * Math.pow(temp - 60, -0.1332047592), 0, 255);
	}

	// Green channel
	if (temp <= 66) {
		g = clamp(99.4708025861 * Math.log(temp) - 161.1195681661, 0, 255);
	} else {
		g = clamp(288.1221695283 * Math.pow(temp - 60, -0.0755148492), 0, 255);
	}

	// Blue channel
	if (temp >= 66) {
		b = 255;
	} else if (temp <= 19) {
		b = 0;
	} else {
		b = clamp(138.5177312231 * Math.log(temp - 10) - 305.0447927307, 0, 255);
	}

	return [Math.round(r), Math.round(g), Math.round(b)];
}

// ─── SVG / graph helpers ─────────────────────────────────────────────────────

/**
 * Build an SVG polyline `points` string from a series of [x, y] pairs.
 * x/y are already in SVG coordinate space.
 */
export function toSvgPoints(points: [number, number][]): string {
	return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/**
 * Build a smooth SVG cubic bezier path from a series of [x, y] data points
 * mapped to the given SVG viewport dimensions.
 *
 * @param data    raw [x, y] points already in SVG space
 * @param smooth  tension 0 (linear) → 1 (max smooth), default 0.2
 */
export function toSvgPath(data: [number, number][], smooth = 0.2): string {
	if (data.length < 2) return '';
	if (data.length === 2) return `M ${data[0][0]},${data[0][1]} L ${data[1][0]},${data[1][1]}`;

	let path = `M ${data[0][0]},${data[0][1]}`;

	for (let i = 1; i < data.length; i++) {
		const prev = data[i - 1];
		const curr = data[i];
		const next = data[i + 1] ?? curr;
		const prevPrev = data[i - 2] ?? prev;

		const cpx1 = prev[0] + (curr[0] - prevPrev[0]) * smooth;
		const cpy1 = prev[1] + (curr[1] - prevPrev[1]) * smooth;
		const cpx2 = curr[0] - (next[0] - prev[0]) * smooth;
		const cpy2 = curr[1] - (next[1] - prev[1]) * smooth;

		path += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${curr[0]},${curr[1]}`;
	}

	return path;
}

/**
 * Normalise a series of numeric values to a [0, 1] range for SVG rendering.
 * Returns the same length array with values mapped to the range.
 */
export function normaliseData(values: number[]): number[] {
	if (values.length === 0) return [];
	const min = Math.min(...values);
	const max = Math.max(...values);
	if (max === min) return values.map(() => 0.5);
	return values.map((v) => (v - min) / (max - min));
}
