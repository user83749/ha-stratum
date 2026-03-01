import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.ADDON === 'true' ? '/data' : join(process.cwd(), 'data');
const CONFIG_PATH = join(DATA_DIR, 'dashboard.json');

const DEFAULT_CONFIG = {
    version: 5,
    settings: {
        locale: 'en',
        timeFormat: '12h',
        unitSystem: 'auto',
        temperatureUnit: 'auto',
        numberFormat: 'dot',
        firstDayOfWeek: 1,
        currency: 'USD',
        reducedMotion: false
    },
    theme: {
        themeId: 'antigravity-prime',
        radius: 'lg',
        font: { family: 'Inter', size: 'md' },
        dense: false,
        animations: true
    },
    nav: {
        position: 'left',
        style: 'default',
        iconSize: 'md',
        showLabels: true,
        showLabelsOnMobile: false,
        showHeader: false,
        showConnectionStatus: true,
        mobileBreakpoint: 768,
        mobileStyle: 'bottom-bar',
        order: [],
        extras: [],
        badges: []
    },
    header: {
        visible: true,
        height: 56,
        showPageTitle: false,
        showSearch: true,
        showEditButton: true,
        showSettingsButton: true,
        showNotifications: true,
        quickActions: []
    },
    display: {
        swipeNavigation: true,
        swipeThreshold: 50,
        pageTransition: { type: 'fade', duration: 200 },
        timeBasedPages: [],
        themeSchedule: { enabled: false, mode: 'sun', dayPresetId: 'snow', nightPresetId: 'midnight' },
        kiosk: { enabled: false, hideNav: true, hideHeader: true, hideFab: true, allowSwipeNav: true },
        screensaver: { enabled: false, idleTimeout: 300, type: 'dim', dimOpacity: 0.3, showClock: true, clockFormat: '12h' }
    },
    tileDefaults: {
        tap_action: { type: 'toggle' },
        hold_action: { type: 'more-info' },
        double_tap_action: { type: 'more-info' },
        show_name: true,
        show_icon: true,
        show_state: true,
        show_last_changed: false,
        historyHours: 24,
        cameraRefreshInterval: 10
    },
    edit: { confirmDelete: true, autoSave: true },
    media: {},
    energy: { enabled: false },
    dialog: { moreInfoStyle: 'modal', drawerSide: 'right', showRelatedEntities: true },
    favorites: { entityIds: [], showInHeader: false, showInNav: false },
    weather: { temperatureUnit: 'auto', windSpeedUnit: 'auto', precipitationUnit: 'auto', showForecast: true, forecastDays: 5 },
    search: { enabled: true, hotkey: 'k', includeEntities: true, includePages: true, includeScripts: true, includeScenes: true, includeAutomations: true },
    notifications: { enabled: true, showPersistent: true, showAlerts: true, sound: false, position: 'bottom-right', duration: 5000 },
    resources: {},
    pages: [{
        id: 'home',
        name: 'Home',
        icon: 'house',
        layout: 'default',
        background: { type: 'none' },
        navVisibility: { sm: true, md: true, lg: true },
        adminOnly: false,
        sections: [{
            id: 'main',
            role: 'main',
            grid: { baseSize: 160, gap: 8 },
            collapsible: false,
            collapsed: false,
            visibility: { sm: true, md: true, lg: true },
            tiles: []
        }]
    }],
    profiles: []
};

console.log('--- RESTARTING DASHBOARD CONFIG ---');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
console.log(`Success: Default config written to ${CONFIG_PATH}`);
console.log('The "merged demo" is now gone. Refresh your browser.');
