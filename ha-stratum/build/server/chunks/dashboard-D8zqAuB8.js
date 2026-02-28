const VISIBLE_ALL = { sm: true, md: true, lg: true };
const SCHEMA_VERSION = 5;
const DEFAULT_THEME = {
  themeId: "antigravity-prime",
  radius: "lg",
  font: { family: "Inter", size: "md" },
  dense: false,
  animations: true
};
const DEFAULT_NAV = {
  position: "left",
  style: "default",
  iconSize: "md",
  showLabels: true,
  showLabelsOnMobile: false,
  showHeader: false,
  showConnectionStatus: true,
  mobileBreakpoint: 768,
  mobileStyle: "bottom-bar",
  order: [],
  extras: [],
  badges: []
};
const DEFAULT_HEADER = {
  visible: true,
  height: 56,
  showPageTitle: false,
  showSearch: true,
  showEditButton: true,
  showSettingsButton: true,
  showNotifications: true,
  quickActions: []
};
const DEFAULT_SETTINGS = {
  locale: "en",
  timeFormat: "12h",
  unitSystem: "auto",
  temperatureUnit: "auto",
  numberFormat: "dot",
  firstDayOfWeek: 1,
  currency: "USD",
  reducedMotion: false
};
const DEFAULT_TILE_DEFAULTS = {
  tap_action: { type: "toggle" },
  hold_action: { type: "more-info" },
  double_tap_action: { type: "more-info" },
  show_name: true,
  show_icon: true,
  show_state: true,
  show_last_changed: false,
  historyHours: 24,
  cameraRefreshInterval: 10
};
const DEFAULT_SEARCH = {
  enabled: true,
  hotkey: "k",
  includeEntities: true,
  includePages: true,
  includeScripts: true,
  includeScenes: true,
  includeAutomations: true
};
const DEFAULT_WEATHER = {
  temperatureUnit: "auto",
  windSpeedUnit: "auto",
  precipitationUnit: "auto",
  showForecast: true,
  forecastDays: 5
};
const DEFAULT_SCREENSAVER = {
  enabled: false,
  idleTimeout: 300,
  type: "dim",
  dimOpacity: 0.3,
  showClock: true,
  clockFormat: "12h"
};
const DEFAULT_KIOSK = {
  enabled: false,
  hideNav: true,
  hideHeader: true,
  hideFab: true,
  allowSwipeNav: true
};
const DEFAULT_PAGE_TRANSITION = {
  type: "fade",
  duration: 200
};
const DEFAULT_THEME_SCHEDULE = {
  enabled: false,
  mode: "sun",
  dayPresetId: "snow",
  nightPresetId: "midnight",
  dayStart: "07:00",
  nightStart: "20:00",
  sunEntityId: "sun.sun",
  dayOffset: 0,
  nightOffset: 0
};
const DEFAULT_DISPLAY = {
  swipeNavigation: true,
  swipeThreshold: 50,
  pageTransition: { ...DEFAULT_PAGE_TRANSITION },
  timeBasedPages: [],
  themeSchedule: { ...DEFAULT_THEME_SCHEDULE },
  kiosk: { ...DEFAULT_KIOSK },
  screensaver: { ...DEFAULT_SCREENSAVER }
};
const DEFAULT_NOTIFICATIONS = {
  enabled: true,
  showPersistent: true,
  showAlerts: true,
  sound: false,
  position: "bottom-right",
  duration: 5e3
};
const DEFAULT_EDIT = {
  confirmDelete: true,
  autoSave: true
};
const DEFAULT_MEDIA = {};
const DEFAULT_ENERGY = {
  enabled: false
};
const DEFAULT_DIALOG = {
  moreInfoStyle: "modal",
  drawerSide: "right",
  showRelatedEntities: true
};
const DEFAULT_FAVORITES = {
  entityIds: [],
  showInHeader: false,
  showInNav: false
};
const DEFAULT_SECTION_GRID = {
  baseSize: 160,
  gap: 8
};
function defaultSection(overrides) {
  return {
    id: crypto.randomUUID(),
    role: "main",
    grid: { ...DEFAULT_SECTION_GRID },
    collapsible: false,
    collapsed: false,
    visibility: { ...VISIBLE_ALL },
    tiles: [],
    ...overrides
  };
}
function defaultPage(overrides) {
  return {
    id: crypto.randomUUID(),
    name: "Home",
    icon: "house",
    layout: "default",
    background: { type: "none" },
    navVisibility: { ...VISIBLE_ALL },
    adminOnly: false,
    sections: [defaultSection()],
    ...overrides
  };
}
function defaultConfig() {
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
    profiles: []
  };
}
function migrateConfig(raw) {
  if (!raw || typeof raw !== "object") return defaultConfig();
  const input = raw;
  const rawTheme = input.theme ?? {};
  const rawNav = input.nav ?? {};
  return {
    version: SCHEMA_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      ...input.settings ?? {}
    },
    theme: {
      ...DEFAULT_THEME,
      ...rawTheme,
      font: { ...DEFAULT_THEME.font, ...rawTheme.font ?? {} }
    },
    nav: {
      position: rawNav.position ?? DEFAULT_NAV.position,
      style: rawNav.style ?? DEFAULT_NAV.style,
      iconSize: rawNav.iconSize ?? DEFAULT_NAV.iconSize,
      showLabels: rawNav.showLabels ?? DEFAULT_NAV.showLabels,
      showLabelsOnMobile: rawNav.showLabelsOnMobile ?? DEFAULT_NAV.showLabelsOnMobile,
      showHeader: rawNav.showHeader ?? DEFAULT_NAV.showHeader,
      headerTitle: rawNav.headerTitle ?? DEFAULT_NAV.headerTitle,
      headerIcon: rawNav.headerIcon ?? DEFAULT_NAV.headerIcon,
      showConnectionStatus: rawNav.showConnectionStatus ?? DEFAULT_NAV.showConnectionStatus,
      mobileBreakpoint: rawNav.mobileBreakpoint ?? DEFAULT_NAV.mobileBreakpoint,
      mobileStyle: rawNav.mobileStyle ?? DEFAULT_NAV.mobileStyle,
      order: rawNav.order ?? [],
      extras: rawNav.extras ?? [],
      badges: rawNav.badges ?? []
    },
    header: {
      ...DEFAULT_HEADER,
      ...input.header ?? {},
      quickActions: input.header?.quickActions ?? []
    },
    display: {
      ...DEFAULT_DISPLAY,
      ...input.display ?? {},
      pageTransition: {
        ...DEFAULT_PAGE_TRANSITION,
        ...input.display?.pageTransition ?? {}
      },
      kiosk: { ...DEFAULT_KIOSK, ...input.display?.kiosk ?? {} },
      screensaver: { ...DEFAULT_SCREENSAVER, ...input.display?.screensaver ?? {} },
      themeSchedule: { ...DEFAULT_THEME_SCHEDULE, ...input.display?.themeSchedule ?? {} },
      timeBasedPages: input.display?.timeBasedPages ?? []
    },
    tileDefaults: { ...DEFAULT_TILE_DEFAULTS, ...input.tileDefaults ?? {} },
    edit: { ...DEFAULT_EDIT, ...input.edit ?? {} },
    media: { ...DEFAULT_MEDIA, ...input.media ?? {} },
    energy: { ...DEFAULT_ENERGY, ...input.energy ?? {} },
    dialog: { ...DEFAULT_DIALOG, ...input.dialog ?? {} },
    favorites: { ...DEFAULT_FAVORITES, ...input.favorites ?? {} },
    weather: { ...DEFAULT_WEATHER, ...input.weather ?? {} },
    search: { ...DEFAULT_SEARCH, ...input.search ?? {} },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...input.notifications ?? {} },
    resources: { ...input.resources ?? {} },
    pages: (input.pages ?? [defaultPage()]).map(migratePageV5),
    profiles: input.profiles ?? []
  };
}
function migratePageV5(raw) {
  const p = raw;
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "Page",
    icon: p.icon ?? "house",
    color: p.color,
    layout: p.layout ?? "default",
    background: p.background ?? { type: "none" },
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
function migrateSectionV5(raw) {
  const s = raw;
  const migratedTiles = (s.tiles ?? []).map(migrateTileV5);
  const tiles = migratedTiles.some((tile) => tile.layout) ? migratedTiles : packLegacyTilesForMigration(
    migratedTiles,
    s.grid?.columns && s.grid.columns > 0 ? s.grid.columns : 12
  );
  return {
    id: s.id ?? crypto.randomUUID(),
    title: s.title,
    icon: s.icon,
    role: s.role ?? "main",
    grid: {
      baseSize: s.grid?.baseSize ?? DEFAULT_SECTION_GRID.baseSize,
      gap: s.grid?.gap ?? DEFAULT_SECTION_GRID.gap,
      columns: s.grid?.columns
    },
    padding: s.padding,
    collapsible: s.collapsible ?? false,
    collapsed: s.collapsed ?? false,
    visibility: s.visibility ?? { ...VISIBLE_ALL },
    tiles
  };
}
function migrateTileV5(raw) {
  const t = raw;
  const w = t.size?.w ?? t.grid?.lg?.colSpan ?? 1;
  const h = t.size?.h ?? t.grid?.lg?.rowSpan ?? 1;
  const layout = t.layout ? {
    x: Math.max(0, Math.floor(t.layout.x ?? 0)),
    y: Math.max(0, Math.floor(t.layout.y ?? 0)),
    w: Math.max(1, Math.floor(t.layout.w ?? w)),
    h: Math.max(1, Math.floor(t.layout.h ?? h))
  } : void 0;
  return {
    id: t.id ?? crypto.randomUUID(),
    type: t.type ?? "entity",
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
function inferLegacyPreset(size) {
  if (size.w <= 1 && size.h <= 1) return "sm";
  if (size.w <= 2 && size.h <= 1 || size.w <= 1 && size.h <= 2 || size.w * size.h <= 2) return "md";
  if (size.w * size.h <= 4 || size.w <= 3 && size.h <= 1) return "lg";
  return "xl";
}
function packLegacyTilesForMigration(tiles, cols) {
  const occupied = /* @__PURE__ */ new Set();
  const width = Math.max(1, cols);
  return tiles.map((tile) => {
    const w = Math.max(1, Math.min(tile.size.w, width));
    const h = Math.max(1, tile.size.h);
    let y = 0;
    let placed = null;
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
function canUseCandidate(layout, occupied, cols) {
  if (layout.x + layout.w > cols) return false;
  for (let row = layout.y; row < layout.y + layout.h; row += 1) {
    for (let col = layout.x; col < layout.x + layout.w; col += 1) {
      if (occupied.has(`${col}:${row}`)) return false;
    }
  }
  return true;
}

export { VISIBLE_ALL as V, defaultConfig as d, migrateConfig as m };
//# sourceMappingURL=dashboard-D8zqAuB8.js.map
