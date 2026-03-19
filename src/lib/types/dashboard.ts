// ── Dashboard Schema ────────────────────────────────────────────────────────

import { generateId } from '$lib/utils/uuid';
// ─── Actions ─────────────────────────────────────────────────────────────────

export interface ToggleAction { type: 'toggle' }
export interface MoreInfoAction { type: 'more-info' }
export interface NoneAction { type: 'none' }
export interface NavigateAction { type: 'navigate'; path: string }
export interface UrlAction { type: 'url'; url: string; new_tab?: boolean }
export interface CallServiceAction {
	type: 'call-service';
	service: string;
	data?: Record<string, unknown>;
	target?: { entity_id?: string; area_id?: string; device_id?: string };
}

export type Action =
	| ToggleAction
	| MoreInfoAction
	| NoneAction
	| NavigateAction
	| UrlAction
	| CallServiceAction;

// ─── Conditions ──────────────────────────────────────────────────────────────

export interface Condition {
	entity_id: string;
	attribute?: string;
	state?: string;
	above?: number;
	below?: number;
	not?: boolean;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export type BadgePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Badge {
	entity_id: string;
	attribute?: string;
	icon?: string;
	color?: string;
	position: BadgePosition;
	show_state: boolean;
}

// ─── Grid ────────────────────────────────────────────────────────────────────

export interface TileSize {
	w: number;  // column span (≥1)
	h: number;  // row span (≥1)
}

export type TileSizePreset = 'sm' | 'md' | 'lg' | 'xl';

export interface TileLayout {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface SectionGrid {
	baseSize: number;  // internal density hint used to derive adaptive columns
	gap: number;       // gap in px (default 8)
	columns?: number;  // max columns on larger screens; mobile always uses up to 4
}

// ─── Tile Types ──────────────────────────────────────────────────────────────
//
// Purpose-built tiles give a domain-specific UI beyond what the generic
// 'entity' tile renders. 'entity' is the universal fallback for any domain.
//
// Domain → recommended tile type:
//   alarm_control_panel → alarm_panel
//   automation           → button (or entity)
//   binary_sensor        → entity
//   button               → button
//   calendar             → calendar
//   camera               → camera
//   climate              → climate
//   counter              → entity (counter_show_controls config)
//   cover                → cover
//   device_tracker       → person
//   event                → entity (show_attributes)
//   fan                  → fan
//   humidifier           → humidifier
//   image                → image
//   input_boolean        → entity (confirm_action config)
//   input_button         → button
//   input_datetime       → entity (show_date_picker / show_time_picker config)
//   input_number         → slider
//   input_select         → input_select
//   input_text           → entity (text_editable config)
//   lawn_mower           → lawn_mower
//   light                → light
//   lock                 → lock
//   media_player         → media_player
//   number               → slider
//   person               → person
//   remote               → remote
//   scene                → button
//   script               → button (script_confirm / script_variables config)
//   select               → input_select
//   sensor               → entity | gauge | history | statistic
//   siren                → siren
//   sun                  → entity (show_attributes for sunrise/sunset)
//   switch               → entity (confirm_action config)
//   text                 → entity (text_editable config)
//   timer                → timer
//   todo                 → todo
//   update               → update
//   vacuum               → vacuum
//   valve                → cover (same UI: position + open/close)
//   water_heater         → water_heater
//   weather              → weather

export type TileType =
	| 'entity'        // universal — adapts to any HA domain
	// ── Actuators ──────────────────────────────────────────────────────────────
	| 'light'         // on/off + brightness slider + color wheel
	| 'climate'       // thermostat: temp setpoint, HVAC mode, fan mode
	| 'cover'         // blinds/shades: open/close + position + tilt
	| 'lock'          // lock/unlock with current status
	| 'fan'           // on/off + speed slider + oscillate + direction
	| 'humidifier'    // on/off + target humidity slider + mode
	| 'water_heater'  // temperature setpoint + operation mode
	| 'siren'         // on/off + tone selector + duration input
	// ── Media & Display ────────────────────────────────────────────────────────
	| 'media_player'  // artwork + play/pause/skip + volume + source
	| 'camera'        // live stream or snapshot (HLS / WebRTC / MJPEG)
	// ── Security ───────────────────────────────────────────────────────────────
	| 'alarm_panel'   // arm/disarm with code keypad
	// ── Mobility ───────────────────────────────────────────────────────────────
	| 'vacuum'        // start/pause/dock + battery + room map
	| 'lawn_mower'    // mow/pause/dock + status + map
	| 'person'        // person or device_tracker: avatar + location + home/away
	// ── Input Controls ─────────────────────────────────────────────────────────
	| 'button'        // one-tap action: scene / script / automation / input_button
	| 'slider'        // prominent slider for input_number / number entities
	| 'input_select'  // option picker for input_select / select: dropdown or buttons
	| 'remote'        // custom command button grid for remote entities
	// ── Time ───────────────────────────────────────────────────────────────────
	| 'timer'         // countdown display + start/pause/cancel controls
	| 'calendar'      // HA calendar entity: month / week / day / list view
	// ── Data & Sensors ─────────────────────────────────────────────────────────
	| 'weather'       // conditions + multi-day or hourly forecast
	| 'history'       // sparkline or area chart for any numeric entity
	| 'gauge'         // radial gauge with configurable severity segments
	| 'statistic'     // HA long-term statistics: mean, min, max, sum over period
	| 'logbook'       // scrollable event log for one or more entities
	| 'energy'        // power / energy monitoring: grid, solar, battery
	| 'todo'          // HA to-do list entity
	| 'update'        // entity update: current/available version + install button
	// ── Map ────────────────────────────────────────────────────────────────────
	| 'map'           // interactive map with device_tracker / person pins + zones
	// ── Static Content ─────────────────────────────────────────────────────────
	| 'markdown'      // rendered markdown / Jinja2 template text
	| 'iframe'        // embedded webpage
	| 'image'         // static URL or HA image entity (auto-refreshing)
	| 'divider'       // visual separator with optional label
	| 'media_hero'    // premium full-bleed media player with artwork and marquee
	| 'conditional';  // meta-tile that renders different tiles based on logic

// ─── Breakpoint visibility ───────────────────────────────────────────────────

export interface BreakpointVisibility {
	sm: boolean;   // < 640px
	md: boolean;   // 640–1024px
	lg: boolean;   // > 1024px
}

export const VISIBLE_ALL: BreakpointVisibility = { sm: true, md: true, lg: true };
export const VISIBLE_DESKTOP_ONLY: BreakpointVisibility = { sm: false, md: false, lg: true };
export const VISIBLE_TABLET_UP: BreakpointVisibility = { sm: false, md: true, lg: true };
export const VISIBLE_MOBILE_ONLY: BreakpointVisibility = { sm: true, md: false, lg: false };

// ─── Visual style ────────────────────────────────────────────────────────────
// System-wide card style applied to all tiles via ThemeConfig.
// Each style dramatically changes how every card on the dashboard looks.

export type VisualStyle = 'liquid' | 'sculpted' | 'vivid';

// ─── Tile config ─────────────────────────────────────────────────────────────
// Typed fields cover every HA entity domain. All fields are optional;
// undefined falls back to TileDefaults or sensible built-in defaults.
// The [key: string]: unknown index keeps forward compat for new HA domains.

export interface ConditionalBranch {
	conditions: Condition[];
	type: TileType;
	entity_id?: string;
	config: TileConfig;
}

export interface CameraFeedConfig {
	id: string;
	type: 'entity' | 'url';
	entity_id?: string;
	url?: string;
	label?: string;
	popup_trigger_entity?: string;
	popup_trigger_state?: string;
}

export interface TileConfig {
	// ── Universal display overrides ───────────────────────────────────────────
	name?: string;                // override entity friendly_name
	icon?: string;                // override entity icon (mdi:icon-name)
	chip_notify_entity_id?: string; // Horizontal Chip row badge source entity (optional)
	chip_notify_attribute?: string; // Horizontal Chip row badge source attribute (optional)
	unit?: string;                // override unit_of_measurement
	show_name?: boolean;
	show_state?: boolean;
	show_icon?: boolean;
	show_last_changed?: boolean;
	show_last_updated?: boolean;  // timestamp of last WebSocket update
	show_unavailable?: boolean;   // show a placeholder when entity is unavailable
	show_attributes?: string[];   // extra attribute keys to display below state
	attribute_precision?: Record<string, number>;  // per-attribute decimal places

