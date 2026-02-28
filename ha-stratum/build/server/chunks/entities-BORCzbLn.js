import { B as writable, N as get, L as derived } from './exports-DN21j1G3.js';
import { d as defaultConfig, V as VISIBLE_ALL } from './dashboard-D8zqAuB8.js';

const connection = writable(null);
const connectionStatus = writable("disconnected");
const entities = writable({});
const error = writable(null);
derived(
  entities,
  ($entities) => Object.values($entities).sort((a, b) => a.entity_id.localeCompare(b.entity_id))
);
derived(entities, ($entities) => {
  const domains = /* @__PURE__ */ new Set();
  for (const id of Object.keys($entities)) {
    domains.add(id.split(".")[0]);
  }
  return Array.from(domains).sort();
});
function createConfigStore() {
  const initial = { hassUrl: "", token: "" };
  const { subscribe, set, update } = writable(initial);
  return {
    subscribe,
    set: (value) => {
      set(value);
    },
    update,
    clear: () => {
      set({ hassUrl: "", token: "" });
    },
    isConfigured: () => {
      const { hassUrl, token } = get(configStore);
      return hassUrl.trim().length > 0 && token.trim().length > 0;
    }
  };
}
const configStore = createConfigStore();
const ALL_PRESETS = ["sm", "md", "lg", "xl"];
function isMediumOnlyType(type) {
  return ["clock", "markdown", "image", "iframe", "alarm_panel", "person"].includes(type);
}
function getAllowedPresets(type) {
  if (type === "divider") return ["lg", "xl"];
  if (isMediumOnlyType(type)) return ["md", "lg", "xl"];
  return ALL_PRESETS;
}
function resolvePresetToSpan(type, sizePreset, breakpoint = "lg") {
  const preset = getAllowedPresets(type).includes(sizePreset) ? sizePreset : getAllowedPresets(type)[0];
  let span;
  if (type === "divider") {
    span = preset === "lg" ? { w: 6, h: 1 } : { w: 12, h: 1 };
  } else {
    span = preset === "sm" ? { w: 1, h: 1 } : preset === "md" ? { w: 2, h: 1 } : preset === "lg" ? { w: 3, h: 3 } : { w: 4, h: 3 };
  }
  if (breakpoint === "sm") {
    return { w: Math.min(span.w, 4), h: span.h };
  }
  return span;
}
function inferPresetFromLegacySize(type, size) {
  const w = Math.max(1, size?.w ?? 1);
  const h = Math.max(1, size?.h ?? 1);
  const area = w * h;
  let preset;
  if (w <= 1 && h <= 1) preset = "sm";
  else if (w <= 2 && h <= 1 || w <= 1 && h <= 2 || area <= 2) preset = "md";
  else if (area <= 4 || w <= 3 && h <= 1) preset = "lg";
  else preset = "xl";
  const allowed = getAllowedPresets(type);
  if (allowed.includes(preset)) return preset;
  return allowed[0];
}
const MOBILE_SECTION_COLS = 4;
const DEFAULT_LAYOUT_MAX_COLS = 12;
function getSectionMaxColumns(section) {
  const configured = section.grid.columns && section.grid.columns > 0 ? section.grid.columns : null;
  return configured ?? DEFAULT_LAYOUT_MAX_COLS;
}
function getAdaptiveColumns(sectionWidth, baseSize, gap, maxColumns) {
  if (!sectionWidth) return Math.max(1, Math.min(maxColumns, 1));
  const fitCols = Math.max(1, Math.floor((sectionWidth + gap) / (baseSize + gap)));
  return Math.max(1, Math.min(fitCols, maxColumns));
}
function normalizeBox(box, fallback) {
  return {
    x: Math.max(0, Math.floor(box?.x ?? 0)),
    y: Math.max(0, Math.floor(box?.y ?? 0)),
    w: Math.max(1, Math.floor(box?.w ?? fallback.w)),
    h: Math.max(1, Math.floor(box?.h ?? fallback.h))
  };
}
function canPlace(layout, occupied, cols) {
  if (layout.x < 0 || layout.y < 0 || layout.w < 1 || layout.h < 1) return false;
  if (layout.x + layout.w > cols) return false;
  for (let row = layout.y; row < layout.y + layout.h; row += 1) {
    for (let col = layout.x; col < layout.x + layout.w; col += 1) {
      if (occupied.has(`${col}:${row}`)) return false;
    }
  }
  return true;
}
function occupy(layout, occupied) {
  for (let row = layout.y; row < layout.y + layout.h; row += 1) {
    for (let col = layout.x; col < layout.x + layout.w; col += 1) {
      occupied.add(`${col}:${row}`);
    }
  }
}
function findFirstFitPosition(occupied, cols, size, startY = 0) {
  const w = Math.max(1, Math.min(size.w, cols));
  const h = Math.max(1, size.h);
  let y = Math.max(0, startY);
  for (; y < 512; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      const candidate = { x, y, w, h };
      if (canPlace(candidate, occupied, cols)) return candidate;
    }
  }
  return { x: 0, y, w, h };
}
function normalizeTilesForColumns(tiles, cols) {
  const occupied = /* @__PURE__ */ new Set();
  const normalized = [];
  for (const tile2 of tiles) {
    const preset = tile2.sizePreset ?? inferPresetFromLegacySize(tile2.type, tile2.size);
    const fallback = resolvePresetToSpan(tile2.type, preset, cols <= MOBILE_SECTION_COLS ? "sm" : "lg");
    const preferred = normalizeBox(tile2.layout, tile2.size ?? fallback);
    const clamped = {
      ...preferred,
      w: Math.min(preferred.w, cols)
    };
    const layout = canPlace(clamped, occupied, cols) ? clamped : findFirstFitPosition(occupied, cols, clamped, clamped.y);
    occupy(layout, occupied);
    normalized.push({ tile: tile2, layout });
  }
  return normalized;
}
function normalizeTilesForStorage(tiles, cols) {
  return normalizeTilesForColumns(tiles, cols).map(({ tile: tile2, layout }) => ({
    ...tile2,
    layout,
    sizePreset: tile2.sizePreset ?? inferPresetFromLegacySize(tile2.type, tile2.size),
    // Keep legacy size in sync with the resolved snapped layout while the
    // old field still exists for migration compatibility.
    size: { w: layout.w, h: layout.h }
  }));
}
function appendTileToLayout(tiles, tile2, cols) {
  const normalized = normalizeTilesForStorage(tiles, cols);
  const occupied = /* @__PURE__ */ new Set();
  for (const existing of normalized) {
    if (!existing.layout) continue;
    occupy(existing.layout, occupied);
  }
  const preset = tile2.sizePreset ?? inferPresetFromLegacySize(tile2.type, tile2.size);
  const fallback = tile2.size ?? resolvePresetToSpan(tile2.type, preset, "lg");
  const layout = findFirstFitPosition(occupied, cols, tile2.layout ?? fallback);
  return [
    ...normalized,
    {
      ...tile2,
      sizePreset: preset,
      size: fallback,
      layout
    }
  ];
}
function resizeTileForPreset(section, tiles, tileId, sizePreset) {
  const cols = getSectionMaxColumns(section);
  const next = tiles.map((tile2) => {
    if (tile2.id !== tileId) return tile2;
    const span = resolvePresetToSpan(tile2.type, sizePreset, "lg");
    return {
      ...tile2,
      sizePreset,
      size: span,
      layout: tile2.layout ? { ...tile2.layout, w: span.w, h: span.h } : { x: 0, y: 0, w: span.w, h: span.h }
    };
  });
  return normalizeTilesForStorage(next, cols);
}
function createDashboardStore() {
  const { subscribe, set, update } = writable(defaultConfig());
  async function persistConfig(config) {
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
    } catch (err) {
      console.error("[stratum] Failed to save config:", err);
    }
  }
  function mutate(fn) {
    update((config) => {
      const next = structuredClone(config);
      fn(next);
      return next;
    });
  }
  return {
    subscribe,
    // ── Demo / seed (bypasses persistence) ────────────────────────────
    seed(config) {
      set(config);
    },
    async replace(config) {
      set(config);
      await persistConfig(config);
    },
    // ── Lifecycle ──────────────────────────────────────────────────────
    async load() {
      return;
    },
    // ── Top-level sections ────────────────────────────────────────────
    setTheme(patch) {
      mutate((c) => Object.assign(c.theme, patch));
    },
    setNav(patch) {
      mutate((c) => Object.assign(c.nav, patch));
    },
    setHeader(patch) {
      mutate((c) => Object.assign(c.header, patch));
    },
    setSettings(patch) {
      mutate((c) => Object.assign(c.settings, patch));
    },
    setTileDefaults(patch) {
      mutate((c) => Object.assign(c.tileDefaults, patch));
    },
    setSearch(patch) {
      mutate((c) => Object.assign(c.search, patch));
    },
    setWeather(patch) {
      mutate((c) => Object.assign(c.weather, patch));
    },
    setDisplay(patch) {
      mutate((c) => Object.assign(c.display, patch));
    },
    setThemeSchedule(patch) {
      mutate((c) => Object.assign(c.display.themeSchedule, patch));
    },
    setNotifications(patch) {
      mutate((c) => Object.assign(c.notifications, patch));
    },
    setResources(patch) {
      mutate((c) => Object.assign(c.resources, patch));
    },
    setEdit(patch) {
      mutate((c) => Object.assign(c.edit, patch));
    },
    setMedia(patch) {
      mutate((c) => Object.assign(c.media, patch));
    },
    setEnergy(patch) {
      mutate((c) => Object.assign(c.energy, patch));
    },
    setDialog(patch) {
      mutate((c) => Object.assign(c.dialog, patch));
    },
    setFavorites(patch) {
      mutate((c) => Object.assign(c.favorites, patch));
    },
    toggleFavorite(entityId) {
      mutate((c) => {
        const idx = c.favorites.entityIds.indexOf(entityId);
        if (idx === -1) c.favorites.entityIds.push(entityId);
        else c.favorites.entityIds.splice(idx, 1);
      });
    },
    // ── Profiles ───────────────────────────────────────────────────────
    addProfile(profile) {
      mutate((c) => c.profiles.push(profile));
    },
    updateProfile(profileId, patch) {
      mutate((c) => {
        const p = c.profiles.find((p2) => p2.id === profileId);
        if (p) Object.assign(p, patch);
      });
    },
    deleteProfile(profileId) {
      mutate((c) => {
        c.profiles = c.profiles.filter((p) => p.id !== profileId);
      });
    },
    // ── Pages ──────────────────────────────────────────────────────────
    addPage(page) {
      mutate((c) => c.pages.push(page));
    },
    updatePage(pageId, patch) {
      mutate((c) => {
        const p = c.pages.find((p2) => p2.id === pageId);
        if (p) Object.assign(p, patch);
      });
    },
    deletePage(pageId) {
      mutate((c) => {
        c.pages = c.pages.filter((p) => p.id !== pageId);
      });
    },
    reorderPages(ids) {
      mutate((c) => {
        const map = new Map(c.pages.map((p) => [p.id, p]));
        c.pages = ids.map((id) => map.get(id)).filter(Boolean);
      });
    },
    // ── Sections ──────────────────────────────────────────────────────
    addSection(pageId, section) {
      mutate((c) => {
        c.pages.find((p) => p.id === pageId)?.sections.push(section);
      });
    },
    updateSection(pageId, sectionId, patch) {
      mutate((c) => {
        const s = c.pages.find((p) => p.id === pageId)?.sections.find((s2) => s2.id === sectionId);
        if (!s) return;
        Object.assign(s, patch);
        if (patch.grid) {
          s.tiles = normalizeTilesForStorage(s.tiles, getSectionMaxColumns(s));
        }
      });
    },
    deleteSection(pageId, sectionId) {
      mutate((c) => {
        const p = c.pages.find((p2) => p2.id === pageId);
        if (p) p.sections = p.sections.filter((s) => s.id !== sectionId);
      });
    },
    reorderSections(pageId, ids) {
      mutate((c) => {
        const p = c.pages.find((p2) => p2.id === pageId);
        if (!p) return;
        const map = new Map(p.sections.map((s) => [s.id, s]));
        p.sections = ids.map((id) => map.get(id)).filter(Boolean);
      });
    },
    toggleSectionCollapsed(pageId, sectionId) {
      mutate((c) => {
        const s = c.pages.find((p) => p.id === pageId)?.sections.find((s2) => s2.id === sectionId);
        if (s) s.collapsed = !s.collapsed;
      });
    },
    // ── Tiles ─────────────────────────────────────────────────────────
    addTile(pageId, sectionId, tile2) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const sizePreset = tile2.sizePreset ?? inferPresetFromLegacySize(tile2.type, tile2.size);
        const size = tile2.size ?? resolvePresetToSpan(tile2.type, sizePreset);
        section.tiles = appendTileToLayout(section.tiles, {
          ...tile2,
          sizePreset,
          size
        }, getSectionMaxColumns(section));
      });
    },
    insertTileAt(pageId, sectionId, tile2, position, columnHint) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        if (!section) return;
        const sizePreset = tile2.sizePreset ?? inferPresetFromLegacySize(tile2.type, tile2.size);
        const size = tile2.size ?? resolvePresetToSpan(tile2.type, sizePreset);
        const nextTiles = [...section.tiles];
        const index = position === void 0 ? nextTiles.length : Math.max(0, Math.min(position, nextTiles.length));
        nextTiles.splice(index, 0, { ...tile2, sizePreset, size });
        const normalizeCols = columnHint && columnHint > 0 ? Math.max(1, Math.min(columnHint, getSectionMaxColumns(section))) : getSectionMaxColumns(section);
        section.tiles = normalizeTilesForStorage(nextTiles, normalizeCols);
      });
    },
    moveTileToSection(pageId, fromSectionId, toSectionId, tileId, columnHint) {
      mutate((c) => {
        const page = c.pages.find((p) => p.id === pageId);
        const source = page?.sections.find((s) => s.id === fromSectionId);
        const target = page?.sections.find((s) => s.id === toSectionId);
        if (!source || !target || source.id === target.id) return;
        const tile2 = source.tiles.find((t) => t.id === tileId);
        if (!tile2) return;
        source.tiles = source.tiles.filter((t) => t.id !== tileId);
        const normalizeCols = columnHint && columnHint > 0 ? Math.max(1, Math.min(columnHint, getSectionMaxColumns(target))) : getSectionMaxColumns(target);
        target.tiles = appendTileToLayout(
          target.tiles,
          {
            ...tile2,
            layout: void 0
          },
          normalizeCols
        );
      });
    },
    moveTileToPage(pageId, fromSectionId, toPageId, tileId, columnHint) {
      mutate((c) => {
        const sourcePage = c.pages.find((p) => p.id === pageId);
        const source = sourcePage?.sections.find((s) => s.id === fromSectionId);
        const targetPage = c.pages.find((p) => p.id === toPageId);
        if (!source || !targetPage) return;
        const tile2 = source.tiles.find((t) => t.id === tileId);
        if (!tile2) return;
        if (targetPage.sections.length === 0) {
          targetPage.sections.push({
            id: crypto.randomUUID(),
            title: "New Section",
            icon: "",
            role: "main",
            visibility: { lg: true, md: true, sm: true },
            collapsible: false,
            collapsed: false,
            grid: { baseSize: 160, gap: 8 },
            tiles: []
          });
        }
        const target = targetPage.sections[0];
        if (!target) return;
        source.tiles = source.tiles.filter((t) => t.id !== tileId);
        const normalizeCols = columnHint && columnHint > 0 ? Math.max(1, Math.min(columnHint, getSectionMaxColumns(target))) : getSectionMaxColumns(target);
        target.tiles = appendTileToLayout(
          target.tiles,
          {
            ...tile2,
            layout: void 0
          },
          normalizeCols
        );
      });
    },
    updateTile(pageId, sectionId, tileId, patch) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        const tiles = section?.tiles;
        const tile2 = tiles?.find((t) => t.id === tileId);
        if (!tile2 || !section) return;
        Object.assign(tile2, patch);
        if (patch.layout || patch.sizePreset || patch.size) {
          section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
        }
      });
    },
    setTileLayout(pageId, sectionId, tileId, layout) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        const tile2 = section?.tiles.find((t) => t.id === tileId);
        if (!tile2 || !section || !layout) return;
        tile2.layout = {
          x: Math.max(0, Math.floor(layout.x)),
          y: Math.max(0, Math.floor(layout.y)),
          w: Math.max(1, Math.floor(layout.w)),
          h: Math.max(1, Math.floor(layout.h))
        };
        section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
      });
    },
    setTileSizePreset(pageId, sectionId, tileId, sizePreset) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        if (!section) return;
        section.tiles = resizeTileForPreset(section, section.tiles, tileId, sizePreset);
      });
    },
    normalizeSectionLayout(pageId, sectionId) {
      mutate((c) => {
        const section = c.pages.find((p) => p.id === pageId)?.sections.find((s) => s.id === sectionId);
        if (!section) return;
        section.tiles = normalizeTilesForStorage(section.tiles, getSectionMaxColumns(section));
      });
    },
    deleteTile(pageId, sectionId, tileId) {
      mutate((c) => {
        const s = c.pages.find((p) => p.id === pageId)?.sections.find((s2) => s2.id === sectionId);
        if (s) s.tiles = s.tiles.filter((t) => t.id !== tileId);
      });
    }
  };
}
const dashboardStore = createDashboardStore();
let _id = 0;
function uid() {
  return `demo-${++_id}`;
}
function tile(type, entity_id, config = {}, sizePreset = "md") {
  return {
    id: uid(),
    type,
    entity_id,
    sizePreset,
    size: resolvePresetToSpan(type, sizePreset, "lg"),
    visibility: { ...VISIBLE_ALL },
    config: {
      tap_action: { type: "toggle" },
      hold_action: { type: "more-info" },
      double_tap_action: { type: "more-info" },
      ...config
    }
  };
}
function sec(title, icon, tiles, columns) {
  return {
    id: uid(),
    title,
    icon,
    role: "main",
    grid: { columns, baseSize: 160, gap: 8 },
    collapsible: false,
    collapsed: false,
    visibility: { ...VISIBLE_ALL },
    tiles
  };
}
function colSec(title, icon, tiles, columns) {
  return { ...sec(title, icon, tiles, columns), collapsible: true, collapsed: false };
}
sec("Good Morning ✨", "home", [
  // Full weather widget
  tile("weather", "weather.home", {
    weather_show_humidity: true,
    weather_show_wind: true,
    weather_show_uv_index: true,
    weather_forecast_type: "daily",
    weather_forecast_days: 5
  }, "lg"),
  // Solar + battery energy overview
  tile("energy", void 0, {
    grid_entity: "sensor.grid_power",
    solar_entity: "sensor.solar_power",
    battery_entity: "sensor.battery_soc"
  }, "lg"),
  // Live wall clock
  tile("clock", void 0, {
    time_format: "12h",
    show_date: true,
    clock_style: "digital"
  }, "md"),
  // Home status selector
  tile("input_select", "input_select.vacation_mode", {
    name: "Home Status",
    select_mode: "buttons"
  }, "lg")
]);
sec("Family", "users", [
  tile("person", "person.alex", {
    name: "Alex",
    show_location_text: true,
    show_home_away_badge: true,
    show_person_picture: true
  }, "md"),
  tile("person", "person.riley", {
    name: "Riley",
    show_location_text: true,
    show_home_away_badge: true,
    show_person_picture: true
  }, "md"),
  tile("person", "person.jamie", {
    name: "Jamie",
    show_location_text: true,
    show_home_away_badge: true,
    show_person_picture: true
  }, "md"),
  // Family location map
  tile("map", void 0, {
    map_entity_ids: ["person.alex", "person.riley", "person.jamie"],
    map_show_names: true,
    map_show_zones: true,
    map_default_zoom: 12,
    map_dark_mode: "auto"
  }, "xl")
]);
sec("Quick Scenes", "sparkles", [
  tile("button", "scene.wake_up", { name: "Wake Up", icon: "sunrise" }, "md"),
  tile("button", "scene.leave_home", { name: "Leave Home", icon: "door-open" }, "md"),
  tile("button", "scene.arrive_home", { name: "Arrive Home", icon: "home" }, "md"),
  tile("button", "scene.movie_night", { name: "Movie Night", icon: "film" }, "md"),
  tile("button", "scene.dinner_party", { name: "Dinner Party", icon: "utensils" }, "md"),
  tile("button", "scene.good_night", { name: "Good Night", icon: "moon" }, "md"),
  tile("button", "scene.romantic_evening", { name: "Romantic Eve", icon: "heart" }, "md"),
  tile("button", "scene.party_mode", { name: "Party Mode", icon: "music" }, "md"),
  tile("button", "scene.work_from_home", { name: "Work Mode", icon: "briefcase" }, "md"),
  tile("button", "scene.kids_bedtime", { name: "Kids Bedtime", icon: "moon-star" }, "md"),
  tile("button", "scene.all_off", { name: "All Off", icon: "power" }, "md"),
  tile("button", "scene.weekend_morning", { name: "Weekend AM", icon: "coffee" }, "md")
], 6);
sec("Active Alerts", "bell", [
  // Water leak sensors — should show clear/safe
  tile("entity", "binary_sensor.water_leak_kitchen", { name: "Kitchen Leak" }, "sm"),
  tile("entity", "binary_sensor.water_leak_basement", { name: "Basement Leak" }, "sm"),
  tile("entity", "binary_sensor.water_leak_laundry", { name: "Laundry Leak" }, "sm"),
  tile("entity", "binary_sensor.smoke_kitchen", { name: "Smoke Detector" }, "sm"),
  tile("entity", "binary_sensor.co_detector", { name: "CO Detector" }, "sm"),
  tile("entity", "binary_sensor.doorbell", { name: "Doorbell" }, "sm")
]);
sec("Notes", "file-text", [
  tile("markdown", void 0, {
    content: `## 🏠 Maple House
**Status:** All systems normal · Solar **+1.94 kW** net surplus  
**Next event:** Riley returns ~6:30PM · Pool maintenance Friday 9AM

> 💡 Try holding any tile to open its full detail view.`
  }, "xl")
]);
({
  id: uid()
});
sec("Entertainment", "tv", [
  tile("media_player", "media_player.living_room_tv", {
    name: "Living Room TV",
    show_artwork: true,
    show_progress: true,
    show_volume: true,
    show_source: true,
    artwork_size: "lg",
    media_controls: ["play", "previous", "next", "shuffle", "repeat"]
  }, "xl"),
  // Harmony Hub remote
  tile("remote", "remote.living_room_hub", {
    name: "Entertainment Hub",
    remote_commands: [
      { label: "Watch TV", command: "Watch TV", icon: "tv" },
      { label: "Movies", command: "Watch Movies", icon: "film" },
      { label: "Gaming", command: "Gaming", icon: "gamepad-2" },
      { label: "Music", command: "Listen Music", icon: "music" },
      { label: "Power Off", command: "PowerOff", icon: "power" }
    ]
  }, "lg"),
  tile("media_player", "media_player.kitchen_display", {
    name: "Kitchen Speaker",
    show_artwork: true,
    show_volume: true,
    artwork_size: "md",
    media_controls: ["play", "previous", "next"]
  }, "lg")
]);
sec("Climate & Comfort", "thermometer", [
  tile("climate", "climate.living_room", {
    name: "Living Room AC",
    show_current_temp: true,
    show_humidity: true,
    show_hvac_modes: true,
    show_preset_modes: true,
    show_fan_mode: true
  }, "lg"),
  tile("fan", "fan.living_room_ceiling", {
    name: "Ceiling Fan",
    show_speed_slider: true,
    show_oscillate: true
  }, "md"),
  tile("fan", "fan.dining_room_ceiling", {
    name: "Dining Fan"
  }, "md"),
  tile("humidifier", "humidifier.living_room", {
    name: "Living Room Humidifier",
    show_humidity_slider: true,
    show_humidifier_mode: true
  }, "lg"),
  tile("entity", "sensor.living_room_temp", {
    name: "Temperature",
    show_graph: true,
    graph_type: "line",
    graph_hours: 12
  }, "md"),
  tile("entity", "sensor.living_room_humidity", {
    name: "Humidity",
    show_graph: true,
    graph_type: "line",
    graph_hours: 12
  }, "md")
]);
sec("Lighting & Ambience", "lightbulb", [
  tile("light", "light.living_room_ceiling", { name: "Ceiling", show_brightness_slider: true, show_color_temp_slider: true }, "md"),
  tile("light", "light.living_room_floor_lamp", { name: "Floor Lamp", show_color_picker: true }, "md"),
  tile("light", "light.tv_backlight", { name: "TV Backlight", show_color_picker: true }, "md"),
  tile("light", "light.bookshelf_led", { name: "Bookshelf LED", show_color_picker: true }, "md"),
  tile("light", "light.dining_pendant", { name: "Dining Pendant", show_brightness_slider: true }, "md"),
  tile("light", "light.staircase_step", { name: "Staircase", show_color_picker: true }, "md"),
  tile("cover", "cover.living_room_blinds", { name: "Blinds", show_position_slider: true }, "md"),
  tile("cover", "cover.living_room_curtains", { name: "Curtains", show_position_slider: true }, "md"),
  tile("cover", "cover.dining_room_blinds", { name: "Dining Blinds", show_position_slider: true }, "md"),
  tile("input_select", "input_select.scene_mode", { name: "Scene", select_mode: "buttons" }, "lg")
]);
({
  id: uid()
});
sec("Audio", "music", [
  tile("media_player", "media_player.kitchen_display", {
    name: "Echo Show 15",
    show_artwork: true,
    show_progress: false,
    show_volume: true,
    show_source: true,
    artwork_size: "lg",
    media_controls: ["play", "previous", "next"]
  }, "lg"),
  tile("input_select", "input_select.audio_source", {
    name: "Audio Source",
    select_mode: "buttons"
  }, "lg")
]);
sec("Lighting", "lightbulb", [
  tile("light", "light.kitchen_overhead", { name: "Overhead", show_brightness_slider: true, show_color_temp_slider: true }, "md"),
  tile("light", "light.kitchen_under_cabinet", { name: "Under Cabinet", show_color_picker: true }, "md"),
  tile("light", "light.dining_pendant", { name: "Dining Pendant", show_brightness_slider: true }, "md")
]);
sec("Timers & Appliances", "chef-hat", [
  tile("timer", "timer.oven", {
    name: "Oven Timer",
    timer_show_progress_ring: true,
    timer_show_controls: true,
    timer_show_duration: true
  }, "lg"),
  tile("timer", "timer.laundry", {
    name: "Laundry Timer",
    timer_show_progress_ring: true,
    timer_show_controls: true,
    timer_show_duration: true
  }, "lg"),
  tile("entity", "binary_sensor.smoke_kitchen", { name: "Smoke Detector" }, "sm"),
  tile("entity", "binary_sensor.water_leak_kitchen", { name: "Leak Sensor" }, "sm")
]);
sec("Lists", "list-checks", [
  tile("todo", "todo.grocery_list", {
    name: "Grocery List",
    todo_show_completed: false,
    todo_show_add_button: true,
    todo_max_items: 12
  }, "xl"),
  tile("todo", "todo.home_tasks", {
    name: "Home Tasks",
    todo_show_completed: true,
    todo_show_add_button: true,
    todo_max_items: 8
  }, "lg"),
  tile("todo", "todo.shopping", {
    name: "Shopping",
    todo_show_completed: false,
    todo_show_add_button: true,
    todo_max_items: 10
  }, "lg")
]);
({
  id: uid()
});
sec("Master Suite", "bed-double", [
  tile("climate", "climate.master_bedroom", {
    name: "Master AC",
    show_current_temp: true,
    show_humidity: true,
    show_hvac_modes: true,
    show_preset_modes: true,
    show_fan_mode: true
  }, "lg"),
  tile("media_player", "media_player.bedroom_speaker", {
    name: "Bedside Speaker",
    show_artwork: true,
    show_volume: true,
    show_source: true,
    artwork_size: "md",
    media_controls: ["play", "previous", "next"]
  }, "lg"),
  tile("fan", "fan.master_bedroom_ceiling", {
    name: "Ceiling Fan",
    show_speed_slider: true
  }, "md"),
  tile("humidifier", "humidifier.master_bedroom", {
    name: "Humidifier",
    show_humidity_slider: true,
    show_humidifier_mode: true
  }, "lg"),
  tile("cover", "cover.master_bedroom_shades", {
    name: "Blackout Shades",
    show_position_slider: true
  }, "md"),
  tile("light", "light.master_headboard", { name: "Headboard", show_color_picker: true }, "md"),
  tile("light", "light.master_ceiling", { name: "Ceiling", show_color_temp_slider: true }, "md"),
  tile("light", "light.master_nightstand_left", { name: "Left Nightstand" }, "sm"),
  tile("light", "light.master_nightstand_right", { name: "Right Nightstand" }, "sm"),
  tile("light", "light.master_bath", { name: "Master Bath" }, "sm"),
  tile("entity", "sensor.master_bedroom_temp", {
    name: "Bedroom Temp",
    show_graph: true,
    graph_type: "line",
    graph_hours: 8
  }, "md"),
  tile("entity", "binary_sensor.window_master", { name: "Window" }, "sm")
]);
sec("Kids Room", "shapes", [
  tile("climate", "climate.kids_room", {
    name: "Kids AC",
    show_current_temp: true,
    show_hvac_modes: true,
    show_preset_modes: true
  }, "lg"),
  tile("media_player", "media_player.kids_room_speaker", {
    name: "Echo Dot",
    show_artwork: true,
    show_volume: true,
    artwork_size: "md",
    media_controls: ["play", "previous", "next"]
  }, "lg"),
  tile("humidifier", "humidifier.kids_room", {
    name: "Humidifier",
    show_humidity_slider: true,
    show_humidifier_mode: true
  }, "lg"),
  tile("light", "light.kids_ceiling", { name: "Ceiling Light" }, "md"),
  tile("light", "light.kids_nightlight", { name: "Night Light", show_color_picker: true }, "md"),
  tile("button", "scene.kids_bedtime", { name: "Bedtime", icon: "moon-star" }, "md"),
  tile("vacuum", "vacuum.upstairs", {
    name: "iRobot — Upstairs",
    show_vacuum_fan_speed: true
  }, "lg")
]);
colSec("Guest Bedroom", "door-open", [
  tile("climate", "climate.guest_bedroom", {
    name: "Guest AC",
    show_current_temp: true,
    show_hvac_modes: true
  }, "lg"),
  tile("light", "light.guest_bedroom", { name: "Bedroom Light" }, "md"),
  tile("light", "light.guest_bath", { name: "Guest Bath" }, "md")
]);
({
  id: uid()
});
sec("Office Setup", "monitor", [
  tile("climate", "climate.home_office", {
    name: "Office AC",
    show_current_temp: true,
    show_humidity: true,
    show_hvac_modes: true,
    show_preset_modes: true
  }, "lg"),
  tile("media_player", "media_player.office_monitor", {
    name: "Sonos Era — Office",
    show_artwork: true,
    show_volume: true,
    show_source: true,
    artwork_size: "md",
    media_controls: ["play", "previous", "next", "shuffle"]
  }, "lg"),
  tile("fan", "fan.home_office_desk", {
    name: "Desk Fan",
    show_speed_slider: true
  }, "md"),
  tile("cover", "cover.office_blinds", {
    name: "Office Blinds",
    show_position_slider: true
  }, "md"),
  tile("entity", "binary_sensor.window_office", { name: "Office Window" }, "sm"),
  tile("button", "scene.work_from_home", { name: "Work Mode", icon: "briefcase" }, "md")
]);
sec("Lighting", "sun", [
  tile("light", "light.office_desk_lamp", { name: "Desk Lamp", show_brightness_slider: true, show_color_temp_slider: true }, "md"),
  tile("light", "light.office_overhead", { name: "Overhead", show_brightness_slider: true }, "md"),
  tile("light", "light.office_bias_lighting", { name: "Bias Lighting", show_color_picker: true }, "md"),
  tile("slider", "number.living_room_light_schedule", {
    name: "Lights Off At",
    slider_min: 18,
    slider_max: 24,
    slider_step: 0.5
  }, "lg")
]);
sec("Air Quality", "wind", [
  // Gauge with segmented severity
  tile("gauge", "sensor.office_co2", {
    name: "CO₂ Level",
    min: 400,
    max: 2e3,
    gauge_needle: true,
    gauge_segments: [
      { from: 400, color: "#22c55e", label: "Excellent" },
      { from: 600, color: "#84cc16", label: "Good" },
      { from: 900, color: "#eab308", label: "Fair" },
      { from: 1200, color: "#f97316", label: "Poor" },
      { from: 1600, color: "#ef4444", label: "Bad" }
    ]
  }, "lg"),
  // History sparkline chart
  tile("history", "sensor.office_co2", {
    name: "CO₂ Last 8h",
    hours: 8,
    history_fill: true,
    history_smooth: true
  }, "lg"),
  tile("entity", "sensor.office_temp", { name: "Office Temp" }, "sm"),
  tile("entity", "sensor.outdoor_air_quality", { name: "Outdoor AQI" }, "sm"),
  tile("entity", "sensor.outdoor_uv", { name: "UV Index" }, "sm"),
  tile("entity", "sensor.outdoor_temp", { name: "Outdoor Temp" }, "sm")
]);
({
  id: uid()
});
sec("Alarm & Locks", "shield", [
  tile("alarm_panel", "alarm_control_panel.home", {
    name: "Home Security",
    alarm_code_format: "number",
    show_keypad: true
  }, "lg"),
  tile("lock", "lock.front_door", { name: "Front Door", lock_confirm: true }, "md"),
  tile("lock", "lock.back_door", { name: "Back Door", lock_confirm: true }, "md"),
  tile("lock", "lock.garage_side", { name: "Garage Side", lock_confirm: true }, "md"),
  // Outdoor siren
  tile("siren", "siren.outdoor_alarm", {
    name: "Outdoor Siren",
    show_siren_tone: true,
    show_siren_duration_input: true
  }, "lg")
]);
sec("Cameras", "camera", [
  tile("camera", "camera.front_door", { name: "Front Door", artwork_size: "fill" }, "lg"),
  tile("camera", "camera.driveway", { name: "Driveway", artwork_size: "fill" }, "lg"),
  tile("camera", "camera.backyard", { name: "Backyard", artwork_size: "fill" }, "lg"),
  tile("camera", "camera.garage", { name: "Garage", artwork_size: "fill" }, "lg")
]);
sec("Door & Window Sensors", "radar", [
  tile("entity", "binary_sensor.front_door_contact", { name: "Front Door" }, "sm"),
  tile("entity", "binary_sensor.back_door_contact", { name: "Back Door" }, "sm"),
  tile("entity", "binary_sensor.window_master", { name: "Master Window" }, "sm"),
  tile("entity", "binary_sensor.window_office", { name: "Office Window" }, "sm"),
  tile("entity", "binary_sensor.front_yard_motion", { name: "Front Motion" }, "sm"),
  tile("entity", "binary_sensor.garage_motion", { name: "Garage Motion" }, "sm"),
  tile("entity", "binary_sensor.doorbell", { name: "Doorbell" }, "sm")
]);
sec("Event Log", "scroll-text", [
  tile("logbook", void 0, {
    name: "Security Events",
    logbook_entity_ids: [
      "alarm_control_panel.home",
      "lock.front_door",
      "lock.back_door",
      "binary_sensor.front_door_contact",
      "binary_sensor.front_yard_motion",
      "binary_sensor.doorbell"
    ],
    logbook_count: 25,
    logbook_show_icon: true
  }, "xl")
]);
({
  id: uid()
});
sec("Patio & Exterior", "sun", [
  tile("light", "light.back_porch", { name: "Back Porch", show_color_picker: true }, "md"),
  tile("light", "light.front_porch", { name: "Front Porch", show_brightness_slider: true }, "md"),
  tile("light", "light.path_lights", { name: "Path Lights" }, "sm"),
  tile("light", "light.landscape_1", { name: "Landscape" }, "sm"),
  tile("light", "light.garage_lights", { name: "Garage Lights" }, "sm"),
  tile("media_player", "media_player.patio_speaker", {
    name: "Patio Speaker",
    show_artwork: false,
    show_volume: true,
    media_controls: ["play", "previous", "next"]
  }, "lg"),
  tile("cover", "cover.back_patio_door", { name: "Patio Door" }, "md"),
  tile("cover", "cover.sunroof_skylight", { name: "Skylight", show_position_slider: true }, "md")
]);
sec("Pool & Spa", "waves", [
  tile("entity", "switch.pool_pump", {
    name: "Pool Pump",
    icon: "pump",
    state_on_label: "Running",
    state_off_label: "Off"
  }, "md"),
  tile("entity", "switch.pool_heater", {
    name: "Pool Heater",
    icon: "flame"
  }, "md"),
  tile("entity", "switch.hot_tub", {
    name: "Hot Tub Jets",
    icon: "waves"
  }, "md"),
  tile("slider", "number.pool_target_temp", {
    name: "Pool Target Temp",
    slider_min: 60,
    slider_max: 104,
    slider_step: 1
  }, "lg"),
  tile("slider", "number.hot_tub_temp", {
    name: "Hot Tub Target",
    slider_min: 60,
    slider_max: 104,
    slider_step: 1
  }, "lg"),
  // Pool sensors
  tile("gauge", "sensor.pool_temp", {
    name: "Pool Temperature",
    min: 60,
    max: 100,
    gauge_needle: false,
    gauge_segments: [
      { from: 60, color: "#60a5fa", label: "Cold" },
      { from: 75, color: "#22c55e", label: "Perfect" },
      { from: 86, color: "#f97316", label: "Warm" },
      { from: 92, color: "#ef4444", label: "Hot" }
    ]
  }, "lg"),
  tile("entity", "sensor.pool_ph", { name: "pH Level" }, "sm"),
  tile("entity", "sensor.pool_chlorine", { name: "Chlorine" }, "sm"),
  tile("light", "light.pool_led", { name: "Pool LED", show_color_picker: true }, "md")
]);
sec("Garage & Grounds", "car", [
  tile("cover", "cover.garage_door", {
    name: "Garage Door",
    show_position_slider: false
  }, "lg"),
  tile("entity", "switch.ev_charger", {
    name: "EV Charger",
    icon: "zap",
    state_on_label: "Charging",
    state_off_label: "Standby"
  }, "md"),
  tile("entity", "sensor.ev_charger_power", {
    name: "Charging Power",
    show_graph: true,
    graph_type: "line",
    graph_hours: 4
  }, "md"),
  tile("entity", "switch.driveway_heater", { name: "Driveway Heater", icon: "thermometer" }, "sm"),
  tile("vacuum", "vacuum.main_floor", {
    name: "Roomba — Main Floor",
    show_vacuum_fan_speed: true
  }, "lg"),
  tile("lawn_mower", "lawn_mower.husqvarna", {
    name: "Husqvarna Automower",
    show_mower_battery: true,
    show_mower_status: true
  }, "lg")
]);
sec("Irrigation", "sprout", [
  tile("entity", "switch.sprinkler_front", {
    name: "Front Lawn",
    icon: "sprinkler"
  }, "sm"),
  tile("entity", "switch.sprinkler_back", {
    name: "Back Lawn",
    icon: "sprinkler"
  }, "sm"),
  tile("entity", "switch.sprinkler_garden", {
    name: "Garden Drip",
    icon: "flower"
  }, "sm"),
  tile("slider", "number.sprinkler_duration", {
    name: "Run Duration",
    slider_min: 1,
    slider_max: 60,
    slider_step: 5
  }, "lg"),
  tile("timer", "timer.sprinkler_zone_1", {
    name: "Front Lawn Timer",
    timer_show_progress_ring: true,
    timer_show_controls: true
  }, "lg"),
  tile("entity", "sensor.water_usage_today", {
    name: "Water Today",
    show_graph: true,
    graph_type: "bar",
    graph_hours: 24
  }, "md")
]);
sec("Energy Overview", "zap", [
  // Main energy flow tile
  tile("energy", void 0, {
    grid_entity: "sensor.grid_power",
    solar_entity: "sensor.solar_power",
    battery_entity: "sensor.battery_soc"
  }, "lg"),
  // Battery gauge
  tile("gauge", "sensor.battery_soc", {
    name: "Battery Level",
    min: 0,
    max: 100,
    gauge_needle: false,
    gauge_segments: [
      { from: 0, color: "#ef4444", label: "Critical" },
      { from: 20, color: "#f97316", label: "Low" },
      { from: 40, color: "#eab308", label: "Fair" },
      { from: 70, color: "#22c55e", label: "Good" },
      { from: 90, color: "#3b82f6", label: "Full" }
    ]
  }, "md"),
  // Daily statistics
  tile("statistic", "sensor.daily_energy_consumed", {
    name: "Grid Used Today",
    statistic_period: "day",
    statistic_type: "sum",
    statistic_show_chart: true
  }, "lg"),
  tile("statistic", "sensor.daily_solar_generated", {
    name: "Solar Today",
    statistic_period: "day",
    statistic_type: "sum",
    statistic_show_chart: true
  }, "lg"),
  // Quick sensors
  tile("entity", "sensor.grid_power", { name: "Grid Draw", show_graph: true, graph_type: "line" }, "md"),
  tile("entity", "sensor.solar_power", { name: "Solar Output", show_graph: true, graph_type: "line" }, "md"),
  tile("entity", "sensor.energy_cost_today", { name: "Cost Today" }, "sm")
]);
sec("Network & System", "server", [
  // Network sensors
  tile("entity", "sensor.internet_download", {
    name: "Download",
    show_graph: true,
    graph_type: "line",
    graph_hours: 2
  }, "md"),
  tile("entity", "sensor.internet_upload", {
    name: "Upload",
    show_graph: true,
    graph_type: "line",
    graph_hours: 2
  }, "md"),
  tile("entity", "sensor.nas_disk_usage", { name: "NAS Storage" }, "md"),
  tile("entity", "sensor.nas_cpu_temp", { name: "NAS Temp" }, "sm"),
  tile("entity", "sensor.pi_hole_blocked", { name: "Ads Blocked", show_graph: true, graph_type: "bar" }, "md"),
  tile("entity", "sensor.ha_cpu_usage", { name: "HA CPU", show_graph: true, graph_type: "line" }, "sm"),
  tile("entity", "sensor.ha_memory_usage", { name: "HA Memory", show_graph: true, graph_type: "line" }, "sm"),
  // Update tiles
  tile("update", "update.home_assistant_core", {
    name: "HA Core",
    update_show_version: true,
    update_show_install_button: true,
    update_confirm_install: true
  }, "lg"),
  tile("update", "update.eero_firmware", {
    name: "eero Router",
    update_show_version: true,
    update_show_install_button: true
  }, "lg"),
  tile("update", "update.nest_thermostat", {
    name: "Nest Thermostat",
    update_show_version: true,
    update_show_install_button: true
  }, "lg"),
  tile("update", "update.home_assistant_os", {
    name: "HA OS",
    update_show_version: true
  }, "md"),
  tile("update", "update.lutron_bridge", {
    name: "Lutron Bridge",
    update_show_version: true
  }, "md"),
  tile("update", "update.ring_doorbell", {
    name: "Ring Doorbell",
    update_show_version: true
  }, "md"),
  // Water heater tucked into utilities section
  tile("water_heater", "water_heater.main", {
    name: "Water Heater",
    show_water_heater_temp: true,
    show_water_heater_mode: true
  }, "lg"),
  tile("entity", "sensor.water_usage_today", { name: "Water Today", show_graph: true, graph_type: "bar" }, "md"),
  tile("entity", "binary_sensor.water_leak_basement", { name: "Basement Leak" }, "sm"),
  tile("entity", "binary_sensor.water_leak_laundry", { name: "Laundry Leak" }, "sm")
]);
({
  id: uid()
});
const PAST = (minutesAgo) => new Date(Date.now() - minutesAgo * 6e4).toISOString();
function entity(entity_id, state, friendly_name, attributes = {}) {
  return {
    entity_id,
    state,
    attributes: { friendly_name, ...attributes },
    last_changed: PAST(Math.floor(Math.random() * 60)),
    last_updated: PAST(Math.floor(Math.random() * 5)),
    context: { id: entity_id, parent_id: null, user_id: null }
  };
}
({
  // ── WEATHER ───────────────────────────────────────────────────────────────
  "weather.home": entity("weather.home", "partlycloudy", "Home Weather", {
    temperature: 72,
    humidity: 51,
    pressure: 1015,
    wind_speed: 9,
    wind_bearing: 220,
    visibility: 10,
    uv_index: 4,
    dew_point: 55,
    temperature_unit: "°F",
    precipitation_unit: "in",
    forecast: [
      { datetime: PAST(-1440), condition: "sunny", temperature: 78, templow: 61 },
      { datetime: PAST(-2880), condition: "partlycloudy", temperature: 74, templow: 59 },
      { datetime: PAST(-4320), condition: "cloudy", temperature: 69, templow: 57 },
      { datetime: PAST(-5760), condition: "rainy", temperature: 65, templow: 55 },
      { datetime: PAST(-7200), condition: "sunny", temperature: 76, templow: 60 },
      { datetime: PAST(-8640), condition: "partlycloudy", temperature: 73, templow: 58 },
      { datetime: PAST(-10080), condition: "sunny", temperature: 80, templow: 62 }
    ]
  }),
  // ── PEOPLE ────────────────────────────────────────────────────────────────
  "person.alex": entity("person.alex", "home", "Alex", {
    entity_picture: "https://i.pravatar.cc/150?u=alex",
    latitude: 37.4219983,
    longitude: -122.084,
    source: "device_tracker.alex_iphone"
  }),
  "person.riley": entity("person.riley", "Work", "Riley", {
    entity_picture: "https://i.pravatar.cc/150?u=riley",
    source: "device_tracker.riley_pixel"
  }),
  "person.jamie": entity("person.jamie", "not_home", "Jamie", {
    entity_picture: "https://i.pravatar.cc/150?u=jamie",
    source: "device_tracker.jamie_watch"
  }),
  // ── CLIMATE ───────────────────────────────────────────────────────────────
  "climate.living_room": entity("climate.living_room", "cool", "Living Room AC", {
    current_temperature: 74,
    temperature: 71,
    hvac_modes: ["off", "heat", "cool", "auto", "fan_only"],
    hvac_action: "cooling",
    preset_mode: "none",
    preset_modes: ["none", "eco", "comfort", "boost"],
    fan_mode: "auto",
    fan_modes: ["auto", "low", "medium", "high"],
    current_humidity: 49,
    min_temp: 60,
    max_temp: 86
  }),
  "climate.master_bedroom": entity("climate.master_bedroom", "heat", "Master Bedroom AC", {
    current_temperature: 68,
    temperature: 70,
    hvac_modes: ["off", "heat", "cool", "auto"],
    hvac_action: "heating",
    preset_mode: "sleep",
    preset_modes: ["none", "eco", "sleep", "comfort"],
    fan_mode: "low",
    fan_modes: ["auto", "low", "medium", "high"],
    current_humidity: 44,
    min_temp: 60,
    max_temp: 86
  }),
  "climate.home_office": entity("climate.home_office", "cool", "Office AC", {
    current_temperature: 76,
    temperature: 72,
    hvac_modes: ["off", "heat", "cool", "auto"],
    hvac_action: "cooling",
    preset_mode: "eco",
    preset_modes: ["none", "eco", "comfort"],
    fan_mode: "auto",
    fan_modes: ["auto", "low", "medium", "high"],
    current_humidity: 47,
    min_temp: 60,
    max_temp: 86
  }),
  "climate.kids_room": entity("climate.kids_room", "off", "Kids Room AC", {
    current_temperature: 71,
    temperature: 72,
    hvac_modes: ["off", "heat", "cool", "auto"],
    hvac_action: "idle",
    preset_mode: "none",
    preset_modes: ["none", "eco", "sleep"],
    fan_mode: "auto",
    fan_modes: ["auto", "low", "medium", "high"],
    current_humidity: 46,
    min_temp: 60,
    max_temp: 86
  }),
  "climate.guest_bedroom": entity("climate.guest_bedroom", "off", "Guest Bedroom AC", {
    current_temperature: 70,
    temperature: 70,
    hvac_modes: ["off", "heat", "cool", "auto"],
    hvac_action: "idle",
    preset_mode: "none",
    preset_modes: ["none", "eco", "comfort"],
    current_humidity: 45,
    min_temp: 60,
    max_temp: 86
  }),
  // ── LIGHTING — Living Room ─────────────────────────────────────────────────
  "light.living_room_ceiling": entity("light.living_room_ceiling", "on", "Ceiling Lights", {
    brightness: 204,
    color_temp: 370,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp",
    min_color_temp_kelvin: 2700,
    max_color_temp_kelvin: 6500
  }),
  "light.living_room_floor_lamp": entity("light.living_room_floor_lamp", "on", "Floor Lamp", {
    brightness: 128,
    rgb_color: [255, 200, 100],
    supported_color_modes: ["hs", "color_temp"],
    color_mode: "hs"
  }),
  "light.tv_backlight": entity("light.tv_backlight", "on", "TV Backlight", {
    brightness: 80,
    rgb_color: [30, 100, 255],
    supported_color_modes: ["hs", "rgb"],
    color_mode: "hs"
  }),
  "light.bookshelf_led": entity("light.bookshelf_led", "off", "Bookshelf LED", {
    brightness: 100,
    rgb_color: [255, 60, 200],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  // ── LIGHTING — Kitchen & Dining ────────────────────────────────────────────
  "light.kitchen_overhead": entity("light.kitchen_overhead", "on", "Kitchen Overhead", {
    brightness: 255,
    color_temp: 250,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.kitchen_under_cabinet": entity("light.kitchen_under_cabinet", "off", "Under Cabinet", {
    brightness: 160,
    rgb_color: [255, 160, 40],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  "light.dining_pendant": entity("light.dining_pendant", "on", "Dining Pendant", {
    brightness: 180,
    color_temp: 340,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  // ── LIGHTING — Master Bedroom ──────────────────────────────────────────────
  "light.master_headboard": entity("light.master_headboard", "off", "Headboard Strip", {
    brightness: 60,
    rgb_color: [180, 80, 255],
    supported_color_modes: ["hs", "color_temp"],
    color_mode: "color_temp"
  }),
  "light.master_ceiling": entity("light.master_ceiling", "off", "Ceiling Fan Light", {
    brightness: 180,
    color_temp: 400,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.master_nightstand_left": entity("light.master_nightstand_left", "off", "Left Nightstand", {
    brightness: 50,
    color_temp: 450,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.master_nightstand_right": entity("light.master_nightstand_right", "on", "Right Nightstand", {
    brightness: 40,
    color_temp: 450,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  // ── LIGHTING — Office ──────────────────────────────────────────────────────
  "light.office_desk_lamp": entity("light.office_desk_lamp", "on", "Desk Lamp", {
    brightness: 210,
    color_temp: 200,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.office_overhead": entity("light.office_overhead", "on", "Office Overhead", {
    brightness: 230,
    color_temp: 220,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.office_bias_lighting": entity("light.office_bias_lighting", "on", "Bias Lighting", {
    brightness: 120,
    rgb_color: [0, 200, 255],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  // ── LIGHTING — Hallway & Entry ─────────────────────────────────────────────
  "light.entryway": entity("light.entryway", "on", "Entryway", {
    brightness: 150,
    color_temp: 380,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.hallway_main": entity("light.hallway_main", "off", "Main Hallway", {
    brightness: 100,
    color_temp: 400,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.hallway_upstairs": entity("light.hallway_upstairs", "off", "Upstairs Hall", {
    brightness: 100,
    color_temp: 400,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.staircase_step": entity("light.staircase_step", "on", "Staircase Steps", {
    brightness: 80,
    rgb_color: [255, 180, 50],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  // ── LIGHTING — Bathrooms ───────────────────────────────────────────────────
  "light.master_bath": entity("light.master_bath", "off", "Master Bath", {
    brightness: 255,
    color_temp: 250,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.guest_bath": entity("light.guest_bath", "off", "Guest Bath", {
    brightness: 255,
    color_temp: 250,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.powder_room": entity("light.powder_room", "off", "Powder Room", {
    brightness: 200,
    color_temp: 300,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  // ── LIGHTING — Kids & Guest ────────────────────────────────────────────────
  "light.kids_ceiling": entity("light.kids_ceiling", "off", "Kids Ceiling", {
    brightness: 180,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.kids_nightlight": entity("light.kids_nightlight", "on", "Kids Nightlight", {
    brightness: 30,
    rgb_color: [255, 200, 220],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  "light.guest_bedroom": entity("light.guest_bedroom", "off", "Guest Bedroom", {
    brightness: 180,
    color_temp: 380,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  // ── LIGHTING — Exterior ────────────────────────────────────────────────────
  "light.front_porch": entity("light.front_porch", "off", "Front Porch", {
    brightness: 255,
    color_temp: 380,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.back_porch": entity("light.back_porch", "on", "Back Porch", {
    brightness: 180,
    rgb_color: [255, 140, 30],
    supported_color_modes: ["hs", "color_temp"],
    color_mode: "hs"
  }),
  "light.garage_lights": entity("light.garage_lights", "off", "Garage Lights", {
    brightness: 255,
    color_temp: 400,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.path_lights": entity("light.path_lights", "on", "Pathway Lights", {
    brightness: 140,
    color_temp: 360,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  "light.pool_led": entity("light.pool_led", "on", "Pool LED", {
    brightness: 200,
    rgb_color: [0, 180, 255],
    supported_color_modes: ["hs"],
    color_mode: "hs"
  }),
  "light.landscape_1": entity("light.landscape_1", "on", "Front Landscape", {
    brightness: 160,
    color_temp: 370,
    supported_color_modes: ["color_temp"],
    color_mode: "color_temp"
  }),
  // ── FANS ──────────────────────────────────────────────────────────────────
  "fan.living_room_ceiling": entity("fan.living_room_ceiling", "on", "Living Room Fan", {
    percentage: 45,
    oscillating: false,
    preset_modes: ["low", "medium", "high", "auto"],
    preset_mode: "medium"
  }),
  "fan.master_bedroom_ceiling": entity("fan.master_bedroom_ceiling", "on", "Bedroom Fan", {
    percentage: 30,
    oscillating: false,
    preset_modes: ["sleep", "low", "medium", "high"],
    preset_mode: "sleep"
  }),
  "fan.home_office_desk": entity("fan.home_office_desk", "off", "Office Desk Fan", {
    percentage: 0,
    oscillating: true,
    preset_modes: ["low", "medium", "high"],
    preset_mode: ""
  }),
  "fan.dining_room_ceiling": entity("fan.dining_room_ceiling", "off", "Dining Fan", {
    percentage: 0,
    oscillating: false,
    preset_modes: ["low", "medium", "high"],
    preset_mode: ""
  }),
  "fan.whole_house_exhaust": entity("fan.whole_house_exhaust", "off", "Whole-House Exhaust", {
    percentage: 0,
    oscillating: false,
    preset_modes: ["low", "medium", "high", "turbo"],
    preset_mode: ""
  }),
  // ── HUMIDIFIER ────────────────────────────────────────────────────────────
  "humidifier.master_bedroom": entity("humidifier.master_bedroom", "on", "Bedroom Humidifier", {
    humidity: 45,
    current_humidity: 38,
    min_humidity: 20,
    max_humidity: 80,
    mode: "sleep",
    available_modes: ["normal", "auto", "sleep", "baby"]
  }),
  "humidifier.kids_room": entity("humidifier.kids_room", "on", "Kids Humidifier", {
    humidity: 50,
    current_humidity: 46,
    min_humidity: 20,
    max_humidity: 80,
    mode: "baby",
    available_modes: ["normal", "auto", "sleep", "baby"]
  }),
  "humidifier.living_room": entity("humidifier.living_room", "off", "Living Room Humidifier", {
    humidity: 45,
    current_humidity: 49,
    min_humidity: 20,
    max_humidity: 80,
    mode: "auto",
    available_modes: ["normal", "auto", "sleep"]
  }),
  // ── WATER HEATER ──────────────────────────────────────────────────────────
  "water_heater.main": entity("water_heater.main", "eco", "Water Heater", {
    current_temperature: 118,
    temperature: 120,
    min_temp: 100,
    max_temp: 140,
    operation_mode: "eco",
    operation_list: ["eco", "electric", "performance", "high_demand", "heat_pump", "off"],
    target_temp_high: 140,
    target_temp_low: 100,
    temperature_unit: "°F"
  }),
  // ── SIREN ─────────────────────────────────────────────────────────────────
  "siren.outdoor_alarm": entity("siren.outdoor_alarm", "off", "Outdoor Siren", {
    available_tones: ["fire", "intrusion", "alarm", "doorbell"],
    tone: "alarm"
  }),
  // ── MEDIA PLAYERS ─────────────────────────────────────────────────────────
  "media_player.living_room_tv": entity("media_player.living_room_tv", "playing", "Living Room TV", {
    media_title: "The Last of Us",
    media_artist: "HBO Max",
    media_content_type: "tvshow",
    volume_level: 0.38,
    is_volume_muted: false,
    source: "HBO Max",
    source_list: ["HBO Max", "Netflix", "YouTube", "Apple TV", "Gaming", "HDMI 1", "HDMI 2"],
    device_class: "tv",
    supported_features: 21389,
    entity_picture: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop"
  }),
  "media_player.kitchen_display": entity("media_player.kitchen_display", "playing", "Kitchen Echo Show", {
    media_title: "Morning Mix",
    media_artist: "Spotify",
    media_content_type: "music",
    volume_level: 0.25,
    is_volume_muted: false,
    source: "Spotify",
    source_list: ["Spotify", "Amazon Music", "iHeartRadio", "TuneIn"],
    supported_features: 65e3,
    entity_picture: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop"
  }),
  "media_player.bedroom_speaker": entity("media_player.bedroom_speaker", "idle", "Bedroom Speaker", {
    volume_level: 0.2,
    is_volume_muted: false,
    source_list: ["Spotify", "Sleep Sounds", "Radio", "Line In"],
    supported_features: 65e3
  }),
  "media_player.office_monitor": entity("media_player.office_monitor", "playing", "Office Sonos Era", {
    media_title: "Focus Flow",
    media_artist: "Apple Music",
    volume_level: 0.15,
    is_volume_muted: false,
    source: "Apple Music",
    source_list: ["Apple Music", "Spotify", "Radio Paradise", "Airport Utility"],
    supported_features: 65e3,
    entity_picture: "https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?q=80&w=400&auto=format&fit=crop"
  }),
  "media_player.patio_speaker": entity("media_player.patio_speaker", "off", "Patio Speaker", {
    volume_level: 0.4,
    is_volume_muted: false,
    source_list: ["Spotify", "Pandora", "Bluetooth"],
    supported_features: 65e3
  }),
  "media_player.kids_room_speaker": entity("media_player.kids_room_speaker", "paused", "Kids Room Echo", {
    media_title: "Kidz Bop 2025",
    media_artist: "Kidz Bop",
    volume_level: 0.3,
    is_volume_muted: false,
    source: "Amazon Music",
    supported_features: 65e3
  }),
  // ── REMOTE ────────────────────────────────────────────────────────────────
  "remote.living_room_hub": entity("remote.living_room_hub", "on", "Living Room Hub", {
    current_activity: "Watch TV",
    activity_list: ["Watch TV", "Watch Movies", "Gaming", "Listen Music", "PowerOff"]
  }),
  "remote.bedroom_tv": entity("remote.bedroom_tv", "off", "Bedroom TV Remote", {
    current_activity: "PowerOff",
    activity_list: ["Watch TV", "Watch Movies", "Sleep Timer"]
  }),
  // ── COVERS / BLINDS ───────────────────────────────────────────────────────
  "cover.living_room_blinds": entity("cover.living_room_blinds", "open", "Living Room Blinds", {
    current_position: 85,
    device_class: "blind",
    supported_features: 7
  }),
  "cover.living_room_curtains": entity("cover.living_room_curtains", "open", "Living Room Curtains", {
    current_position: 100,
    device_class: "curtain",
    supported_features: 7
  }),
  "cover.master_bedroom_shades": entity("cover.master_bedroom_shades", "closed", "Bedroom Blackout", {
    current_position: 0,
    device_class: "shade",
    supported_features: 7
  }),
  "cover.office_blinds": entity("cover.office_blinds", "open", "Office Blinds", {
    current_position: 50,
    device_class: "blind",
    supported_features: 7
  }),
  "cover.dining_room_blinds": entity("cover.dining_room_blinds", "open", "Dining Blinds", {
    current_position: 70,
    device_class: "blind",
    supported_features: 7
  }),
  "cover.garage_door": entity("cover.garage_door", "closed", "Garage Door", {
    current_position: 0,
    device_class: "garage",
    supported_features: 3
  }),
  "cover.back_patio_door": entity("cover.back_patio_door", "open", "Patio Door", {
    current_position: 100,
    device_class: "door",
    supported_features: 3
  }),
  "cover.sunroof_skylight": entity("cover.sunroof_skylight", "closed", "Skylight", {
    current_position: 0,
    device_class: "window",
    supported_features: 7
  }),
  // ── LOCKS ─────────────────────────────────────────────────────────────────
  "lock.front_door": entity("lock.front_door", "locked", "Front Door", {
    device_class: "lock",
    changed_by: "Alex",
    code_format: "number"
  }),
  "lock.back_door": entity("lock.back_door", "locked", "Back Door", {
    device_class: "lock",
    changed_by: "Keypad"
  }),
  "lock.garage_side": entity("lock.garage_side", "unlocked", "Garage Side Door", {
    device_class: "lock"
  }),
  // ── SECURITY ──────────────────────────────────────────────────────────────
  "alarm_control_panel.home": entity("alarm_control_panel.home", "armed_home", "Home Alarm", {
    supported_features: 63,
    code_format: "number",
    changed_by: "Alex"
  }),
  "binary_sensor.front_door_contact": entity("binary_sensor.front_door_contact", "off", "Front Door", {
    device_class: "door"
  }),
  "binary_sensor.back_door_contact": entity("binary_sensor.back_door_contact", "off", "Back Door", {
    device_class: "door"
  }),
  "binary_sensor.garage_motion": entity("binary_sensor.garage_motion", "off", "Garage Motion", {
    device_class: "motion"
  }),
  "binary_sensor.front_yard_motion": entity("binary_sensor.front_yard_motion", "off", "Front Yard Motion", {
    device_class: "motion"
  }),
  "binary_sensor.doorbell": entity("binary_sensor.doorbell", "off", "Doorbell", {
    device_class: "sound"
  }),
  "binary_sensor.smoke_kitchen": entity("binary_sensor.smoke_kitchen", "off", "Kitchen Smoke", {
    device_class: "smoke"
  }),
  "binary_sensor.co_detector": entity("binary_sensor.co_detector", "off", "CO Detector", {
    device_class: "carbon_monoxide"
  }),
  "binary_sensor.window_master": entity("binary_sensor.window_master", "off", "Master Window", {
    device_class: "window"
  }),
  "binary_sensor.window_office": entity("binary_sensor.window_office", "on", "Office Window", {
    device_class: "window"
  }),
  // ── CAMERAS ───────────────────────────────────────────────────────────────
  "camera.front_door": entity("camera.front_door", "idle", "Front Door Cam", {
    entity_picture: "https://images.unsplash.com/photo-1560520653-5777839fd4a7?q=80&w=1200&auto=format&fit=crop"
  }),
  "camera.backyard": entity("camera.backyard", "idle", "Backyard Cam", {
    entity_picture: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=1200&auto=format&fit=crop"
  }),
  "camera.garage": entity("camera.garage", "idle", "Garage Cam", {
    entity_picture: "https://images.unsplash.com/photo-1558004238-5ca3d9ad9e67?q=80&w=1200&auto=format&fit=crop"
  }),
  "camera.driveway": entity("camera.driveway", "idle", "Driveway Cam", {
    entity_picture: "https://images.unsplash.com/photo-1546630392-db5b1f04874a?q=80&w=1200&auto=format&fit=crop"
  }),
  // ── SENSORS — ENVIRONMENT ─────────────────────────────────────────────────
  "sensor.living_room_temp": entity("sensor.living_room_temp", "74.2", "Living Room Temp", {
    unit_of_measurement: "°F",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.living_room_humidity": entity("sensor.living_room_humidity", "49", "Living Room Humidity", {
    unit_of_measurement: "%",
    device_class: "humidity",
    state_class: "measurement"
  }),
  "sensor.master_bedroom_temp": entity("sensor.master_bedroom_temp", "68.5", "Bedroom Temp", {
    unit_of_measurement: "°F",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.office_co2": entity("sensor.office_co2", "610", "Office CO₂", {
    unit_of_measurement: "ppm",
    device_class: "carbon_dioxide",
    state_class: "measurement"
  }),
  "sensor.office_temp": entity("sensor.office_temp", "76.1", "Office Temp", {
    unit_of_measurement: "°F",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.outdoor_air_quality": entity("sensor.outdoor_air_quality", "28", "Outdoor AQI", {
    unit_of_measurement: "µg/m³",
    device_class: "pm25",
    state_class: "measurement"
  }),
  "sensor.outdoor_temp": entity("sensor.outdoor_temp", "72", "Outdoor Temp", {
    unit_of_measurement: "°F",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.outdoor_uv": entity("sensor.outdoor_uv", "4", "UV Index", {
    unit_of_measurement: "",
    state_class: "measurement"
  }),
  "sensor.pool_temp": entity("sensor.pool_temp", "81", "Pool Temp", {
    unit_of_measurement: "°F",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.pool_ph": entity("sensor.pool_ph", "7.4", "Pool pH", {
    unit_of_measurement: "pH",
    state_class: "measurement"
  }),
  "sensor.pool_chlorine": entity("sensor.pool_chlorine", "2.1", "Pool Chlorine", {
    unit_of_measurement: "ppm",
    state_class: "measurement"
  }),
  // ── SENSORS — ENERGY ──────────────────────────────────────────────────────
  "sensor.grid_power": entity("sensor.grid_power", "3240", "Grid Power", {
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement"
  }),
  "sensor.solar_power": entity("sensor.solar_power", "5180", "Solar Production", {
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement"
  }),
  "sensor.battery_soc": entity("sensor.battery_soc", "78", "Battery Charge", {
    unit_of_measurement: "%",
    device_class: "battery",
    state_class: "measurement"
  }),
  "sensor.daily_energy_consumed": entity("sensor.daily_energy_consumed", "18.4", "Energy Used Today", {
    unit_of_measurement: "kWh",
    device_class: "energy",
    state_class: "total_increasing"
  }),
  "sensor.daily_solar_generated": entity("sensor.daily_solar_generated", "24.7", "Solar Today", {
    unit_of_measurement: "kWh",
    device_class: "energy",
    state_class: "total_increasing"
  }),
  "sensor.energy_cost_today": entity("sensor.energy_cost_today", "3.12", "Energy Cost Today", {
    unit_of_measurement: "USD",
    state_class: "total_increasing"
  }),
  "sensor.ev_charger_power": entity("sensor.ev_charger_power", "7200", "EV Charger", {
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement"
  }),
  // ── SENSORS — NETWORK & SYSTEM ────────────────────────────────────────────
  "sensor.internet_download": entity("sensor.internet_download", "945", "Download Speed", {
    unit_of_measurement: "Mbps",
    state_class: "measurement"
  }),
  "sensor.internet_upload": entity("sensor.internet_upload", "940", "Upload Speed", {
    unit_of_measurement: "Mbps",
    state_class: "measurement"
  }),
  "sensor.nas_disk_usage": entity("sensor.nas_disk_usage", "68", "NAS Disk Usage", {
    unit_of_measurement: "%",
    state_class: "measurement"
  }),
  "sensor.nas_cpu_temp": entity("sensor.nas_cpu_temp", "52", "NAS CPU Temp", {
    unit_of_measurement: "°C",
    device_class: "temperature",
    state_class: "measurement"
  }),
  "sensor.pi_hole_blocked": entity("sensor.pi_hole_blocked", "23.4", "Ads Blocked", {
    unit_of_measurement: "%",
    state_class: "measurement"
  }),
  "sensor.ha_cpu_usage": entity("sensor.ha_cpu_usage", "8", "HA CPU", {
    unit_of_measurement: "%",
    state_class: "measurement"
  }),
  "sensor.ha_memory_usage": entity("sensor.ha_memory_usage", "34", "HA Memory", {
    unit_of_measurement: "%",
    state_class: "measurement"
  }),
  // ── SENSORS — WATER ───────────────────────────────────────────────────────
  "sensor.water_usage_today": entity("sensor.water_usage_today", "88", "Water Used Today", {
    unit_of_measurement: "gal",
    device_class: "water",
    state_class: "total_increasing"
  }),
  "binary_sensor.water_leak_basement": entity("binary_sensor.water_leak_basement", "off", "Basement Leak", {
    device_class: "moisture"
  }),
  "binary_sensor.water_leak_kitchen": entity("binary_sensor.water_leak_kitchen", "off", "Kitchen Leak", {
    device_class: "moisture"
  }),
  "binary_sensor.water_leak_laundry": entity("binary_sensor.water_leak_laundry", "off", "Laundry Leak", {
    device_class: "moisture"
  }),
  // ── SWITCHES ──────────────────────────────────────────────────────────────
  "switch.sprinkler_front": entity("switch.sprinkler_front", "off", "Front Lawn", {
    icon: "mdi:sprinkler"
  }),
  "switch.sprinkler_back": entity("switch.sprinkler_back", "off", "Back Lawn", {
    icon: "mdi:sprinkler"
  }),
  "switch.sprinkler_garden": entity("switch.sprinkler_garden", "off", "Garden Drip", {
    icon: "mdi:flower"
  }),
  "switch.pool_pump": entity("switch.pool_pump", "on", "Pool Pump", {
    icon: "mdi:pump"
  }),
  "switch.pool_heater": entity("switch.pool_heater", "off", "Pool Heater", {
    icon: "mdi:fire"
  }),
  "switch.hot_tub": entity("switch.hot_tub", "off", "Hot Tub Jets", {
    icon: "mdi:hot-tub"
  }),
  "switch.ev_charger": entity("switch.ev_charger", "on", "EV Charger", {
    icon: "mdi:ev-station"
  }),
  "switch.christmas_lights": entity("switch.christmas_lights", "off", "Holiday Lights", {}),
  "switch.driveway_heater": entity("switch.driveway_heater", "off", "Driveway Heater", {
    icon: "mdi:heating-coil"
  }),
  // ── NUMBER / SLIDER INPUTS ────────────────────────────────────────────────
  "number.sprinkler_duration": entity("number.sprinkler_duration", "15", "Sprinkler Duration", {
    min: 1,
    max: 60,
    step: 5,
    unit_of_measurement: "min",
    mode: "slider"
  }),
  "number.pool_target_temp": entity("number.pool_target_temp", "82", "Pool Target Temp", {
    min: 60,
    max: 104,
    step: 1,
    unit_of_measurement: "°F",
    mode: "slider"
  }),
  "number.hot_tub_temp": entity("number.hot_tub_temp", "100", "Hot Tub Target", {
    min: 60,
    max: 104,
    step: 1,
    unit_of_measurement: "°F",
    mode: "slider"
  }),
  "number.living_room_light_schedule": entity("number.living_room_light_schedule", "22", "Lights Off At", {
    min: 18,
    max: 24,
    step: 0.5,
    unit_of_measurement: "h",
    mode: "slider"
  }),
  // ── INPUT SELECTS ─────────────────────────────────────────────────────────
  "input_select.scene_mode": entity("input_select.scene_mode", "Relaxing", "Scene Mode", {
    options: ["Morning", "Day", "Relaxing", "Movie", "Dinner", "Sleep", "Away", "Party"]
  }),
  "input_select.audio_source": entity("input_select.audio_source", "Spotify", "Audio Source", {
    options: ["Spotify", "Apple Music", "Amazon Music", "Radio", "Bluetooth"]
  }),
  "input_select.vacation_mode": entity("input_select.vacation_mode", "Home", "Home Status", {
    options: ["Home", "Away", "Vacation", "Guest Mode"]
  }),
  // ── VACUUM ────────────────────────────────────────────────────────────────
  "vacuum.main_floor": entity("vacuum.main_floor", "cleaning", "Roomba 960 — Main", {
    battery_level: 78,
    fan_speed: "balanced",
    fan_speed_list: ["quiet", "balanced", "performance", "max"],
    status: "Cleaning"
  }),
  "vacuum.upstairs": entity("vacuum.upstairs", "docked", "iRobot — Upstairs", {
    battery_level: 100,
    fan_speed: "balanced",
    fan_speed_list: ["quiet", "balanced", "performance", "max"],
    status: "Docked"
  }),
  // ── LAWN MOWER ────────────────────────────────────────────────────────────
  "lawn_mower.husqvarna": entity("lawn_mower.husqvarna", "docked", "Husqvarna Automower", {
    battery_level: 92,
    activity: "docked"
  }),
  // ── UPDATES ───────────────────────────────────────────────────────────────
  "update.home_assistant_core": entity("update.home_assistant_core", "on", "Home Assistant Core", {
    installed_version: "2024.12.5",
    latest_version: "2025.1.0",
    in_progress: false,
    auto_update: false,
    title: "Home Assistant"
  }),
  "update.home_assistant_os": entity("update.home_assistant_os", "off", "Home Assistant OS", {
    installed_version: "13.1",
    latest_version: "13.1",
    in_progress: false,
    auto_update: true,
    title: "HA OS"
  }),
  "update.eero_firmware": entity("update.eero_firmware", "on", "eero 6 Pro Router", {
    installed_version: "7.2.0",
    latest_version: "7.3.1",
    in_progress: false,
    auto_update: false,
    title: "eero"
  }),
  "update.ring_doorbell": entity("update.ring_doorbell", "off", "Ring Video Doorbell", {
    installed_version: "3.4.8",
    latest_version: "3.4.8",
    in_progress: false,
    auto_update: true,
    title: "Ring Doorbell"
  }),
  "update.lutron_bridge": entity("update.lutron_bridge", "off", "Lutron Caseta Bridge", {
    installed_version: "8.2.0",
    latest_version: "8.2.0",
    in_progress: false,
    auto_update: true,
    title: "Lutron Bridge"
  }),
  "update.nest_thermostat": entity("update.nest_thermostat", "on", "Nest Thermostat", {
    installed_version: "6.2.1",
    latest_version: "6.3.0",
    in_progress: false,
    auto_update: false,
    title: "Nest Thermostat"
  }),
  // ── TIMER ─────────────────────────────────────────────────────────────────
  "timer.oven": entity("timer.oven", "active", "Oven Timer", {
    duration: "00:45:00",
    remaining: "00:28:44",
    finishes_at: PAST(-28)
  }),
  "timer.laundry": entity("timer.laundry", "idle", "Laundry Timer", {
    duration: "01:10:00",
    remaining: "01:10:00"
  }),
  "timer.sprinkler_zone_1": entity("timer.sprinkler_zone_1", "idle", "Front Lawn Timer", {
    duration: "00:15:00",
    remaining: "00:00:00"
  }),
  "timer.bedtime_reminder": entity("timer.bedtime_reminder", "idle", "Bedtime Reminder", {
    duration: "00:30:00",
    remaining: "00:00:00"
  }),
  // ── TODO ──────────────────────────────────────────────────────────────────
  "todo.grocery_list": entity("todo.grocery_list", "5", "Grocery List", {
    supported_features: 15
  }),
  "todo.home_tasks": entity("todo.home_tasks", "3", "Home Tasks", {
    supported_features: 15
  }),
  "todo.shopping": entity("todo.shopping", "7", "Shopping", {
    supported_features: 15
  }),
  // ── SCENES (shown as button tiles) ───────────────────────────────────────
  "scene.wake_up": entity("scene.wake_up", "scening", "Wake Up", {}),
  "scene.leave_home": entity("scene.leave_home", "scening", "Leave Home", {}),
  "scene.arrive_home": entity("scene.arrive_home", "scening", "Arrive Home", {}),
  "scene.movie_night": entity("scene.movie_night", "scening", "Movie Night", {}),
  "scene.dinner_party": entity("scene.dinner_party", "scening", "Dinner Party", {}),
  "scene.good_night": entity("scene.good_night", "scening", "Good Night", {}),
  "scene.weekend_morning": entity("scene.weekend_morning", "scening", "Weekend Morning", {}),
  "scene.work_from_home": entity("scene.work_from_home", "scening", "Work From Home", {}),
  "scene.romantic_evening": entity("scene.romantic_evening", "scening", "Romantic Evening", {}),
  "scene.party_mode": entity("scene.party_mode", "scening", "Party Mode", {}),
  "scene.kids_bedtime": entity("scene.kids_bedtime", "scening", "Kids Bedtime", {}),
  "scene.all_off": entity("scene.all_off", "scening", "All Off", {})
});

export { MOBILE_SECTION_COLS as M, getSectionMaxColumns as a, getAdaptiveColumns as b, connectionStatus as c, dashboardStore as d, entities as e, connection as f, getAllowedPresets as g, configStore as h, error as i, normalizeTilesForColumns as n };
//# sourceMappingURL=entities-BORCzbLn.js.map
