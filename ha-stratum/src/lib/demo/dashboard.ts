// ─────────────────────────────────────────────────────────────────────────────
// Stratum — Demo Dashboard  ·  "The Maple House"
// A realistic multi-room smart home across 7 pages with 100+ tile instances
// showcasing nearly every available tile type.
// ─────────────────────────────────────────────────────────────────────────────

import {
    type DashboardConfig,
    type Page,
    type Section,
    type Tile,
    defaultConfig,
    VISIBLE_ALL
} from '$lib/types/dashboard';

import { resolvePresetToSpan } from '$lib/layout/tileSizing';

let _id = 0;
function uid() { return `demo-${++_id}`; }

// ── Tile builder ─────────────────────────────────────────────────────────────
function tile(
    type: Tile['type'],
    entity_id: string | undefined,
    config: Tile['config'] = {},
    sizePreset: NonNullable<Tile['sizePreset']> = 'md'
): Tile {
    return {
        id: uid(),
        type,
        entity_id,
        sizePreset,
        size: resolvePresetToSpan(type, sizePreset, 'lg'),
        visibility: { ...VISIBLE_ALL },
        config: {
            tap_action: { type: 'toggle' },
            hold_action: { type: 'more-info' },
            double_tap_action: { type: 'more-info' },
            ...config
        }
    };
}

// ── Section builder ───────────────────────────────────────────────────────────
function sec(
    title: string,
    icon: string,
    tiles: Tile[],
    columns?: number
): Section {
    return {
        id: uid(),
        title,
        icon,
        role: 'main',
        grid: { columns, baseSize: 160, gap: 8 },
        collapsible: false,
        collapsed: false,
        visibility: { ...VISIBLE_ALL },
        tiles
    };
}

// ── Collapsible section (for secondary/overflow groups) ───────────────────────
function colSec(
    title: string,
    icon: string,
    tiles: Tile[],
    columns?: number
): Section {
    return { ...sec(title, icon, tiles, columns), collapsible: true, collapsed: false };
}


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — HOME (Overview / Hub)
// ═══════════════════════════════════════════════════════════════════════════════

const homeHeader = sec('Good Morning ✨', 'home', [
    // Full weather widget
    tile('weather', 'weather.home', {
        weather_show_humidity: true,
        weather_show_wind: true,
        weather_show_uv_index: true,
        weather_forecast_type: 'daily',
        weather_forecast_days: 5
    }, 'lg'),
    // Solar + battery energy overview
    tile('energy', undefined, {
        grid_entity: 'sensor.grid_power',
        solar_entity: 'sensor.solar_power',
        battery_entity: 'sensor.battery_soc'
    }, 'lg'),
    // Live wall clock
    tile('clock', undefined, {
        time_format: '12h',
        show_date: true,
        clock_style: 'digital'
    }, 'md'),
    // Home status selector
    tile('input_select', 'input_select.vacation_mode', {
        name: 'Home Status',
        select_mode: 'buttons'
    }, 'lg'),
]);

const homeFamily = sec('Family', 'users', [
    tile('person', 'person.alex', {
        name: 'Alex',
        show_location_text: true,
        show_home_away_badge: true,
        show_person_picture: true
    }, 'md'),
    tile('person', 'person.riley', {
        name: 'Riley',
        show_location_text: true,
        show_home_away_badge: true,
        show_person_picture: true
    }, 'md'),
    tile('person', 'person.jamie', {
        name: 'Jamie',
        show_location_text: true,
        show_home_away_badge: true,
        show_person_picture: true
    }, 'md'),
    // Family location map
    tile('map', undefined, {
        map_entity_ids: ['person.alex', 'person.riley', 'person.jamie'],
        map_show_names: true,
        map_show_zones: true,
        map_default_zoom: 12,
        map_dark_mode: 'auto'
    }, 'xl'),
]);