	// ── Universal secondary entity ────────────────────────────────────────────
	// Show a second entity's state or attribute inline on the tile
	secondary_entity_id?: string;
	secondary_attribute?: string;  // attribute key; undefined = state
	secondary_label?: string;      // label before the secondary value

	// ── Universal interactions ────────────────────────────────────────────────
	tap_action?: Action;
	hold_action?: Action;
	double_tap_action?: Action;
	confirm_action?: boolean;      // show a confirm dialog before any action fires

	// ── Universal state labels (binary_sensor, switch, input_boolean, etc.) ──
	state_on_label?: string;       // shown when state is 'on', 'home', 'locked', etc.
	state_off_label?: string;      // shown when state is 'off', 'away', 'unlocked', etc.

	// ── Sensor / numeric ─────────────────────────────────────────────────────
	precision?: number;            // decimal places (0–4)
	show_trend?: boolean;          // trending arrow (up/down/flat)
	show_graph?: boolean;          // inline sparkline graph on the tile face
	graph_type?: 'line' | 'bar';
	graph_hours?: number;          // history window for inline sparkline

	// ── History tile ─────────────────────────────────────────────────────────
	hours?: number;                // history window in hours
	history_fill?: boolean;        // fill area under line
	history_smooth?: boolean;      // smooth bezier curve
	history_show_legend?: boolean; // legend when graphing multiple entities
	history_entity_ids?: string[]; // additional entities to overlay on chart

	// ── Gauge tile ───────────────────────────────────────────────────────────
	min?: number;
	max?: number;
	gauge_needle?: boolean;        // needle style vs filled arc
	// Custom color segments (replaces simple severity map)
	gauge_segments?: { from: number; color: string; label?: string }[];
	// Legacy simple severity (still supported)
	severity?: { green: number; yellow: number; red: number };

	// ── Statistic tile ───────────────────────────────────────────────────────
	statistic_period?: 'hour' | 'day' | 'week' | 'month' | 'year';
	statistic_type?: 'mean' | 'min' | 'max' | 'sum' | 'state' | 'change';
	statistic_show_chart?: boolean;
	statistic_entity_ids?: string[];  // multiple entities for comparison chart

	// ── Logbook tile ─────────────────────────────────────────────────────────
	logbook_entity_ids?: string[];    // entities to include in log (empty = tile entity)
	logbook_count?: number;           // max events to display
	logbook_show_icon?: boolean;

	// ── Light ────────────────────────────────────────────────────────────────
	color_mode?: 'color_temp' | 'rgb' | 'rgbw' | 'hs';

	// ── Humidifier ───────────────────────────────────────────────────────────
	show_humidity_slider?: boolean;   // target humidity slider
	show_humidifier_mode?: boolean;

	// ── Water heater ─────────────────────────────────────────────────────────
	show_water_heater_temp?: boolean;
	show_water_heater_mode?: boolean;

	// ── Siren ────────────────────────────────────────────────────────────────
	show_siren_tone?: boolean;          // tone selector dropdown
	show_siren_duration_input?: boolean;

	// ── Alarm panel ──────────────────────────────────────────────────────────
	alarm_code_format?: 'number' | 'text';
	show_keypad?: boolean;

	// ── Lock ─────────────────────────────────────────────────────────────────
	lock_confirm?: boolean;           // extra confirmation before lock/unlock

	// ── Media player ─────────────────────────────────────────────────────────
	show_artwork?: boolean;
	show_progress?: boolean;
	artwork_size?: 'sm' | 'md' | 'lg' | 'fill';
	media_controls?: ('play' | 'next' | 'previous' | 'shuffle' | 'repeat')[];
	switcher_entity_id?: string;     // select.conditional_media for switching
	sensor_entity?: string;          // aggregator sensor.active_media_players
	player_map?: any[];              // dynamic player mappings
	tv_remote_entities?: Record<string, string>; // per-button entity overrides for TV more-info remote controls

