import type { HassEntities } from 'home-assistant-js-websocket';

const PAST = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000).toISOString();

function entity(
    entity_id: string,
    state: string,
    friendly_name: string,
    attributes: Record<string, unknown> = {}
) {
    return {
        entity_id,
        state,
        attributes: { friendly_name, ...attributes },
        last_changed: PAST(Math.floor(Math.random() * 60)),
        last_updated: PAST(Math.floor(Math.random() * 5)),
        context: { id: entity_id, parent_id: null, user_id: null }
    };
}

export const DEMO_ENTITIES: HassEntities = {

    // ── WEATHER ───────────────────────────────────────────────────────────────
    'weather.home': entity('weather.home', 'partlycloudy', 'Home Weather', {
        temperature: 72,
        humidity: 51,
        pressure: 1015,
        wind_speed: 9,
        wind_bearing: 220,
        visibility: 10,
        uv_index: 4,
        dew_point: 55,
        temperature_unit: '°F',
        precipitation_unit: 'in',
        forecast: [
            { datetime: PAST(-1440), condition: 'sunny', temperature: 78, templow: 61 },
            { datetime: PAST(-2880), condition: 'partlycloudy', temperature: 74, templow: 59 },
            { datetime: PAST(-4320), condition: 'cloudy', temperature: 69, templow: 57 },
            { datetime: PAST(-5760), condition: 'rainy', temperature: 65, templow: 55 },
            { datetime: PAST(-7200), condition: 'sunny', temperature: 76, templow: 60 },
            { datetime: PAST(-8640), condition: 'partlycloudy', temperature: 73, templow: 58 },
            { datetime: PAST(-10080), condition: 'sunny', temperature: 80, templow: 62 },
        ],
    }),

    // ── PEOPLE ────────────────────────────────────────────────────────────────
    'person.alex': entity('person.alex', 'home', 'Alex', {
        entity_picture: 'https://i.pravatar.cc/150?u=alex',
        latitude: 37.4219983,
        longitude: -122.084,
        source: 'device_tracker.alex_iphone'
    }),
    'person.riley': entity('person.riley', 'Work', 'Riley', {
        entity_picture: 'https://i.pravatar.cc/150?u=riley',
        source: 'device_tracker.riley_pixel'
    }),
    'person.jamie': entity('person.jamie', 'not_home', 'Jamie', {
        entity_picture: 'https://i.pravatar.cc/150?u=jamie',
        source: 'device_tracker.jamie_watch'
    }),

    // ── CLIMATE ───────────────────────────────────────────────────────────────
    'climate.living_room': entity('climate.living_room', 'cool', 'Living Room AC', {
        current_temperature: 74,
        temperature: 71,
        hvac_modes: ['off', 'heat', 'cool', 'auto', 'fan_only'],
        hvac_action: 'cooling',
        preset_mode: 'none',
        preset_modes: ['none', 'eco', 'comfort', 'boost'],
        fan_mode: 'auto',
        fan_modes: ['auto', 'low', 'medium', 'high'],
        current_humidity: 49,
        min_temp: 60,
        max_temp: 86
    }),
    'climate.master_bedroom': entity('climate.master_bedroom', 'heat', 'Master Bedroom AC', {
        current_temperature: 68,
        temperature: 70,
        hvac_modes: ['off', 'heat', 'cool', 'auto'],
        hvac_action: 'heating',
        preset_mode: 'sleep',
        preset_modes: ['none', 'eco', 'sleep', 'comfort'],
        fan_mode: 'low',
        fan_modes: ['auto', 'low', 'medium', 'high'],
        current_humidity: 44,
        min_temp: 60,
        max_temp: 86
    }),
    'climate.home_office': entity('climate.home_office', 'cool', 'Office AC', {
        current_temperature: 76,
        temperature: 72,
        hvac_modes: ['off', 'heat', 'cool', 'auto'],
        hvac_action: 'cooling',
        preset_mode: 'eco',
        preset_modes: ['none', 'eco', 'comfort'],
        fan_mode: 'auto',
        fan_modes: ['auto', 'low', 'medium', 'high'],
        current_humidity: 47,
        min_temp: 60,
        max_temp: 86
    }),
    'climate.kids_room': entity('climate.kids_room', 'off', "Kids Room AC", {
        current_temperature: 71,
        temperature: 72,
        hvac_modes: ['off', 'heat', 'cool', 'auto'],
        hvac_action: 'idle',
        preset_mode: 'none',
        preset_modes: ['none', 'eco', 'sleep'],
        fan_mode: 'auto',
        fan_modes: ['auto', 'low', 'medium', 'high'],
        current_humidity: 46,
        min_temp: 60,
        max_temp: 86
    }),
    'climate.guest_bedroom': entity('climate.guest_bedroom', 'off', 'Guest Bedroom AC', {
        current_temperature: 70,
        temperature: 70,
        hvac_modes: ['off', 'heat', 'cool', 'auto'],
        hvac_action: 'idle',
        preset_mode: 'none',
        preset_modes: ['none', 'eco', 'comfort'],
        current_humidity: 45,
        min_temp: 60,
        max_temp: 86
    }),

    // ── LIGHTING — Living Room ─────────────────────────────────────────────────
    'light.living_room_ceiling': entity('light.living_room_ceiling', 'on', 'Ceiling Lights', {
        brightness: 204, color_temp: 370, supported_color_modes: ['color_temp'], color_mode: 'color_temp',
        min_color_temp_kelvin: 2700, max_color_temp_kelvin: 6500
    }),
    'light.living_room_floor_lamp': entity('light.living_room_floor_lamp', 'on', 'Floor Lamp', {
        brightness: 128, rgb_color: [255, 200, 100], supported_color_modes: ['hs', 'color_temp'], color_mode: 'hs'
    }),
    'light.tv_backlight': entity('light.tv_backlight', 'on', 'TV Backlight', {
        brightness: 80, rgb_color: [30, 100, 255], supported_color_modes: ['hs', 'rgb'], color_mode: 'hs'
    }),
    'light.bookshelf_led': entity('light.bookshelf_led', 'off', 'Bookshelf LED', {
        brightness: 100, rgb_color: [255, 60, 200], supported_color_modes: ['hs'], color_mode: 'hs'
    }),

    // ── LIGHTING — Kitchen & Dining ────────────────────────────────────────────
    'light.kitchen_overhead': entity('light.kitchen_overhead', 'on', 'Kitchen Overhead', {
        brightness: 255, color_temp: 250, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.kitchen_under_cabinet': entity('light.kitchen_under_cabinet', 'off', 'Under Cabinet', {
        brightness: 160, rgb_color: [255, 160, 40], supported_color_modes: ['hs'], color_mode: 'hs'
    }),
    'light.dining_pendant': entity('light.dining_pendant', 'on', 'Dining Pendant', {
        brightness: 180, color_temp: 340, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),

    // ── LIGHTING — Master Bedroom ──────────────────────────────────────────────
    'light.master_headboard': entity('light.master_headboard', 'off', 'Headboard Strip', {
        brightness: 60, rgb_color: [180, 80, 255], supported_color_modes: ['hs', 'color_temp'], color_mode: 'color_temp'
    }),
    'light.master_ceiling': entity('light.master_ceiling', 'off', 'Ceiling Fan Light', {
        brightness: 180, color_temp: 400, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.master_nightstand_left': entity('light.master_nightstand_left', 'off', 'Left Nightstand', {
        brightness: 50, color_temp: 450, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.master_nightstand_right': entity('light.master_nightstand_right', 'on', 'Right Nightstand', {
        brightness: 40, color_temp: 450, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),

    // ── LIGHTING — Office ──────────────────────────────────────────────────────
    'light.office_desk_lamp': entity('light.office_desk_lamp', 'on', 'Desk Lamp', {
        brightness: 210, color_temp: 200, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.office_overhead': entity('light.office_overhead', 'on', 'Office Overhead', {
        brightness: 230, color_temp: 220, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.office_bias_lighting': entity('light.office_bias_lighting', 'on', 'Bias Lighting', {
        brightness: 120, rgb_color: [0, 200, 255], supported_color_modes: ['hs'], color_mode: 'hs'
    }),

    // ── LIGHTING — Hallway & Entry ─────────────────────────────────────────────
    'light.entryway': entity('light.entryway', 'on', 'Entryway', {
        brightness: 150, color_temp: 380, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.hallway_main': entity('light.hallway_main', 'off', 'Main Hallway', {
        brightness: 100, color_temp: 400, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.hallway_upstairs': entity('light.hallway_upstairs', 'off', 'Upstairs Hall', {
        brightness: 100, color_temp: 400, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.staircase_step': entity('light.staircase_step', 'on', 'Staircase Steps', {
        brightness: 80, rgb_color: [255, 180, 50], supported_color_modes: ['hs'], color_mode: 'hs'
    }),

    // ── LIGHTING — Bathrooms ───────────────────────────────────────────────────
    'light.master_bath': entity('light.master_bath', 'off', 'Master Bath', {
        brightness: 255, color_temp: 250, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.guest_bath': entity('light.guest_bath', 'off', 'Guest Bath', {
        brightness: 255, color_temp: 250, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.powder_room': entity('light.powder_room', 'off', 'Powder Room', {
        brightness: 200, color_temp: 300, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),

    // ── LIGHTING — Kids & Guest ────────────────────────────────────────────────
    'light.kids_ceiling': entity('light.kids_ceiling', 'off', "Kids Ceiling", {
        brightness: 180, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.kids_nightlight': entity('light.kids_nightlight', 'on', "Kids Nightlight", {
        brightness: 30, rgb_color: [255, 200, 220], supported_color_modes: ['hs'], color_mode: 'hs'
    }),
    'light.guest_bedroom': entity('light.guest_bedroom', 'off', 'Guest Bedroom', {
        brightness: 180, color_temp: 380, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),

    // ── LIGHTING — Exterior ────────────────────────────────────────────────────
    'light.front_porch': entity('light.front_porch', 'off', 'Front Porch', {
        brightness: 255, color_temp: 380, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.back_porch': entity('light.back_porch', 'on', 'Back Porch', {
        brightness: 180, rgb_color: [255, 140, 30], supported_color_modes: ['hs', 'color_temp'], color_mode: 'hs'
    }),
    'light.garage_lights': entity('light.garage_lights', 'off', 'Garage Lights', {
        brightness: 255, color_temp: 400, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.path_lights': entity('light.path_lights', 'on', 'Pathway Lights', {
        brightness: 140, color_temp: 360, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),
    'light.pool_led': entity('light.pool_led', 'on', 'Pool LED', {
        brightness: 200, rgb_color: [0, 180, 255], supported_color_modes: ['hs'], color_mode: 'hs'
    }),
    'light.landscape_1': entity('light.landscape_1', 'on', 'Front Landscape', {
        brightness: 160, color_temp: 370, supported_color_modes: ['color_temp'], color_mode: 'color_temp'
    }),

    // ── FANS ──────────────────────────────────────────────────────────────────
    'fan.living_room_ceiling': entity('fan.living_room_ceiling', 'on', 'Living Room Fan', {
        percentage: 45,
        oscillating: false,
        preset_modes: ['low', 'medium', 'high', 'auto'],
        preset_mode: 'medium'
    }),
    'fan.master_bedroom_ceiling': entity('fan.master_bedroom_ceiling', 'on', 'Bedroom Fan', {
        percentage: 30,
        oscillating: false,
        preset_modes: ['sleep', 'low', 'medium', 'high'],
        preset_mode: 'sleep'
    }),
    'fan.home_office_desk': entity('fan.home_office_desk', 'off', 'Office Desk Fan', {
        percentage: 0,
        oscillating: true,
        preset_modes: ['low', 'medium', 'high'],
        preset_mode: ''
    }),
    'fan.dining_room_ceiling': entity('fan.dining_room_ceiling', 'off', 'Dining Fan', {
        percentage: 0,
        oscillating: false,
        preset_modes: ['low', 'medium', 'high'],
        preset_mode: ''
    }),
    'fan.whole_house_exhaust': entity('fan.whole_house_exhaust', 'off', 'Whole-House Exhaust', {
        percentage: 0,
        oscillating: false,
        preset_modes: ['low', 'medium', 'high', 'turbo'],
        preset_mode: ''
    }),

    // ── HUMIDIFIER ────────────────────────────────────────────────────────────
    'humidifier.master_bedroom': entity('humidifier.master_bedroom', 'on', 'Bedroom Humidifier', {
        humidity: 45,
        current_humidity: 38,
        min_humidity: 20,
        max_humidity: 80,
        mode: 'sleep',
        available_modes: ['normal', 'auto', 'sleep', 'baby']
    }),
    'humidifier.kids_room': entity('humidifier.kids_room', 'on', "Kids Humidifier", {
        humidity: 50,
        current_humidity: 46,
        min_humidity: 20,
        max_humidity: 80,
        mode: 'baby',
        available_modes: ['normal', 'auto', 'sleep', 'baby']
    }),
    'humidifier.living_room': entity('humidifier.living_room', 'off', 'Living Room Humidifier', {
        humidity: 45,
        current_humidity: 49,
        min_humidity: 20,
        max_humidity: 80,
        mode: 'auto',
        available_modes: ['normal', 'auto', 'sleep']
    }),

    // ── WATER HEATER ──────────────────────────────────────────────────────────
    'water_heater.main': entity('water_heater.main', 'eco', 'Water Heater', {
        current_temperature: 118,
        temperature: 120,
        min_temp: 100,
        max_temp: 140,
        operation_mode: 'eco',
        operation_list: ['eco', 'electric', 'performance', 'high_demand', 'heat_pump', 'off'],
        target_temp_high: 140,
        target_temp_low: 100,
        temperature_unit: '°F'
    }),

    // ── SIREN ─────────────────────────────────────────────────────────────────
    'siren.outdoor_alarm': entity('siren.outdoor_alarm', 'off', 'Outdoor Siren', {
        available_tones: ['fire', 'intrusion', 'alarm', 'doorbell'],
        tone: 'alarm'
    }),

    // ── MEDIA PLAYERS ─────────────────────────────────────────────────────────
    'media_player.living_room_tv': entity('media_player.living_room_tv', 'playing', 'Living Room TV', {
        media_title: 'The Last of Us',
        media_artist: 'HBO Max',
        media_content_type: 'tvshow',
        volume_level: 0.38,
        is_volume_muted: false,
        source: 'HBO Max',
        source_list: ['HBO Max', 'Netflix', 'YouTube', 'Apple TV', 'Gaming', 'HDMI 1', 'HDMI 2'],
        device_class: 'tv',
        supported_features: 21389,
        entity_picture: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop'
    }),
    'media_player.kitchen_display': entity('media_player.kitchen_display', 'playing', 'Kitchen Echo Show', {
        media_title: 'Morning Mix',
        media_artist: 'Spotify',
        media_content_type: 'music',
        volume_level: 0.25,
        is_volume_muted: false,
        source: 'Spotify',
        source_list: ['Spotify', 'Amazon Music', 'iHeartRadio', 'TuneIn'],
        supported_features: 65000,
        entity_picture: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop'
    }),
    'media_player.bedroom_speaker': entity('media_player.bedroom_speaker', 'idle', 'Bedroom Speaker', {
        volume_level: 0.2,
        is_volume_muted: false,
        source_list: ['Spotify', 'Sleep Sounds', 'Radio', 'Line In'],
        supported_features: 65000,
    }),
    'media_player.office_monitor': entity('media_player.office_monitor', 'playing', 'Office Sonos Era', {
        media_title: 'Focus Flow',
        media_artist: 'Apple Music',
        volume_level: 0.15,
        is_volume_muted: false,
        source: 'Apple Music',
        source_list: ['Apple Music', 'Spotify', 'Radio Paradise', 'Airport Utility'],
        supported_features: 65000,
        entity_picture: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?q=80&w=400&auto=format&fit=crop'
    }),
    'media_player.patio_speaker': entity('media_player.patio_speaker', 'off', 'Patio Speaker', {
        volume_level: 0.4,
        is_volume_muted: false,
        source_list: ['Spotify', 'Pandora', 'Bluetooth'],
        supported_features: 65000,
    }),
    'media_player.kids_room_speaker': entity('media_player.kids_room_speaker', 'paused', 'Kids Room Echo', {
        media_title: 'Kidz Bop 2025',
        media_artist: 'Kidz Bop',
        volume_level: 0.30,
        is_volume_muted: false,
        source: 'Amazon Music',
        supported_features: 65000,
    }),

    // ── REMOTE ────────────────────────────────────────────────────────────────
    'remote.living_room_hub': entity('remote.living_room_hub', 'on', 'Living Room Hub', {
        current_activity: 'Watch TV',
        activity_list: ['Watch TV', 'Watch Movies', 'Gaming', 'Listen Music', 'PowerOff']
    }),
    'remote.bedroom_tv': entity('remote.bedroom_tv', 'off', 'Bedroom TV Remote', {
        current_activity: 'PowerOff',
        activity_list: ['Watch TV', 'Watch Movies', 'Sleep Timer']
    }),

    // ── COVERS / BLINDS ───────────────────────────────────────────────────────
    'cover.living_room_blinds': entity('cover.living_room_blinds', 'open', 'Living Room Blinds', {
        current_position: 85,
        device_class: 'blind',
        supported_features: 7
    }),
    'cover.living_room_curtains': entity('cover.living_room_curtains', 'open', 'Living Room Curtains', {
        current_position: 100,
        device_class: 'curtain',
        supported_features: 7
    }),
    'cover.master_bedroom_shades': entity('cover.master_bedroom_shades', 'closed', 'Bedroom Blackout', {
        current_position: 0,
        device_class: 'shade',
        supported_features: 7
    }),
    'cover.office_blinds': entity('cover.office_blinds', 'open', 'Office Blinds', {
        current_position: 50,
        device_class: 'blind',
        supported_features: 7
    }),
    'cover.dining_room_blinds': entity('cover.dining_room_blinds', 'open', 'Dining Blinds', {
        current_position: 70,
        device_class: 'blind',
        supported_features: 7
    }),
    'cover.garage_door': entity('cover.garage_door', 'closed', 'Garage Door', {
        current_position: 0,
        device_class: 'garage',
        supported_features: 3
    }),
    'cover.back_patio_door': entity('cover.back_patio_door', 'open', 'Patio Door', {
        current_position: 100,
        device_class: 'door',
        supported_features: 3
    }),
    'cover.sunroof_skylight': entity('cover.sunroof_skylight', 'closed', 'Skylight', {
        current_position: 0,
        device_class: 'window',
        supported_features: 7
    }),

    // ── LOCKS ─────────────────────────────────────────────────────────────────
    'lock.front_door': entity('lock.front_door', 'locked', 'Front Door', {
        device_class: 'lock',
        changed_by: 'Alex',
        code_format: 'number'
    }),
    'lock.back_door': entity('lock.back_door', 'locked', 'Back Door', {
        device_class: 'lock',
        changed_by: 'Keypad'
    }),
    'lock.garage_side': entity('lock.garage_side', 'unlocked', 'Garage Side Door', {
        device_class: 'lock'
    }),

    // ── SECURITY ──────────────────────────────────────────────────────────────
    'alarm_control_panel.home': entity('alarm_control_panel.home', 'armed_home', 'Home Alarm', {
        supported_features: 63,
        code_format: 'number',
        changed_by: 'Alex'
    }),
    'binary_sensor.front_door_contact': entity('binary_sensor.front_door_contact', 'off', 'Front Door', {
        device_class: 'door'
    }),
    'binary_sensor.back_door_contact': entity('binary_sensor.back_door_contact', 'off', 'Back Door', {
        device_class: 'door'
    }),
    'binary_sensor.garage_motion': entity('binary_sensor.garage_motion', 'off', 'Garage Motion', {
        device_class: 'motion'
    }),
    'binary_sensor.front_yard_motion': entity('binary_sensor.front_yard_motion', 'off', 'Front Yard Motion', {
        device_class: 'motion'
    }),
    'binary_sensor.doorbell': entity('binary_sensor.doorbell', 'off', 'Doorbell', {
        device_class: 'sound'
    }),
    'binary_sensor.smoke_kitchen': entity('binary_sensor.smoke_kitchen', 'off', 'Kitchen Smoke', {
        device_class: 'smoke'
    }),
    'binary_sensor.co_detector': entity('binary_sensor.co_detector', 'off', 'CO Detector', {
        device_class: 'carbon_monoxide'
    }),
    'binary_sensor.window_master': entity('binary_sensor.window_master', 'off', 'Master Window', {
        device_class: 'window'
    }),
    'binary_sensor.window_office': entity('binary_sensor.window_office', 'on', 'Office Window', {
        device_class: 'window'
    }),

    // ── CAMERAS ───────────────────────────────────────────────────────────────
    'camera.front_door': entity('camera.front_door', 'idle', 'Front Door Cam', {
        entity_picture: 'https://images.unsplash.com/photo-1560520653-5777839fd4a7?q=80&w=1200&auto=format&fit=crop'
    }),
    'camera.backyard': entity('camera.backyard', 'idle', 'Backyard Cam', {
        entity_picture: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200&auto=format&fit=crop'
    }),
    'camera.garage': entity('camera.garage', 'idle', 'Garage Cam', {
        entity_picture: 'https://images.unsplash.com/photo-1558004238-5ca3d9ad9e67?q=80&w=1200&auto=format&fit=crop'
    }),
    'camera.driveway': entity('camera.driveway', 'idle', 'Driveway Cam', {
        entity_picture: 'https://images.unsplash.com/photo-1546630392-db5b1f04874a?q=80&w=1200&auto=format&fit=crop'
    }),

    // ── SENSORS — ENVIRONMENT ─────────────────────────────────────────────────
    'sensor.living_room_temp': entity('sensor.living_room_temp', '74.2', 'Living Room Temp', {
        unit_of_measurement: '°F', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.living_room_humidity': entity('sensor.living_room_humidity', '49', 'Living Room Humidity', {
        unit_of_measurement: '%', device_class: 'humidity', state_class: 'measurement'
    }),
    'sensor.master_bedroom_temp': entity('sensor.master_bedroom_temp', '68.5', 'Bedroom Temp', {
        unit_of_measurement: '°F', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.office_co2': entity('sensor.office_co2', '610', 'Office CO₂', {
        unit_of_measurement: 'ppm', device_class: 'carbon_dioxide', state_class: 'measurement'
    }),
    'sensor.office_temp': entity('sensor.office_temp', '76.1', 'Office Temp', {
        unit_of_measurement: '°F', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.outdoor_air_quality': entity('sensor.outdoor_air_quality', '28', 'Outdoor AQI', {
        unit_of_measurement: 'µg/m³', device_class: 'pm25', state_class: 'measurement'
    }),
    'sensor.outdoor_temp': entity('sensor.outdoor_temp', '72', 'Outdoor Temp', {
        unit_of_measurement: '°F', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.outdoor_uv': entity('sensor.outdoor_uv', '4', 'UV Index', {
        unit_of_measurement: '', state_class: 'measurement'
    }),
    'sensor.pool_temp': entity('sensor.pool_temp', '81', 'Pool Temp', {
        unit_of_measurement: '°F', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.pool_ph': entity('sensor.pool_ph', '7.4', 'Pool pH', {
        unit_of_measurement: 'pH', state_class: 'measurement'
    }),
    'sensor.pool_chlorine': entity('sensor.pool_chlorine', '2.1', 'Pool Chlorine', {
        unit_of_measurement: 'ppm', state_class: 'measurement'
    }),

    // ── SENSORS — ENERGY ──────────────────────────────────────────────────────
    'sensor.grid_power': entity('sensor.grid_power', '3240', 'Grid Power', {
        unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement'
    }),
    'sensor.solar_power': entity('sensor.solar_power', '5180', 'Solar Production', {
        unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement'
    }),
    'sensor.battery_soc': entity('sensor.battery_soc', '78', 'Battery Charge', {
        unit_of_measurement: '%', device_class: 'battery', state_class: 'measurement'
    }),
    'sensor.daily_energy_consumed': entity('sensor.daily_energy_consumed', '18.4', 'Energy Used Today', {
        unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing'
    }),
    'sensor.daily_solar_generated': entity('sensor.daily_solar_generated', '24.7', 'Solar Today', {
        unit_of_measurement: 'kWh', device_class: 'energy', state_class: 'total_increasing'
    }),
    'sensor.energy_cost_today': entity('sensor.energy_cost_today', '3.12', 'Energy Cost Today', {
        unit_of_measurement: 'USD', state_class: 'total_increasing'
    }),
    'sensor.ev_charger_power': entity('sensor.ev_charger_power', '7200', 'EV Charger', {
        unit_of_measurement: 'W', device_class: 'power', state_class: 'measurement'
    }),

    // ── SENSORS — NETWORK & SYSTEM ────────────────────────────────────────────
    'sensor.internet_download': entity('sensor.internet_download', '945', 'Download Speed', {
        unit_of_measurement: 'Mbps', state_class: 'measurement'
    }),
    'sensor.internet_upload': entity('sensor.internet_upload', '940', 'Upload Speed', {
        unit_of_measurement: 'Mbps', state_class: 'measurement'
    }),
    'sensor.nas_disk_usage': entity('sensor.nas_disk_usage', '68', 'NAS Disk Usage', {
        unit_of_measurement: '%', state_class: 'measurement'
    }),
    'sensor.nas_cpu_temp': entity('sensor.nas_cpu_temp', '52', 'NAS CPU Temp', {
        unit_of_measurement: '°C', device_class: 'temperature', state_class: 'measurement'
    }),
    'sensor.pi_hole_blocked': entity('sensor.pi_hole_blocked', '23.4', 'Ads Blocked', {
        unit_of_measurement: '%', state_class: 'measurement'
    }),
    'sensor.ha_cpu_usage': entity('sensor.ha_cpu_usage', '8', 'HA CPU', {
        unit_of_measurement: '%', state_class: 'measurement'
    }),
    'sensor.ha_memory_usage': entity('sensor.ha_memory_usage', '34', 'HA Memory', {
        unit_of_measurement: '%', state_class: 'measurement'
    }),

    // ── SENSORS — WATER ───────────────────────────────────────────────────────
    'sensor.water_usage_today': entity('sensor.water_usage_today', '88', 'Water Used Today', {
        unit_of_measurement: 'gal', device_class: 'water', state_class: 'total_increasing'
    }),
    'binary_sensor.water_leak_basement': entity('binary_sensor.water_leak_basement', 'off', 'Basement Leak', {
        device_class: 'moisture'
    }),
    'binary_sensor.water_leak_kitchen': entity('binary_sensor.water_leak_kitchen', 'off', 'Kitchen Leak', {
        device_class: 'moisture'
    }),
    'binary_sensor.water_leak_laundry': entity('binary_sensor.water_leak_laundry', 'off', 'Laundry Leak', {
        device_class: 'moisture'
    }),

    // ── SWITCHES ──────────────────────────────────────────────────────────────
    'switch.sprinkler_front': entity('switch.sprinkler_front', 'off', 'Front Lawn', {
        icon: 'mdi:sprinkler'
    }),
    'switch.sprinkler_back': entity('switch.sprinkler_back', 'off', 'Back Lawn', {
        icon: 'mdi:sprinkler'
    }),
    'switch.sprinkler_garden': entity('switch.sprinkler_garden', 'off', 'Garden Drip', {
        icon: 'mdi:flower'
    }),
    'switch.pool_pump': entity('switch.pool_pump', 'on', 'Pool Pump', {
        icon: 'mdi:pump'
    }),
    'switch.pool_heater': entity('switch.pool_heater', 'off', 'Pool Heater', {
        icon: 'mdi:fire'
    }),
    'switch.hot_tub': entity('switch.hot_tub', 'off', 'Hot Tub Jets', {
        icon: 'mdi:hot-tub'
    }),
    'switch.ev_charger': entity('switch.ev_charger', 'on', 'EV Charger', {
        icon: 'mdi:ev-station'
    }),
    'switch.christmas_lights': entity('switch.christmas_lights', 'off', 'Holiday Lights', {}),
    'switch.driveway_heater': entity('switch.driveway_heater', 'off', 'Driveway Heater', {
        icon: 'mdi:heating-coil'
    }),

    // ── NUMBER / SLIDER INPUTS ────────────────────────────────────────────────
    'number.sprinkler_duration': entity('number.sprinkler_duration', '15', 'Sprinkler Duration', {
        min: 1, max: 60, step: 5, unit_of_measurement: 'min', mode: 'slider'
    }),
    'number.pool_target_temp': entity('number.pool_target_temp', '82', 'Pool Target Temp', {
        min: 60, max: 104, step: 1, unit_of_measurement: '°F', mode: 'slider'
    }),
    'number.hot_tub_temp': entity('number.hot_tub_temp', '100', 'Hot Tub Target', {
        min: 60, max: 104, step: 1, unit_of_measurement: '°F', mode: 'slider'
    }),
    'number.living_room_light_schedule': entity('number.living_room_light_schedule', '22', 'Lights Off At', {
        min: 18, max: 24, step: 0.5, unit_of_measurement: 'h', mode: 'slider'
    }),

    // ── INPUT SELECTS ─────────────────────────────────────────────────────────
    'input_select.scene_mode': entity('input_select.scene_mode', 'Relaxing', 'Scene Mode', {
        options: ['Morning', 'Day', 'Relaxing', 'Movie', 'Dinner', 'Sleep', 'Away', 'Party']
    }),
    'input_select.audio_source': entity('input_select.audio_source', 'Spotify', 'Audio Source', {
        options: ['Spotify', 'Apple Music', 'Amazon Music', 'Radio', 'Bluetooth']
    }),
    'input_select.vacation_mode': entity('input_select.vacation_mode', 'Home', 'Home Status', {
        options: ['Home', 'Away', 'Vacation', 'Guest Mode']
    }),

    // ── VACUUM ────────────────────────────────────────────────────────────────
    'vacuum.main_floor': entity('vacuum.main_floor', 'cleaning', 'Roomba 960 — Main', {
        battery_level: 78,
        fan_speed: 'balanced',
        fan_speed_list: ['quiet', 'balanced', 'performance', 'max'],
        status: 'Cleaning'
    }),
    'vacuum.upstairs': entity('vacuum.upstairs', 'docked', 'iRobot — Upstairs', {
        battery_level: 100,
        fan_speed: 'balanced',
        fan_speed_list: ['quiet', 'balanced', 'performance', 'max'],
        status: 'Docked'
    }),

    // ── LAWN MOWER ────────────────────────────────────────────────────────────
    'lawn_mower.husqvarna': entity('lawn_mower.husqvarna', 'docked', 'Husqvarna Automower', {
        battery_level: 92,
        activity: 'docked'
    }),

    // ── UPDATES ───────────────────────────────────────────────────────────────
    'update.home_assistant_core': entity('update.home_assistant_core', 'on', 'Home Assistant Core', {
        installed_version: '2024.12.5',
        latest_version: '2025.1.0',
        in_progress: false,
        auto_update: false,
        title: 'Home Assistant'
    }),
    'update.home_assistant_os': entity('update.home_assistant_os', 'off', 'Home Assistant OS', {
        installed_version: '13.1',
        latest_version: '13.1',
        in_progress: false,
        auto_update: true,
        title: 'HA OS'
    }),
    'update.eero_firmware': entity('update.eero_firmware', 'on', 'eero 6 Pro Router', {
        installed_version: '7.2.0',
        latest_version: '7.3.1',
        in_progress: false,
        auto_update: false,
        title: 'eero'
    }),
    'update.ring_doorbell': entity('update.ring_doorbell', 'off', 'Ring Video Doorbell', {
        installed_version: '3.4.8',
        latest_version: '3.4.8',
        in_progress: false,
        auto_update: true,
        title: 'Ring Doorbell'
    }),
    'update.lutron_bridge': entity('update.lutron_bridge', 'off', 'Lutron Caseta Bridge', {
        installed_version: '8.2.0',
        latest_version: '8.2.0',
        in_progress: false,
        auto_update: true,
        title: 'Lutron Bridge'
    }),
    'update.nest_thermostat': entity('update.nest_thermostat', 'on', 'Nest Thermostat', {
        installed_version: '6.2.1',
        latest_version: '6.3.0',
        in_progress: false,
        auto_update: false,
        title: 'Nest Thermostat'
    }),

    // ── TIMER ─────────────────────────────────────────────────────────────────
    'timer.oven': entity('timer.oven', 'active', 'Oven Timer', {
        duration: '00:45:00',
        remaining: '00:28:44',
        finishes_at: PAST(-28)
    }),
    'timer.laundry': entity('timer.laundry', 'idle', 'Laundry Timer', {
        duration: '01:10:00',
        remaining: '01:10:00'
    }),
    'timer.sprinkler_zone_1': entity('timer.sprinkler_zone_1', 'idle', 'Front Lawn Timer', {
        duration: '00:15:00',
        remaining: '00:00:00'
    }),
    'timer.bedtime_reminder': entity('timer.bedtime_reminder', 'idle', 'Bedtime Reminder', {
        duration: '00:30:00',
        remaining: '00:00:00'
    }),

    // ── TODO ──────────────────────────────────────────────────────────────────
    'todo.grocery_list': entity('todo.grocery_list', '5', 'Grocery List', {
        supported_features: 15
    }),
    'todo.home_tasks': entity('todo.home_tasks', '3', 'Home Tasks', {
        supported_features: 15
    }),
    'todo.shopping': entity('todo.shopping', '7', 'Shopping', {
        supported_features: 15
    }),

    // ── SCENES (shown as button tiles) ───────────────────────────────────────
    'scene.wake_up': entity('scene.wake_up', 'scening', 'Wake Up', {}),
    'scene.leave_home': entity('scene.leave_home', 'scening', 'Leave Home', {}),
    'scene.arrive_home': entity('scene.arrive_home', 'scening', 'Arrive Home', {}),
    'scene.movie_night': entity('scene.movie_night', 'scening', 'Movie Night', {}),
    'scene.dinner_party': entity('scene.dinner_party', 'scening', 'Dinner Party', {}),
    'scene.good_night': entity('scene.good_night', 'scening', 'Good Night', {}),
    'scene.weekend_morning': entity('scene.weekend_morning', 'scening', 'Weekend Morning', {}),
    'scene.work_from_home': entity('scene.work_from_home', 'scening', 'Work From Home', {}),
    'scene.romantic_evening': entity('scene.romantic_evening', 'scening', 'Romantic Evening', {}),
    'scene.party_mode': entity('scene.party_mode', 'scening', 'Party Mode', {}),
    'scene.kids_bedtime': entity('scene.kids_bedtime', 'scening', "Kids Bedtime", {}),
    'scene.all_off': entity('scene.all_off', 'scening', 'All Off', {}),
};