const homeQuickScenes = sec('Quick Scenes', 'sparkles', [
    tile('button', 'scene.wake_up', { name: 'Wake Up', icon: 'sunrise' }, 'md'),
    tile('button', 'scene.leave_home', { name: 'Leave Home', icon: 'door-open' }, 'md'),
    tile('button', 'scene.arrive_home', { name: 'Arrive Home', icon: 'home' }, 'md'),
    tile('button', 'scene.movie_night', { name: 'Movie Night', icon: 'film' }, 'md'),
    tile('button', 'scene.dinner_party', { name: 'Dinner Party', icon: 'utensils' }, 'md'),
    tile('button', 'scene.good_night', { name: 'Good Night', icon: 'moon' }, 'md'),
    tile('button', 'scene.romantic_evening', { name: 'Romantic Eve', icon: 'heart' }, 'md'),
    tile('button', 'scene.party_mode', { name: 'Party Mode', icon: 'music' }, 'md'),
    tile('button', 'scene.work_from_home', { name: 'Work Mode', icon: 'briefcase' }, 'md'),
    tile('button', 'scene.kids_bedtime', { name: "Kids Bedtime", icon: 'moon-star' }, 'md'),
    tile('button', 'scene.all_off', { name: 'All Off', icon: 'power' }, 'md'),
    tile('button', 'scene.weekend_morning', { name: 'Weekend AM', icon: 'coffee' }, 'md'),
], 6);

const homeAlerts = sec('Active Alerts', 'bell', [
    // Water leak sensors — should show clear/safe
    tile('entity', 'binary_sensor.water_leak_kitchen', { name: 'Kitchen Leak' }, 'sm'),
    tile('entity', 'binary_sensor.water_leak_basement', { name: 'Basement Leak' }, 'sm'),
    tile('entity', 'binary_sensor.water_leak_laundry', { name: 'Laundry Leak' }, 'sm'),
    tile('entity', 'binary_sensor.smoke_kitchen', { name: 'Smoke Detector' }, 'sm'),
    tile('entity', 'binary_sensor.co_detector', { name: 'CO Detector' }, 'sm'),
    tile('entity', 'binary_sensor.doorbell', { name: 'Doorbell' }, 'sm'),
]);

const homeMarkdown = sec('Notes', 'file-text', [
    tile('markdown', undefined, {
        content: `## 🏠 Maple House
**Status:** All systems normal · Solar **+1.94 kW** net surplus  
**Next event:** Riley returns ~6:30PM · Pool maintenance Friday 9AM

> 💡 Try holding any tile to open its full detail view.`
    }, 'xl'),
]);