	// ── Camera ───────────────────────────────────────────────────────────────
	stream_type?: 'auto' | 'hls' | 'webrtc' | 'mjpeg';
	ptz?: boolean;                    // show PTZ controls if camera supports it
	camera_feeds?: CameraFeedConfig[]; // ordered feed list shown in more-info popup
	camera_primary_feed?: string; // feed id to select first
	popup_trigger_enabled?: boolean; // master enable for auto-popup triggers
	popup_trigger_entity?: string;
	popup_trigger_state?: string;
	popup_auto_close_time?: number;

	// ── Vacuum ───────────────────────────────────────────────────────────────
	show_vacuum_map?: boolean;
	show_vacuum_fan_speed?: boolean;
	show_room_cleaning?: boolean;     // room-selection buttons (where supported)

	// ── Lawn mower ───────────────────────────────────────────────────────────
	show_mower_map?: boolean;
	show_mower_status?: boolean;
	show_mower_battery?: boolean;

	// ── Person / device_tracker ──────────────────────────────────────────────
	show_person_picture?: boolean;    // profile picture / entity picture
	show_location_text?: boolean;     // zone name or GPS address
	show_home_away_badge?: boolean;   // colored home/away status indicator
	show_person_map?: boolean;        // embedded mini map

	// ── Slider tile (input_number / number) ──────────────────────────────────
	slider_min?: number;
	slider_max?: number;
	slider_step?: number;
	slider_mode?: 'slider' | 'input' | 'buttons';  // 'buttons' = +/- stepper

	// ── Input select / Select ────────────────────────────────────────────────
	select_mode?: 'dropdown' | 'buttons' | 'list'; // how to render the options

	// ── Input text / Text ────────────────────────────────────────────────────
	text_editable?: boolean;           // show an edit button / inline text input

	// ── Input datetime / date / time ─────────────────────────────────────────
	show_date_part?: boolean;
	show_time_part?: boolean;

	// ── Counter ──────────────────────────────────────────────────────────────
	counter_show_controls?: boolean;   // +1 / -1 / reset buttons

	// ── Timer ────────────────────────────────────────────────────────────────
	timer_show_progress_ring?: boolean;
	timer_show_controls?: boolean;     // start / pause / cancel
	timer_show_duration?: boolean;     // show total duration alongside countdown

	// ── Update entity ────────────────────────────────────────────────────────
	update_show_version?: boolean;     // current + available version strings
	update_show_install_button?: boolean;
	update_show_release_notes?: boolean;
	update_confirm_install?: boolean;  // confirm dialog before installing

	// ── Automation ───────────────────────────────────────────────────────────
	automation_show_last_triggered?: boolean;
	automation_show_toggle?: boolean;  // enable/disable toggle inline on tile

	// ── Script ───────────────────────────────────────────────────────────────
	script_confirm?: boolean;
	script_variables?: Record<string, unknown>;  // pre-filled script variables

	// ── Scene ────────────────────────────────────────────────────────────────
	scene_icon_pulse?: boolean;        // brief pulse animation on scene activate

	// ── Button tile (one-tap action) ─────────────────────────────────────────
	button_action?: Action;            // explicit action (overrides tap_action)
	button_style?: 'icon' | 'label' | 'icon-label';

	// ── Remote ───────────────────────────────────────────────────────────────
	remote_commands?: { label: string; command: string; icon?: string }[];
	remote_device_id?: string;         // pre-selected device on the remote entity

	// ── Map tile ─────────────────────────────────────────────────────────────
	map_entity_ids?: string[];         // person / device_tracker entities to pin
	map_default_zoom?: number;
	map_show_names?: boolean;
	map_show_zones?: boolean;          // overlay zone boundaries
	map_dark_mode?: 'auto' | 'dark' | 'light'; // auto follows theme scheme

	// ── Energy tile ──────────────────────────────────────────────────────────
	energy_show_chart?: boolean;
	energy_chart_period?: 'hour' | 'day' | 'month';

	// ── Weather tile ─────────────────────────────────────────────────────────
	weather_show_visibility?: boolean;
	weather_forecast_type?: 'daily' | 'hourly' | 'twice_daily';

	// ── Todo tile ────────────────────────────────────────────────────────────
	todo_show_completed?: boolean;
	todo_show_add_button?: boolean;
	todo_max_items?: number;

	// ── Calendar tile ────────────────────────────────────────────────────────
	calendar_entity_ids?: string[];    // additional calendar entities to merge
	calendar_initial_view?: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';
	calendar_show_all_day?: boolean;

	// ── Markdown tile ────────────────────────────────────────────────────────
	content?: string;                  // markdown template string

	// ── Iframe tile ──────────────────────────────────────────────────────────
	url?: string;
	allow_scripts?: boolean;           // iframe sandbox policy
	iframe_refresh_interval?: number;  // seconds; 0 = no auto-refresh (e.g. for embedded weather widgets)

	// ── Image tile ───────────────────────────────────────────────────────────
	image_url?: string;                // static image URL (or use entity_id for image entities)
	image_refresh_interval?: number;   // seconds; 0 = no auto-refresh
	image_fit?: 'cover' | 'contain' | 'fill';

	// ── Divider tile ─────────────────────────────────────────────────────────
	orientation?: 'horizontal' | 'vertical';
	label?: string;

	// ── Conditional tile ─────────────────────────────────────────────────────
	conditional_branches?: ConditionalBranch[];

	// ── Forward compat ────────────────────────────────────────────────────────
	[key: string]: unknown;
}

export interface Tile {
	id: string;
	type: TileType;
	entity_id?: string;

	size: TileSize;          // legacy span fallback during migration
	sizePreset?: TileSizePreset;
	layout?: TileLayout;
	visibility: BreakpointVisibility;

	conditions?: Condition[];
	badges?: Badge[];

	config: TileConfig;
}

// ─── Section ─────────────────────────────────────────────────────────────────

export type SectionRole = 'main';
export type SectionLayoutMode = 'grid' | 'horizontal_chip_row';
export type SectionPinMode = 'none' | 'top' | 'bottom';

export interface Section {
	id: string;
	title?: string;
	titleSize?: number;      // px; default 19
	icon?: string;
	role: SectionRole;
	layoutMode: SectionLayoutMode;
	pinMode: SectionPinMode;
	grid: SectionGrid;
	padding?: number;           // px; overrides theme --tile-padding for this section
	collapsible: boolean;
	collapsed: boolean;
	visibility: BreakpointVisibility;
	tiles: Tile[];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export type PageLayout =
	| 'default'   // standard scrolling
	| 'full';     // full-bleed, no padding

export type BackgroundType = 'none' | 'color' | 'solid' | 'gradient' | 'image' | 'video';

export interface PageBackground {
	type: BackgroundType;
	value?: string;
	opacity?: number;
	blur?: number;
	parallax?: boolean;
}

export type PageTransitionType = 'slide' | 'fade' | 'scale' | 'none';

export interface Page {
	id: string;
	name: string;
	icon: string;
	color?: string;
	layout: PageLayout;
	background: PageBackground;
	sections: Section[];
	navVisibility: BreakpointVisibility;
	adminOnly: boolean;

	// Optional area association for area-based filtering in search/badges.
	areaId?: string;

	// Per-page transition override; undefined = use global DisplayConfig.pageTransition
	transition?: PageTransitionType;
}

// ─── Theme ───────────────────────────────────────────────────────────────────

export type ColorScheme = 'dark' | 'light' | 'system';
export type RadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type FontSize = 'sm' | 'md' | 'lg';

export interface FontConfig {
	family: string;
	size: FontSize;
}

export interface ThemeConfig {
	/** ID of the active SystemTheme (e.g. 'midnight', 'deep-ocean', 'aurora') */
	themeId: string;
	/** User overrides — applied on top of the theme's own defaults */
	radius?: RadiusScale;
	tileRadius?: RadiusScale;
	popupRadius?: RadiusScale;
	font?: Partial<FontConfig>;
	dense?: boolean;
	animations?: boolean;
	/* Legacy fields — kept only for migration, not used in rendering */
	scheme?: ColorScheme;
	accent?: string;
	surface?: string;
	blur?: boolean;
	visualStyle?: VisualStyle;
	themeBackground?: string;
	customVars?: Record<string, string>;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type NavPosition = 'left' | 'top' | 'bottom';

export type NavIconSize = 'sm' | 'md' | 'lg';

// Custom items that can be interspersed with pages in the nav
export type NavExtraItem =
	| {
		type: 'url';
		id: string;
		label: string;
		icon: string;
		url: string;
		newTab: boolean;
		visibility: BreakpointVisibility;
	}
	| { type: 'divider'; id: string }
	| { type: 'label'; id: string; text: string };

// Ordered list of page IDs + extra item IDs for nav rendering
export interface NavOrderEntry {
	type: 'page' | 'extra';
	id: string;
}

// Badge shown on a nav item driven by an entity's state
export interface NavBadge {
	pageId: string;
	entity_id: string;
	attribute?: string;
	color?: string;
}

export interface NavHeroEntity {
	id: string;
	entityId: string;
	label?: string;
	showOnDesktop: boolean;
	showOnMobile: boolean;
}

export interface NavConfig {
	position: NavPosition;

	iconSize: NavIconSize;

	showLabels: boolean;
	showLabelsOnMobile: boolean;
	showMobileClock: boolean; // show the clock block above sections in mobile view
	showMobileDate: boolean; // show the date line in the mobile header clock block
	showMobileWeather: boolean; // show weather text in the mobile header clock block
	showMobileAlertsButton: boolean; // show alerts button in mobile bottom bar / dock

	showHeader: boolean;
	headerTitle?: string;
	headerIcon?: string;

	showConnectionStatus: boolean;

	mobileBreakpoint: number;
	mobileStyle: 'bottom-bar' | 'drawer' | 'hidden';

	heroEntities: NavHeroEntity[];