const homePage: Page = {
    id: uid(), name: 'Home', icon: 'home', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [homeHeader, homeFamily, homeQuickScenes, homeAlerts, homeMarkdown],
    transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — LIVING ROOM
// Zones: Entertainment / Climate / Lighting & Ambience
// ═══════════════════════════════════════════════════════════════════════════════

const livingEntertainment = sec('Entertainment', 'tv', [
    tile('media_player', 'media_player.living_room_tv', {
        name: 'Living Room TV',
        show_artwork: true,
        show_progress: true,
        show_volume: true,
        show_source: true,
        artwork_size: 'lg',
        media_controls: ['play', 'previous', 'next', 'shuffle', 'repeat']
    }, 'xl'),
    // Harmony Hub remote
    tile('remote', 'remote.living_room_hub', {
        name: 'Entertainment Hub',
        remote_commands: [
            { label: 'Watch TV', command: 'Watch TV', icon: 'tv' },
            { label: 'Movies', command: 'Watch Movies', icon: 'film' },
            { label: 'Gaming', command: 'Gaming', icon: 'gamepad-2' },
            { label: 'Music', command: 'Listen Music', icon: 'music' },
            { label: 'Power Off', command: 'PowerOff', icon: 'power' },
        ]
    }, 'lg'),
    tile('media_player', 'media_player.kitchen_display', {
        name: 'Kitchen Speaker',
        show_artwork: true,
        show_volume: true,
        artwork_size: 'md',
        media_controls: ['play', 'previous', 'next']
    }, 'lg'),
]);

const livingClimate = sec('Climate & Comfort', 'thermometer', [
    tile('climate', 'climate.living_room', {
        name: 'Living Room AC',
        show_current_temp: true,
        show_humidity: true,
        show_hvac_modes: true,
        show_preset_modes: true,
        show_fan_mode: true
    }, 'lg'),
    tile('fan', 'fan.living_room_ceiling', {
        name: 'Ceiling Fan',
        show_speed_slider: true,
        show_oscillate: true
    }, 'md'),
    tile('fan', 'fan.dining_room_ceiling', {
        name: 'Dining Fan'
    }, 'md'),
    tile('humidifier', 'humidifier.living_room', {
        name: 'Living Room Humidifier',
        show_humidity_slider: true,
        show_humidifier_mode: true
    }, 'lg'),
    tile('entity', 'sensor.living_room_temp', {
        name: 'Temperature',
        show_graph: true, graph_type: 'line', graph_hours: 12
    }, 'md'),
    tile('entity', 'sensor.living_room_humidity', {
        name: 'Humidity',
        show_graph: true, graph_type: 'line', graph_hours: 12
    }, 'md'),
]);

const livingLights = sec('Lighting & Ambience', 'lightbulb', [
    tile('light', 'light.living_room_ceiling', { name: 'Ceiling', show_brightness_slider: true, show_color_temp_slider: true }, 'md'),
    tile('light', 'light.living_room_floor_lamp', { name: 'Floor Lamp', show_color_picker: true }, 'md'),
    tile('light', 'light.tv_backlight', { name: 'TV Backlight', show_color_picker: true }, 'md'),
    tile('light', 'light.bookshelf_led', { name: 'Bookshelf LED', show_color_picker: true }, 'md'),
    tile('light', 'light.dining_pendant', { name: 'Dining Pendant', show_brightness_slider: true }, 'md'),
    tile('light', 'light.staircase_step', { name: 'Staircase', show_color_picker: true }, 'md'),
    tile('cover', 'cover.living_room_blinds', { name: 'Blinds', show_position_slider: true }, 'md'),
    tile('cover', 'cover.living_room_curtains', { name: 'Curtains', show_position_slider: true }, 'md'),
    tile('cover', 'cover.dining_room_blinds', { name: 'Dining Blinds', show_position_slider: true }, 'md'),
    tile('input_select', 'input_select.scene_mode', { name: 'Scene', select_mode: 'buttons' }, 'lg'),
]);

const livingRoomPage: Page = {
    id: uid(), name: 'Living Room', icon: 'sofa', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [livingEntertainment, livingClimate, livingLights], transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — KITCHEN & DINING
// Zones: Audio / Lighting / Appliances & Timers / Lists
// ═══════════════════════════════════════════════════════════════════════════════

const kitchenAudio = sec('Audio', 'music', [
    tile('media_player', 'media_player.kitchen_display', {
        name: 'Echo Show 15',
        show_artwork: true,
        show_progress: false,
        show_volume: true,
        show_source: true,
        artwork_size: 'lg',
        media_controls: ['play', 'previous', 'next']
    }, 'lg'),
    tile('input_select', 'input_select.audio_source', {
        name: 'Audio Source',
        select_mode: 'buttons'
    }, 'lg'),
]);

const kitchenLights = sec('Lighting', 'lightbulb', [
    tile('light', 'light.kitchen_overhead', { name: 'Overhead', show_brightness_slider: true, show_color_temp_slider: true }, 'md'),
    tile('light', 'light.kitchen_under_cabinet', { name: 'Under Cabinet', show_color_picker: true }, 'md'),
    tile('light', 'light.dining_pendant', { name: 'Dining Pendant', show_brightness_slider: true }, 'md'),
]);

const kitchenTimers = sec('Timers & Appliances', 'chef-hat', [
    tile('timer', 'timer.oven', {
        name: 'Oven Timer',
        timer_show_progress_ring: true,
        timer_show_controls: true,
        timer_show_duration: true
    }, 'lg'),
    tile('timer', 'timer.laundry', {
        name: 'Laundry Timer',
        timer_show_progress_ring: true,
        timer_show_controls: true,
        timer_show_duration: true
    }, 'lg'),
    tile('entity', 'binary_sensor.smoke_kitchen', { name: 'Smoke Detector' }, 'sm'),
    tile('entity', 'binary_sensor.water_leak_kitchen', { name: 'Leak Sensor' }, 'sm'),
]);

const kitchenLists = sec('Lists', 'list-checks', [
    tile('todo', 'todo.grocery_list', {
        name: 'Grocery List',
        todo_show_completed: false,
        todo_show_add_button: true,
        todo_max_items: 12
    }, 'xl'),
    tile('todo', 'todo.home_tasks', {
        name: 'Home Tasks',
        todo_show_completed: true,
        todo_show_add_button: true,
        todo_max_items: 8
    }, 'lg'),
    tile('todo', 'todo.shopping', {
        name: 'Shopping',
        todo_show_completed: false,
        todo_show_add_button: true,
        todo_max_items: 10
    }, 'lg'),
]);

const kitchenPage: Page = {
    id: uid(), name: 'Kitchen', icon: 'utensils', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [kitchenAudio, kitchenLights, kitchenTimers, kitchenLists], transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — BEDROOMS
// Master suite, Kids room, Guest room
// ═══════════════════════════════════════════════════════════════════════════════

const masterSuite = sec('Master Suite', 'bed-double', [
    tile('climate', 'climate.master_bedroom', {
        name: 'Master AC',
        show_current_temp: true,
        show_humidity: true,
        show_hvac_modes: true,
        show_preset_modes: true,
        show_fan_mode: true
    }, 'lg'),
    tile('media_player', 'media_player.bedroom_speaker', {
        name: 'Bedside Speaker',
        show_artwork: true,
        show_volume: true,
        show_source: true,
        artwork_size: 'md',
        media_controls: ['play', 'previous', 'next']
    }, 'lg'),
    tile('fan', 'fan.master_bedroom_ceiling', {
        name: 'Ceiling Fan',
        show_speed_slider: true
    }, 'md'),
    tile('humidifier', 'humidifier.master_bedroom', {
        name: 'Humidifier',
        show_humidity_slider: true,
        show_humidifier_mode: true
    }, 'lg'),
    tile('cover', 'cover.master_bedroom_shades', {
        name: 'Blackout Shades',
        show_position_slider: true
    }, 'md'),
    tile('light', 'light.master_headboard', { name: 'Headboard', show_color_picker: true }, 'md'),
    tile('light', 'light.master_ceiling', { name: 'Ceiling', show_color_temp_slider: true }, 'md'),
    tile('light', 'light.master_nightstand_left', { name: 'Left Nightstand' }, 'sm'),
    tile('light', 'light.master_nightstand_right', { name: 'Right Nightstand' }, 'sm'),
    tile('light', 'light.master_bath', { name: 'Master Bath' }, 'sm'),
    tile('entity', 'sensor.master_bedroom_temp', {
        name: 'Bedroom Temp',
        show_graph: true, graph_type: 'line', graph_hours: 8
    }, 'md'),
    tile('entity', 'binary_sensor.window_master', { name: 'Window' }, 'sm'),
]);

const kidsRoom = sec("Kids Room", 'shapes', [
    tile('climate', 'climate.kids_room', {
        name: "Kids AC",
        show_current_temp: true,
        show_hvac_modes: true,
        show_preset_modes: true
    }, 'lg'),
    tile('media_player', 'media_player.kids_room_speaker', {
        name: 'Echo Dot',
        show_artwork: true,
        show_volume: true,
        artwork_size: 'md',
        media_controls: ['play', 'previous', 'next']
    }, 'lg'),
    tile('humidifier', 'humidifier.kids_room', {
        name: 'Humidifier',
        show_humidity_slider: true,
        show_humidifier_mode: true
    }, 'lg'),
    tile('light', 'light.kids_ceiling', { name: 'Ceiling Light' }, 'md'),
    tile('light', 'light.kids_nightlight', { name: 'Night Light', show_color_picker: true }, 'md'),
    tile('button', 'scene.kids_bedtime', { name: 'Bedtime', icon: 'moon-star' }, 'md'),
    tile('vacuum', 'vacuum.upstairs', {
        name: 'iRobot — Upstairs',
        show_vacuum_fan_speed: true
    }, 'lg'),
]);

const guestRoom = colSec('Guest Bedroom', 'door-open', [
    tile('climate', 'climate.guest_bedroom', {
        name: 'Guest AC',
        show_current_temp: true,
        show_hvac_modes: true
    }, 'lg'),
    tile('light', 'light.guest_bedroom', { name: 'Bedroom Light' }, 'md'),
    tile('light', 'light.guest_bath', { name: 'Guest Bath' }, 'md'),
]);

const bedroomsPage: Page = {
    id: uid(), name: 'Bedrooms', icon: 'bed-double', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [masterSuite, kidsRoom, guestRoom], transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — HOME OFFICE
// Smart work environment: Climate, Audio, Lighting, Air quality gauges
// ═══════════════════════════════════════════════════════════════════════════════

const officeSetup = sec('Office Setup', 'monitor', [
    tile('climate', 'climate.home_office', {
        name: 'Office AC',
        show_current_temp: true,
        show_humidity: true,
        show_hvac_modes: true,
        show_preset_modes: true
    }, 'lg'),
    tile('media_player', 'media_player.office_monitor', {
        name: 'Sonos Era — Office',
        show_artwork: true,
        show_volume: true,
        show_source: true,
        artwork_size: 'md',
        media_controls: ['play', 'previous', 'next', 'shuffle']
    }, 'lg'),
    tile('fan', 'fan.home_office_desk', {
        name: 'Desk Fan',
        show_speed_slider: true
    }, 'md'),
    tile('cover', 'cover.office_blinds', {
        name: 'Office Blinds',
        show_position_slider: true
    }, 'md'),
    tile('entity', 'binary_sensor.window_office', { name: 'Office Window' }, 'sm'),
    tile('button', 'scene.work_from_home', { name: 'Work Mode', icon: 'briefcase' }, 'md'),
]);

const officeLighting = sec('Lighting', 'sun', [
    tile('light', 'light.office_desk_lamp', { name: 'Desk Lamp', show_brightness_slider: true, show_color_temp_slider: true }, 'md'),
    tile('light', 'light.office_overhead', { name: 'Overhead', show_brightness_slider: true }, 'md'),
    tile('light', 'light.office_bias_lighting', { name: 'Bias Lighting', show_color_picker: true }, 'md'),
    tile('slider', 'number.living_room_light_schedule', {
        name: 'Lights Off At',
        slider_min: 18, slider_max: 24, slider_step: 0.5
    }, 'lg'),
]);

const officeAirQuality = sec('Air Quality', 'wind', [
    // Gauge with segmented severity
    tile('gauge', 'sensor.office_co2', {
        name: 'CO₂ Level',
        min: 400,
        max: 2000,
        gauge_needle: true,
        gauge_segments: [
            { from: 400, color: '#22c55e', label: 'Excellent' },
            { from: 600, color: '#84cc16', label: 'Good' },
            { from: 900, color: '#eab308', label: 'Fair' },
            { from: 1200, color: '#f97316', label: 'Poor' },
            { from: 1600, color: '#ef4444', label: 'Bad' },
        ]
    }, 'lg'),
    // History sparkline chart
    tile('history', 'sensor.office_co2', {
        name: 'CO₂ Last 8h',
        hours: 8,
        history_fill: true,
        history_smooth: true
    }, 'lg'),
    tile('entity', 'sensor.office_temp', { name: 'Office Temp' }, 'sm'),
    tile('entity', 'sensor.outdoor_air_quality', { name: 'Outdoor AQI' }, 'sm'),
    tile('entity', 'sensor.outdoor_uv', { name: 'UV Index' }, 'sm'),
    tile('entity', 'sensor.outdoor_temp', { name: 'Outdoor Temp' }, 'sm'),
]);

const officePage: Page = {
    id: uid(), name: 'Office', icon: 'briefcase', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [officeSetup, officeLighting, officeAirQuality], transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — SECURITY
// Alarm, cameras, locks, sensors, siren, logbook
// ═══════════════════════════════════════════════════════════════════════════════

const securityAlarm = sec('Alarm & Locks', 'shield', [
    tile('alarm_panel', 'alarm_control_panel.home', {
        name: 'Home Security',
        alarm_code_format: 'number',
        show_keypad: true
    }, 'lg'),
    tile('lock', 'lock.front_door', { name: 'Front Door', lock_confirm: true }, 'md'),
    tile('lock', 'lock.back_door', { name: 'Back Door', lock_confirm: true }, 'md'),
    tile('lock', 'lock.garage_side', { name: 'Garage Side', lock_confirm: true }, 'md'),
    // Outdoor siren
    tile('siren', 'siren.outdoor_alarm', {
        name: 'Outdoor Siren',
        show_siren_tone: true,
        show_siren_duration_input: true
    }, 'lg'),
]);

const securityCameras = sec('Cameras', 'camera', [
    tile('camera', 'camera.front_door', { name: 'Front Door', artwork_size: 'fill' }, 'lg'),
    tile('camera', 'camera.driveway', { name: 'Driveway', artwork_size: 'fill' }, 'lg'),
    tile('camera', 'camera.backyard', { name: 'Backyard', artwork_size: 'fill' }, 'lg'),
    tile('camera', 'camera.garage', { name: 'Garage', artwork_size: 'fill' }, 'lg'),
]);

const securitySensors = sec('Door & Window Sensors', 'radar', [
    tile('entity', 'binary_sensor.front_door_contact', { name: 'Front Door' }, 'sm'),
    tile('entity', 'binary_sensor.back_door_contact', { name: 'Back Door' }, 'sm'),
    tile('entity', 'binary_sensor.window_master', { name: 'Master Window' }, 'sm'),
    tile('entity', 'binary_sensor.window_office', { name: 'Office Window' }, 'sm'),
    tile('entity', 'binary_sensor.front_yard_motion', { name: 'Front Motion' }, 'sm'),
    tile('entity', 'binary_sensor.garage_motion', { name: 'Garage Motion' }, 'sm'),
    tile('entity', 'binary_sensor.doorbell', { name: 'Doorbell' }, 'sm'),
]);

const securityLogbook = sec('Event Log', 'scroll-text', [
    tile('logbook', undefined, {
        name: 'Security Events',
        logbook_entity_ids: [
            'alarm_control_panel.home',
            'lock.front_door',
            'lock.back_door',
            'binary_sensor.front_door_contact',
            'binary_sensor.front_yard_motion',
            'binary_sensor.doorbell'
        ],
        logbook_count: 25,
        logbook_show_icon: true
    }, 'xl'),
]);

const securityPage: Page = {
    id: uid(), name: 'Security', icon: 'shield', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [securityAlarm, securityCameras, securitySensors, securityLogbook], transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — OUTDOOR & ENERGY
// Pool, Patio, Garage, Lawn, EV, Energy stats, System
// ═══════════════════════════════════════════════════════════════════════════════

const outdoorPatio = sec('Patio & Exterior', 'sun', [
    tile('light', 'light.back_porch', { name: 'Back Porch', show_color_picker: true }, 'md'),
    tile('light', 'light.front_porch', { name: 'Front Porch', show_brightness_slider: true }, 'md'),
    tile('light', 'light.path_lights', { name: 'Path Lights' }, 'sm'),
    tile('light', 'light.landscape_1', { name: 'Landscape' }, 'sm'),
    tile('light', 'light.garage_lights', { name: 'Garage Lights' }, 'sm'),
    tile('media_player', 'media_player.patio_speaker', {
        name: 'Patio Speaker',
        show_artwork: false,
        show_volume: true,
        media_controls: ['play', 'previous', 'next']
    }, 'lg'),
    tile('cover', 'cover.back_patio_door', { name: 'Patio Door' }, 'md'),
    tile('cover', 'cover.sunroof_skylight', { name: 'Skylight', show_position_slider: true }, 'md'),
]);

const outdoorPool = sec('Pool & Spa', 'waves', [
    tile('entity', 'switch.pool_pump', {
        name: 'Pool Pump',
        icon: 'pump',
        state_on_label: 'Running',
        state_off_label: 'Off'
    }, 'md'),
    tile('entity', 'switch.pool_heater', {
        name: 'Pool Heater',
        icon: 'flame'
    }, 'md'),
    tile('entity', 'switch.hot_tub', {
        name: 'Hot Tub Jets',
        icon: 'waves'
    }, 'md'),
    tile('slider', 'number.pool_target_temp', {
        name: 'Pool Target Temp',
        slider_min: 60,
        slider_max: 104,
        slider_step: 1
    }, 'lg'),
    tile('slider', 'number.hot_tub_temp', {
        name: 'Hot Tub Target',
        slider_min: 60,
        slider_max: 104,
        slider_step: 1
    }, 'lg'),
    // Pool sensors
    tile('gauge', 'sensor.pool_temp', {
        name: 'Pool Temperature',
        min: 60,
        max: 100,
        gauge_needle: false,
        gauge_segments: [
            { from: 60, color: '#60a5fa', label: 'Cold' },
            { from: 75, color: '#22c55e', label: 'Perfect' },
            { from: 86, color: '#f97316', label: 'Warm' },
            { from: 92, color: '#ef4444', label: 'Hot' },
        ]
    }, 'lg'),
    tile('entity', 'sensor.pool_ph', { name: 'pH Level' }, 'sm'),
    tile('entity', 'sensor.pool_chlorine', { name: 'Chlorine' }, 'sm'),
    tile('light', 'light.pool_led', { name: 'Pool LED', show_color_picker: true }, 'md'),
]);

const outdoorGarage = sec('Garage & Grounds', 'car', [
    tile('cover', 'cover.garage_door', {
        name: 'Garage Door',
        show_position_slider: false
    }, 'lg'),
    tile('entity', 'switch.ev_charger', {
        name: 'EV Charger',
        icon: 'zap',
        state_on_label: 'Charging',
        state_off_label: 'Standby'
    }, 'md'),
    tile('entity', 'sensor.ev_charger_power', {
        name: 'Charging Power',
        show_graph: true, graph_type: 'line', graph_hours: 4
    }, 'md'),
    tile('entity', 'switch.driveway_heater', { name: 'Driveway Heater', icon: 'thermometer' }, 'sm'),
    tile('vacuum', 'vacuum.main_floor', {
        name: 'Roomba — Main Floor',
        show_vacuum_fan_speed: true
    }, 'lg'),
    tile('lawn_mower', 'lawn_mower.husqvarna', {
        name: 'Husqvarna Automower',
        show_mower_battery: true,
        show_mower_status: true
    }, 'lg'),
]);

const outdoorIrrigation = sec('Irrigation', 'sprout', [
    tile('entity', 'switch.sprinkler_front', {
        name: 'Front Lawn',
        icon: 'sprinkler'
    }, 'sm'),
    tile('entity', 'switch.sprinkler_back', {
        name: 'Back Lawn',
        icon: 'sprinkler'
    }, 'sm'),
    tile('entity', 'switch.sprinkler_garden', {
        name: 'Garden Drip',
        icon: 'flower'
    }, 'sm'),
    tile('slider', 'number.sprinkler_duration', {
        name: 'Run Duration',
        slider_min: 1,
        slider_max: 60,
        slider_step: 5
    }, 'lg'),
    tile('timer', 'timer.sprinkler_zone_1', {
        name: 'Front Lawn Timer',
        timer_show_progress_ring: true,
        timer_show_controls: true
    }, 'lg'),
    tile('entity', 'sensor.water_usage_today', {
        name: 'Water Today',
        show_graph: true, graph_type: 'bar', graph_hours: 24
    }, 'md'),
]);

const energyStats = sec('Energy Overview', 'zap', [
    // Main energy flow tile
    tile('energy', undefined, {
        grid_entity: 'sensor.grid_power',
        solar_entity: 'sensor.solar_power',
        battery_entity: 'sensor.battery_soc'
    }, 'lg'),
    // Battery gauge
    tile('gauge', 'sensor.battery_soc', {
        name: 'Battery Level',
        min: 0,
        max: 100,
        gauge_needle: false,
        gauge_segments: [
            { from: 0, color: '#ef4444', label: 'Critical' },
            { from: 20, color: '#f97316', label: 'Low' },
            { from: 40, color: '#eab308', label: 'Fair' },
            { from: 70, color: '#22c55e', label: 'Good' },
            { from: 90, color: '#3b82f6', label: 'Full' },
        ]
    }, 'md'),
    // Daily statistics
    tile('statistic', 'sensor.daily_energy_consumed', {
        name: 'Grid Used Today',
        statistic_period: 'day',
        statistic_type: 'sum',
        statistic_show_chart: true
    }, 'lg'),
    tile('statistic', 'sensor.daily_solar_generated', {
        name: 'Solar Today',
        statistic_period: 'day',
        statistic_type: 'sum',
        statistic_show_chart: true
    }, 'lg'),
    // Quick sensors
    tile('entity', 'sensor.grid_power', { name: 'Grid Draw', show_graph: true, graph_type: 'line' }, 'md'),
    tile('entity', 'sensor.solar_power', { name: 'Solar Output', show_graph: true, graph_type: 'line' }, 'md'),
    tile('entity', 'sensor.energy_cost_today', { name: 'Cost Today' }, 'sm'),
]);

const systemUpdates = sec('Network & System', 'server', [
    // Network sensors
    tile('entity', 'sensor.internet_download', {
        name: 'Download',
        show_graph: true, graph_type: 'line', graph_hours: 2
    }, 'md'),
    tile('entity', 'sensor.internet_upload', {
        name: 'Upload',
        show_graph: true, graph_type: 'line', graph_hours: 2
    }, 'md'),
    tile('entity', 'sensor.nas_disk_usage', { name: 'NAS Storage' }, 'md'),
    tile('entity', 'sensor.nas_cpu_temp', { name: 'NAS Temp' }, 'sm'),
    tile('entity', 'sensor.pi_hole_blocked', { name: 'Ads Blocked', show_graph: true, graph_type: 'bar' }, 'md'),
    tile('entity', 'sensor.ha_cpu_usage', { name: 'HA CPU', show_graph: true, graph_type: 'line' }, 'sm'),
    tile('entity', 'sensor.ha_memory_usage', { name: 'HA Memory', show_graph: true, graph_type: 'line' }, 'sm'),
    // Update tiles
    tile('update', 'update.home_assistant_core', {
        name: 'HA Core',
        update_show_version: true,
        update_show_install_button: true,
        update_confirm_install: true
    }, 'lg'),
    tile('update', 'update.eero_firmware', {
        name: 'eero Router',
        update_show_version: true,
        update_show_install_button: true
    }, 'lg'),
    tile('update', 'update.nest_thermostat', {
        name: 'Nest Thermostat',
        update_show_version: true,
        update_show_install_button: true
    }, 'lg'),
    tile('update', 'update.home_assistant_os', {
        name: 'HA OS',
        update_show_version: true
    }, 'md'),
    tile('update', 'update.lutron_bridge', {
        name: 'Lutron Bridge',
        update_show_version: true
    }, 'md'),
    tile('update', 'update.ring_doorbell', {
        name: 'Ring Doorbell',
        update_show_version: true
    }, 'md'),
    // Water heater tucked into utilities section
    tile('water_heater', 'water_heater.main', {
        name: 'Water Heater',
        show_water_heater_temp: true,
        show_water_heater_mode: true
    }, 'lg'),
    tile('entity', 'sensor.water_usage_today', { name: 'Water Today', show_graph: true, graph_type: 'bar' }, 'md'),
    tile('entity', 'binary_sensor.water_leak_basement', { name: 'Basement Leak' }, 'sm'),
    tile('entity', 'binary_sensor.water_leak_laundry', { name: 'Laundry Leak' }, 'sm'),
]);

const outdoorPage: Page = {
    id: uid(), name: 'Outdoor', icon: 'trees', layout: 'default', adminOnly: false,
    background: { type: 'none' }, navVisibility: { ...VISIBLE_ALL },
    sections: [outdoorPatio, outdoorPool, outdoorGarage, outdoorIrrigation, energyStats, systemUpdates],
    transition: 'fade'
};


// ═══════════════════════════════════════════════════════════════════════════════
// ROOT CONFIG EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function demoDashboardConfig(): DashboardConfig {
    _id = 0;
    const base = defaultConfig();
    return {
        ...base,
        nav: {
            ...base.nav,
            headerTitle: 'Maple House',
            headerIcon: 'home',
            showHeader: false,
            position: 'left',
            style: 'default',
            showLabels: true
        },
        display: {
            ...base.display,
            defaultPageId: homePage.id,
            swipeNavigation: true
        },
        pages: [
            homePage,
            livingRoomPage,
            kitchenPage,
            bedroomsPage,
            officePage,
            securityPage,
            outdoorPage
        ]
    };
}