	// Custom ordering: pages + extras interleaved.
	// If empty, pages are shown in their array order, extras appended.
	order: NavOrderEntry[];
	extras: NavExtraItem[];
	badges: NavBadge[];
}

// ─── Header ──────────────────────────────────────────────────────────────────

export interface HeaderQuickAction {
	id: string;
	icon: string;
	label: string;
	action: Action;
	visibility: BreakpointVisibility;
}

export interface HeaderConfig {
	visible: boolean;
	height: number;            // px; default 56
	showPageTitle: boolean;
	showSearch: boolean;
	showEditButton: boolean;
	showSettingsButton: boolean;
	showNotifications: boolean;
	quickActions: HeaderQuickAction[];
}

// ─── App Settings ────────────────────────────────────────────────────────────

export interface AppSettings {
	locale: string;              // BCP 47 e.g. 'en', 'de', 'fr', 'ar'
	timeFormat: '12h' | '24h';
	unitSystem: 'metric' | 'imperial' | 'auto'; // auto = read from system config
}

// ─── Tile Defaults ───────────────────────────────────────────────────────────
// Applied to every tile unless overridden in TileConfig.
// Eliminates repetitive per-tile config.

export interface TileDefaults {
	tap_action: Action;
	hold_action: Action;
	double_tap_action: Action;
	show_name: boolean;
	show_icon: boolean;
	show_state: boolean;
	show_last_changed: boolean;
	historyHours: number;            // default history window
	cameraRefreshInterval: number;   // seconds; 0 = stream only
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchConfig {
	enabled: boolean;
	hotkey: string;              // key for Cmd/Ctrl + key (e.g. 'k')
	includeEntities: boolean;
	includePages: boolean;
	includeScripts: boolean;
	includeScenes: boolean;
	includeAutomations: boolean;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface WeatherConfig {
	entityId?: string;
	temperatureUnit: 'auto' | 'c' | 'f';
	windSpeedUnit: 'auto' | 'kmh' | 'mph' | 'ms' | 'beaufort';
	precipitationUnit: 'auto' | 'mm' | 'in';
	showForecast: boolean;
	forecastDays: number;        // 1–7
}

// ─── Screensaver ─────────────────────────────────────────────────────────────

export type ScreensaverType = 'clock' | 'dim' | 'black' | 'image';

export interface ScreensaverConfig {
	enabled: boolean;
	idleTimeout: number;         // seconds; 0 = never
	type: ScreensaverType;
	dimOpacity: number;          // 0–1 for 'dim' type
	imageUrl?: string;           // for 'image' type
	showClock: boolean;          // overlay clock on dim/image
	clockFormat: '12h' | '24h';
}

// ─── Kiosk ───────────────────────────────────────────────────────────────────

export interface KioskConfig {
	enabled: boolean;
	hideNav: boolean;
	hideHeader: boolean;
	hideFab: boolean;            // hide floating edit/settings button
	exitPin?: string;            // PIN to exit kiosk mode
	allowSwipeNav: boolean;      // allow swipe gestures to change pages
}

// ─── Page Transition ─────────────────────────────────────────────────────────

export interface PageTransition {
	type: PageTransitionType;
	duration: number;            // ms; 0 = instant
}

// ─── Theme Schedule ──────────────────────────────────────────────────────────

export type ThemeScheduleMode = 'time' | 'sun';

export interface ThemeSchedule {
	enabled: boolean;
	mode: ThemeScheduleMode;

	// IDs from THEME_PRESETS
	dayPresetId: string;    // preset applied during day
	nightPresetId: string;  // preset applied during night

	// time mode — explicit HH:mm strings (24h)
	dayStart?: string;      // e.g. "07:00" — when day theme activates
	nightStart?: string;    // e.g. "20:00" — when night theme activates

	// sun mode — driven by a sun entity
	sunEntityId: string;    // default: 'sun.sun'
	dayOffset: number;      // minutes relative to sunrise (+after, -before)
	nightOffset: number;    // minutes relative to sunset  (+after, -before)
}

// ─── Time-Based Pages ────────────────────────────────────────────────────────

export interface TimeBasedPage {
	pageId: string;
	from: string;                // "HH:mm" 24h
	to: string;                  // "HH:mm" 24h
	days?: number[];             // 0–6, 0=Sun; undefined = every day
}

// ─── Display ─────────────────────────────────────────────────────────────────

export interface DisplayConfig {
	defaultPageId?: string;      // landing page; undefined = first page
	swipeNavigation: boolean;    // horizontal swipe to change pages
	swipeThreshold: number;      // px to trigger swipe
	pageTransition: PageTransition;
	timeBasedPages: TimeBasedPage[];
	themeSchedule: ThemeSchedule;
	kiosk: KioskConfig;
	screensaver: ScreensaverConfig;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export type NotificationAlertDomain = 'alert' | 'update' | 'binary_sensor' | 'alarm_control_panel';

export interface NotificationAlertStateMap {
	alert: string[];
	update: string[];
	binary_sensor: string[];
	alarm_control_panel: string[];
}

export interface NotificationConfig {
	enabled: boolean;
	showPersistent: boolean;     // persistent_notification.*
	showAlerts: boolean;         // real alerts feed
	includeAlertDomainEntities: boolean; // include alert.* entities
	includeUpdateDomainEntities: boolean; // include update.* entities
	includeBinarySensorDomainEntities: boolean; // include binary_sensor.* entities
	includeAlarmControlPanelDomainEntities: boolean; // include alarm_control_panel.* entities
	alertEntityIds: string[];    // explicit entity IDs to monitor as alerts
	alertStateMap: NotificationAlertStateMap; // active-state mapping per domain
	sound: boolean;
	position: NotificationPosition;
	duration: number;            // ms; 0 = stay until dismissed
}

// ─── Custom Resources ────────────────────────────────────────────────────────

export interface CustomResources {
	css?: string;                // raw CSS injected after theme vars
}

// ─── Edit Config ─────────────────────────────────────────────────────────────
// Persistent preferences for edit mode behavior.

export interface EditConfig {
	confirmDelete: boolean;      // show confirm dialog before deleting tiles/sections
	autoSave: boolean;           // persist changes immediately vs manual save button
}

// ─── Media Config ────────────────────────────────────────────────────────────
// Global media player defaults.

export interface MediaConfig {
	defaultEntityId?: string;    // fallback media_player entity for tiles without one
}

// ─── Energy Config ───────────────────────────────────────────────────────────
// References to energy entities used by energy tiles and the energy tile type.

export interface EnergyConfig {
	enabled: boolean;
	gridConsumptionEntityId?: string;  // e.g. sensor.grid_consumption_kwh
	solarProductionEntityId?: string;  // e.g. sensor.solar_production_kwh
	batteryEntityId?: string;          // e.g. sensor.battery_state_of_charge
	gridReturnEntityId?: string;       // e.g. sensor.grid_return_kwh
	costPerKwh?: number;               // used to calculate cost display
}

// ─── Dialog Config ───────────────────────────────────────────────────────────
// Controls how the more-info dialog/panel renders.

export type MoreInfoStyle = 'modal' | 'drawer' | 'panel';
export type DrawerSide = 'left' | 'right' | 'bottom';

export interface DialogConfig {
	moreInfoStyle: MoreInfoStyle;   // modal = centered overlay, drawer = side panel, panel = docked
	drawerSide: DrawerSide;         // only relevant when moreInfoStyle === 'drawer'
	showRelatedEntities: boolean;   // show other entities in same area/device in more-info
}

// ─── Favorites Config ────────────────────────────────────────────────────────
// Quickly-accessible pinned entities.

export interface FavoritesConfig {
	entityIds: string[];         // entity IDs pinned for quick access
	showInHeader: boolean;       // render a favorites row below the header bar
	showInNav: boolean;          // show a favorites section pinned at bottom of nav
}

// ─── User Profiles ───────────────────────────────────────────────────────────

export interface UserProfile {
	id: string;
	name: string;
	avatar?: string;             // URL or mdi:icon-name
	defaultPageId?: string;
	pinnedPageIds?: string[];
}

// ─── Root Config ─────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = 5;

export interface DashboardConfig {
	version: number;
	settings: AppSettings;
	theme: ThemeConfig;
	nav: NavConfig;
	header: HeaderConfig;
	display: DisplayConfig;
	tileDefaults: TileDefaults;
	edit: EditConfig;
	media: MediaConfig;
	energy: EnergyConfig;
	dialog: DialogConfig;
	favorites: FavoritesConfig;
	weather: WeatherConfig;
	search: SearchConfig;
	notifications: NotificationConfig;
	resources: CustomResources;
	pages: Page[];
	profiles: UserProfile[];
	activeProfileId?: string;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_THEME: ThemeConfig = {
	themeId: 'nebula',
	radius: 'lg',
	tileRadius: 'lg',
	popupRadius: 'lg',
	font: { family: 'Inter', size: 'md' },
	dense: false,
	animations: true
};



export const DEFAULT_NAV: NavConfig = {
	position: 'left',

	iconSize: 'md',
	showLabels: true,
	showLabelsOnMobile: false,
	showMobileClock: false,
	showMobileDate: true,
	showMobileWeather: true,
	showMobileAlertsButton: true,
	showHeader: false,
	showConnectionStatus: true,
	mobileBreakpoint: 800,
	mobileStyle: 'bottom-bar',
	heroEntities: [],
	order: [],
	extras: [],
	badges: []
};

export const DEFAULT_HEADER: HeaderConfig = {
	visible: true,
	height: 56,
	showPageTitle: false,
	showSearch: true,
	showEditButton: true,
	showSettingsButton: true,
	showNotifications: true,
	quickActions: []
};

export const DEFAULT_SETTINGS: AppSettings = {
	locale: 'en',
	timeFormat: '12h',
	unitSystem: 'auto'
};

export const DEFAULT_TILE_DEFAULTS: TileDefaults = {
	tap_action: { type: 'toggle' },
	hold_action: { type: 'more-info' },
	double_tap_action: { type: 'more-info' },
	show_name: true,
	show_icon: true,
	show_state: true,
	show_last_changed: false,
	historyHours: 24,
	cameraRefreshInterval: 10
};

export const DEFAULT_SEARCH: SearchConfig = {
	enabled: true,
	hotkey: 'k',
	includeEntities: true,
	includePages: true,
	includeScripts: true,
	includeScenes: true,
	includeAutomations: true
};

export const DEFAULT_WEATHER: WeatherConfig = {
	temperatureUnit: 'auto',
	windSpeedUnit: 'auto',
	precipitationUnit: 'auto',
	showForecast: true,
	forecastDays: 5
};

export const DEFAULT_SCREENSAVER: ScreensaverConfig = {
	enabled: false,
	idleTimeout: 300,
	type: 'dim',
	dimOpacity: 0.3,
	showClock: true,
	clockFormat: '12h'
};

export const DEFAULT_KIOSK: KioskConfig = {
	enabled: false,
	hideNav: true,
	hideHeader: true,
	hideFab: true,
	allowSwipeNav: true
};

export const DEFAULT_PAGE_TRANSITION: PageTransition = {
	type: 'none',
	duration: 200
};

export const DEFAULT_THEME_SCHEDULE: ThemeSchedule = {
	enabled: false,
	mode: 'sun',
	dayPresetId: 'polar-ice',
	nightPresetId: 'midnight',
	dayStart: '07:00',
	nightStart: '20:00',
	sunEntityId: 'sun.sun',
	dayOffset: 0,
	nightOffset: 0
};

export const DEFAULT_DISPLAY: DisplayConfig = {
	swipeNavigation: true,
	swipeThreshold: 50,
	pageTransition: { ...DEFAULT_PAGE_TRANSITION },
	timeBasedPages: [],
	themeSchedule: { ...DEFAULT_THEME_SCHEDULE },
	kiosk: { ...DEFAULT_KIOSK },
	screensaver: { ...DEFAULT_SCREENSAVER },
};

export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
	enabled: true,
	showPersistent: true,
	showAlerts: true,
	includeAlertDomainEntities: true,
	includeUpdateDomainEntities: false,
	includeBinarySensorDomainEntities: false,
	includeAlarmControlPanelDomainEntities: false,
	alertEntityIds: [],
	alertStateMap: {
		alert: ['on'],
		update: ['on'],
		binary_sensor: ['on'],
		alarm_control_panel: ['triggered', 'pending', 'arming', 'disarming']
	},
	sound: false,
	position: 'bottom-right',
	duration: 5000
};

export const DEFAULT_EDIT: EditConfig = {
	confirmDelete: true,
	autoSave: true
};

export const DEFAULT_MEDIA: MediaConfig = {};

export const DEFAULT_ENERGY: EnergyConfig = {
	enabled: false
};

export const DEFAULT_DIALOG: DialogConfig = {
	moreInfoStyle: 'modal',
	drawerSide: 'right',
	showRelatedEntities: true
};

export const DEFAULT_FAVORITES: FavoritesConfig = {
	entityIds: [],
	showInHeader: false,
	showInNav: false
};

export const DEFAULT_SECTION_GRID: SectionGrid = {
	baseSize: 160,
	gap: 8
};

export const DEFAULT_TILE_SIZE: TileSize = { w: 1, h: 1 };

export function defaultSection(overrides?: Partial<Section>): Section {
	return {
		id: generateId(),
		role: 'main',
		layoutMode: 'grid',
		pinMode: 'none',
		grid: { ...DEFAULT_SECTION_GRID },
		collapsible: false,
		collapsed: false,
		visibility: { ...VISIBLE_ALL },
		tiles: [],
		...overrides
	};
}

export function defaultPage(overrides?: Partial<Page>): Page {
	return {
		id: generateId(),
		name: 'Home',
		icon: 'house',
		layout: 'default',
		background: { type: 'none' },
		navVisibility: { ...VISIBLE_ALL },
		adminOnly: false,
		sections: [defaultSection()],
		...overrides
	};
}

export function defaultConfig(): DashboardConfig {
	return {
		version: SCHEMA_VERSION,
		settings: { ...DEFAULT_SETTINGS },
		theme: { ...DEFAULT_THEME },
		nav: { ...DEFAULT_NAV },
		header: { ...DEFAULT_HEADER },
		display: {
			...DEFAULT_DISPLAY,
			pageTransition: { ...DEFAULT_PAGE_TRANSITION },
			kiosk: { ...DEFAULT_KIOSK },
			screensaver: { ...DEFAULT_SCREENSAVER }
		},
		tileDefaults: { ...DEFAULT_TILE_DEFAULTS },
		edit: { ...DEFAULT_EDIT },
		media: { ...DEFAULT_MEDIA },
		energy: { ...DEFAULT_ENERGY },
		dialog: { ...DEFAULT_DIALOG },
		favorites: { ...DEFAULT_FAVORITES },
		weather: { ...DEFAULT_WEATHER },
		search: { ...DEFAULT_SEARCH },
		notifications: { ...DEFAULT_NOTIFICATIONS },
		resources: {},
		pages: [defaultPage()],
		profiles: [],
		activeProfileId: undefined
	};
}

// ─── Migration ────────────────────────────────────────────────────────────────

export function migrateConfig(raw: unknown): DashboardConfig {
	if (!raw || typeof raw !== 'object') return defaultConfig();

	const input = raw as Partial<DashboardConfig>;
	const migratedProfiles = input.profiles ?? [];
	const rawTheme = (input.theme ?? {}) as Partial<ThemeConfig>;
	const rawNav = (input.nav ?? {}) as Partial<NavConfig>;
	const rawMobileStyle = rawNav.mobileStyle as string | undefined;
	const normalizedMobileStyle: NavConfig['mobileStyle'] =
		rawMobileStyle === 'bottom-bar' || rawMobileStyle === 'drawer' || rawMobileStyle === 'hidden'
			? rawMobileStyle
			: rawMobileStyle === 'bottom' || rawMobileStyle === 'bar'
				? 'bottom-bar'
				: DEFAULT_NAV.mobileStyle;

	return {
		version: SCHEMA_VERSION,
		settings: {
			...DEFAULT_SETTINGS,
			...(input.settings ?? {})
		},
		theme: (() => {
			const theme = {
				...DEFAULT_THEME,
				...rawTheme,
				font: { ...DEFAULT_THEME.font, ...(rawTheme.font ?? {}) }
			};
			// Theme ID Migration
			const migration: Record<string, string> = {
				'antigravity-prime': 'neon-tokyo',
				'sahara': 'matcha-latte',
				'snow': 'polar-ice',
				'abyss': 'velvet-noir',
				'nordic': 'terracotta',
				'ember': 'deep-ocean',
				'neo-brutalism': 'draftwork'
			};
			if (migration[theme.themeId]) {
				theme.themeId = migration[theme.themeId];
			}
			return theme;
		})(),
		nav: {
			position: rawNav.position ?? DEFAULT_NAV.position,

			iconSize: rawNav.iconSize ?? DEFAULT_NAV.iconSize,
			showLabels: rawNav.showLabels ?? DEFAULT_NAV.showLabels,
			showLabelsOnMobile: rawNav.showLabelsOnMobile ?? DEFAULT_NAV.showLabelsOnMobile,
			showMobileClock: rawNav.showMobileClock ?? DEFAULT_NAV.showMobileClock,
			showMobileDate: rawNav.showMobileDate ?? DEFAULT_NAV.showMobileDate,
			showMobileWeather: rawNav.showMobileWeather ?? DEFAULT_NAV.showMobileWeather,
			showMobileAlertsButton: rawNav.showMobileAlertsButton ?? DEFAULT_NAV.showMobileAlertsButton,
			showHeader: rawNav.showHeader ?? DEFAULT_NAV.showHeader,
			headerTitle: rawNav.headerTitle ?? DEFAULT_NAV.headerTitle,
			headerIcon: rawNav.headerIcon ?? DEFAULT_NAV.headerIcon,
			showConnectionStatus: rawNav.showConnectionStatus ?? DEFAULT_NAV.showConnectionStatus,
			mobileBreakpoint: rawNav.mobileBreakpoint ?? DEFAULT_NAV.mobileBreakpoint,
			mobileStyle: normalizedMobileStyle,
			heroEntities: rawNav.heroEntities ?? [],
			order: rawNav.order ?? [],
			extras: rawNav.extras ?? [],
			badges: rawNav.badges ?? []
		},
		header: {
			...DEFAULT_HEADER,
			...(input.header ?? {}),
			quickActions: input.header?.quickActions ?? []
		},
		display: {
			...DEFAULT_DISPLAY,
			...(input.display ?? {}),
			pageTransition: {
				...DEFAULT_PAGE_TRANSITION,
				...(input.display?.pageTransition ?? {})
			},
			kiosk: { ...DEFAULT_KIOSK, ...(input.display?.kiosk ?? {}) },
			screensaver: { ...DEFAULT_SCREENSAVER, ...(input.display?.screensaver ?? {}) },
			themeSchedule: { ...DEFAULT_THEME_SCHEDULE, ...(input.display?.themeSchedule ?? {}) },
			timeBasedPages: input.display?.timeBasedPages ?? []
		},
		tileDefaults: { ...DEFAULT_TILE_DEFAULTS, ...(input.tileDefaults ?? {}) },
		edit: { ...DEFAULT_EDIT, ...(input.edit ?? {}) },
		media: { ...DEFAULT_MEDIA, ...(input.media ?? {}) },
		energy: { ...DEFAULT_ENERGY, ...(input.energy ?? {}) },
		dialog: { ...DEFAULT_DIALOG, ...(input.dialog ?? {}) },
		favorites: { ...DEFAULT_FAVORITES, ...(input.favorites ?? {}) },
		weather: { ...DEFAULT_WEATHER, ...(input.weather ?? {}) },
		search: { ...DEFAULT_SEARCH, ...(input.search ?? {}) },
		notifications: {
			...DEFAULT_NOTIFICATIONS,
			...(input.notifications ?? {}),
			alertStateMap: {
				...DEFAULT_NOTIFICATIONS.alertStateMap,
				...(input.notifications?.alertStateMap ?? {})
			}
		},
		resources: { ...(input.resources ?? {}) },
		pages: (input.pages ?? [defaultPage()]).map(migratePageV5),
		profiles: migratedProfiles,
		activeProfileId: migratedProfiles.some((p) => p.id === input.activeProfileId)
			? input.activeProfileId
			: migratedProfiles[0]?.id
	};
}

function migratePageV5(raw: unknown): Page {
	const p = raw as Partial<Page> & { sections?: unknown[]; visible?: boolean };
	return {
		id: p.id ?? generateId(),
		name: p.name ?? 'Page',
		icon: p.icon ?? 'house',
		color: p.color,
		layout: p.layout ?? 'default',
		background: p.background ?? { type: 'none' },
		navVisibility: p.navVisibility ?? {
			sm: p.visible ?? true,
			md: p.visible ?? true,
			lg: p.visible ?? true
		},
		adminOnly: p.adminOnly ?? false,
		areaId: p.areaId,
		transition: p.transition,
		sections: (p.sections ?? [defaultSection()]).map(migrateSectionV5)
	};
}

function migrateSectionV5(raw: unknown): Section {
	const s = raw as any;
	const rawLayoutMode = typeof s.layoutMode === 'string' ? s.layoutMode : '';
	const layoutMode =
		rawLayoutMode === 'horizontal_chip_row'
			? 'horizontal_chip_row'
			: rawLayoutMode === 'grid'
				? 'grid'
				: rawLayoutMode
					? 'horizontal_chip_row'
					: 'grid';
	const migratedTiles = (s.tiles ?? []).map(migrateTileV5);
	const tiles = migratedTiles.some((tile: Tile) => tile.layout)
		? migratedTiles
		: packLegacyTilesForMigration(
			migratedTiles,
			s.grid?.columns && s.grid.columns > 0 ? s.grid.columns : 12
		);
	return {
		id: s.id ?? generateId(),
		title: s.title,
		icon: s.icon,
		role: s.role ?? 'main',
		layoutMode,
		pinMode: s.pinMode === 'top' || s.pinMode === 'bottom' ? s.pinMode : 'none',
		grid: {
			baseSize: s.grid?.baseSize ?? DEFAULT_SECTION_GRID.baseSize,
			gap: s.grid?.gap ?? DEFAULT_SECTION_GRID.gap,
			columns: s.grid?.columns
		},
		padding: s.padding,
		collapsible: layoutMode === 'horizontal_chip_row' ? false : (s.collapsible ?? false),
		collapsed: layoutMode === 'horizontal_chip_row' ? false : (s.collapsed ?? false),
		visibility: s.visibility ?? { ...VISIBLE_ALL },
		tiles
	};
}

function migrateTileV5(raw: unknown): Tile {
	const t = raw as any;
	// Supports old formats:
	//   { size: { w, h } }               — previous simple version
	//   { grid: { lg: { colSpan, rowSpan } } } — legacy v4 format
	const w = t.size?.w ?? t.grid?.lg?.colSpan ?? 1;
	const h = t.size?.h ?? t.grid?.lg?.rowSpan ?? 1;
	const layout = t.layout
		? {
			x: Math.max(0, Math.floor(t.layout.x ?? 0)),
			y: Math.max(0, Math.floor(t.layout.y ?? 0)),
			w: Math.max(1, Math.floor(t.layout.w ?? w)),
			h: Math.max(1, Math.floor(t.layout.h ?? h))
		}
		: undefined;

	const rawType = typeof t.type === 'string' ? t.type : 'entity';
	const normalizedType = rawType === 'clock' ? 'divider' : rawType;

	return {
		id: t.id ?? generateId(),
		type: normalizedType as TileType,
		entity_id: t.entity_id,
		size: { w, h },
		sizePreset: t.sizePreset ?? inferLegacyPreset({ w, h }),
		layout,
		visibility: t.visibility ?? { ...VISIBLE_ALL },
		conditions: t.conditions,
		badges: t.badges,
		config: t.config ?? {}
	};
}

function inferLegacyPreset(size: TileSize): TileSizePreset {
	if (size.w <= 1 && size.h <= 1) return 'sm';
	if ((size.w <= 2 && size.h <= 1) || (size.w <= 1 && size.h <= 2) || size.w * size.h <= 2) return 'md';
	if (size.w * size.h <= 4 || (size.w <= 3 && size.h <= 1)) return 'lg';
	return 'xl';
}

function packLegacyTilesForMigration(tiles: Tile[], cols: number): Tile[] {
	const occupied = new Set<string>();
	const width = Math.max(1, cols);

	return tiles.map((tile) => {
		const w = Math.max(1, Math.min(tile.size.w, width));
		const h = Math.max(1, tile.size.h);
		let y = 0;
		let placed: TileLayout | null = null;

		while (!placed) {
			for (let x = 0; x <= width - w; x += 1) {
				const candidate = { x, y, w, h };
				if (canUseCandidate(candidate, occupied, width)) {
					placed = candidate;
					break;
				}
			}
			if (!placed) y += 1;
		}

		for (let row = placed.y; row < placed.y + placed.h; row += 1) {
			for (let col = placed.x; col < placed.x + placed.w; col += 1) {
				occupied.add(`${col}:${row}`);
			}
		}

		return {
			...tile,
			layout: placed
		};
	});
}

function canUseCandidate(layout: TileLayout, occupied: Set<string>, cols: number): boolean {
	if (layout.x + layout.w > cols) return false;

	for (let row = layout.y; row < layout.y + layout.h; row += 1) {
		for (let col = layout.x; col < layout.x + layout.w; col += 1) {
			if (occupied.has(`${col}:${row}`)) return false;
		}
	}

	return true;
}
