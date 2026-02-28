# Stratum

A fully customizable Home Assistant dashboard. Built with SvelteKit and Svelte 5, designed for speed, real-time entity updates, and deep user customization across all screen sizes — from mobile phones to wall-mounted tablets.

---

## Features

### Dashboard
- **Free-form 12-column grid** — place tiles anywhere, any size, with per-breakpoint overrides (desktop / tablet / mobile)
- **22 tile types** — entity, light, climate, media player, camera, weather, history chart, gauge, button, cover, lock, fan, alarm panel, vacuum, energy, to-do list, markdown, iframe, image, clock, calendar, divider
- **5 tile variants** — default (filled card), minimal, glass (frosted blur), outline, flat
- **Per-tile conditions** — show/hide tiles based on entity state
- **Entity badges** — overlay entity state badges on any tile corner
- **Responsive visibility** — independently show or hide any tile, section, or nav item at each breakpoint
- **Section layouts** — grid, list, or masonry

### Navigation
- **Three nav positions** — left sidebar, top bar, or bottom bar
- **Three nav styles** — default, floating, minimal
- **Mobile nav** — bottom tab bar, sliding drawer, or hidden
- **Custom ordering** — drag pages and custom links into any order
- **Nav badges** — entity-state-driven notification badges on nav items
- **Sidebar sizing** — configurable width and collapsed width

### Theming
- **15 built-in theme presets** — dark and light options (midnight, slate, ocean, forest, violet, aurora, ember, copper, rose, snow, linen, arctic, sage, dusk, and more)
- **26 background presets** — solids, gradients, and mesh gradients
- **Full customization** — accent color, surface color, font, border radius, dense mode, blur/glass effect, animations
- **Light / dark / system** color scheme
- **Per-page backgrounds** — override the global background on any page (solid, gradient, image, video)
- **Automatic theme scheduling** — switch between day/night themes on a time schedule or based on HA `sun.sun`
- **CSS variable escape hatch** — inject any custom CSS variable or raw CSS

### Pages
- **Multiple pages** — unlimited pages, each with its own icon, background, and layout
- **Three page layouts** — standard scrolling, sidebar panel, or full-bleed
- **Sidebar layout** — fixed side panel + scrolling main area, configurable ratio (left or right)
- **HA area association** — link a page to a HA area for filtering and badge automation
- **Per-page transitions** — override the global page transition (slide, fade, scale, none)
- **Time-based pages** — auto-navigate to a specific page at set times (e.g. a goodnight page after 10 PM)
- **Admin-only pages** — hide pages from non-admin profiles

### Edit Mode
- **Drag-and-drop** tile placement on the grid
- **Resize** tiles by dragging the corner handle
- **Snap to grid** — optional grid snapping with a visual column/row overlay
- **Inline tile editor** — change entity, name, icon, color, variant, actions, and all type-specific config
- **Add tiles** — browse or search all HA entities and tile types
- **Section and page editors** — rename, reorder, configure layout and grid settings
- **Confirm-before-delete** — optional safety prompt before removing tiles or sections
- **Auto-save** — changes persist to the server immediately (configurable)

### More-Info Dialogs
- **Three styles** — centered modal, side drawer, or docked panel
- **Domain-aware content** — dedicated UI for lights, climate, media players, cameras, covers
- **Related entities** — optionally show other entities from the same HA area/device

### Search
- **Cmd+K / Ctrl+K** command palette
- **Search entities, pages, scripts, scenes, and automations**
- **Configurable hotkey and include/exclude scopes**

### Wall Tablet / Kiosk
- **Kiosk mode** — hide nav, header, and FAB for a clean wall display; optional PIN to exit
- **Screensaver** — idle timeout with dim, black, clock, or image screensaver
- **Swipe navigation** — horizontal swipe gesture to change pages
- **Theme schedule** — automatic day/night theme based on time or sunrise/sunset

### Favorites
- **Pin entities** for quick access
- **Show in header** as a compact entity row beneath the header bar
- **Show in nav** as a pinned section at the bottom of the sidebar

### Settings
- **Locale and time format** — 12h or 24h, date format, first day of week
- **Unit system** — metric, imperial, or read from HA config
- **Temperature and precipitation units** — auto or explicit
- **Currency** for energy cost display
- **Reduced motion** — independent of the animations toggle, for motion-sensitive users
- **Custom CSS** — raw CSS injected after theme variables for full escape-hatch control
- **Energy configuration** — map grid consumption, solar production, battery, and grid-return entities; set cost per kWh
- **Notification preferences** — HA persistent notifications, entity alerts, sound, position, duration
- **Connection** — HA URL and long-lived access token (stored locally, never sent to any server)
- **User profiles** — named profiles with independent default page and pinned pages

---

## Requirements

- Home Assistant 2024.1 or newer
- A [Long-Lived Access Token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token) from your HA profile page

---

## Installation

### Option 1 — Home Assistant Add-on (recommended)

1. Copy the `ha-stratum` directory (including `config.yaml`, `Dockerfile`, and `run.sh`) to the `/addons` directory on your Home Assistant host.
2. Go to **Settings > Add-ons**.
3. Click **Add-on Store** in the bottom-right corner.
4. Click the **three dots** in the top-right and select **Check for updates**.
5. You should now see a **Local Add-ons** section with **Stratum**.
6. Select it and click **Install**.
7. Once installed, start the add-on and click **Open Web UI**.

### Option 2 — Docker (standalone)

```bash
docker run -d \
  --name ha-stratum \
  -p 5173:5173 \
  -e HASS_URL=http://homeassistant.local:8123 \
  -v ha-stratum-data:/data \
  ha-stratum:latest
```

Open `http://<your-docker-host>:5173` in a browser. On first load you will be prompted to enter your HA URL and a long-lived access token.

**Docker Compose:**

```yaml
services:
  ha-stratum:
    image: ha-stratum:latest
    ports:
      - "5173:5173"
    environment:
      HASS_URL: http://homeassistant.local:8123
    volumes:
      - ha-stratum-data:/data

volumes:
  ha-stratum-data:
```

### Option 3 — Standalone Node.js

```bash
# Clone and install
git clone https://github.com/yourname/ha-stratum.git
cd ha-stratum
npm install

# Build
npm run build

# Configure (copy and edit .env)
cp .env.example .env
# Edit .env: set HASS_URL if desired

# Run
node server.js
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5173` | HTTP port the server listens on |
| `HASS_URL` | `http://homeassistant.local:8123` | Home Assistant base URL (standalone / Docker mode) |
| `ADDON` | `false` | Set to `true` when running as an HA add-on |
| `EXPOSED_PORT` | — | External port when using HA add-on with direct port exposure |
| `HASS_PORT` | — | Internal HA port for port-substitution proxy mode |

---

## First-Time Setup

1. Open Stratum in a browser
2. You will be redirected to the **Connect** page
3. Enter your **Home Assistant URL** (e.g. `http://homeassistant.local:8123`)
4. Paste a **Long-Lived Access Token** from your HA profile (`Profile > Security > Long-lived access tokens`)
5. Click **Connect** — Stratum will verify the connection and load your dashboard

---

## Development

```bash
npm install
npm run dev          # starts Vite dev server at http://localhost:5173
```

The dev server uses SvelteKit's built-in server. For HA API calls to work during development, either:
- Set `HASS_URL` in `.env` and run `node server.js` instead, or
- Configure a browser extension to allow CORS from your HA instance

```bash
npm run check        # TypeScript type checking
npm run build        # production build → /build
node server.js       # run production build with the Express proxy
```

---

## Configuration Storage

Dashboard configuration is stored as `dashboard.json`:

- **Add-on mode**: `/data/dashboard.json` (persisted HA volume)
- **Standalone / Docker**: `./data/dashboard.json` (relative to `server.js`)

Your HA URL and access token are stored in the **browser's `localStorage`** only — they are never written to the server or included in the dashboard config file.

---

## Project Structure

See [`docs/PLAN.md`](docs/PLAN.md) for the full folder structure, implementation phases, and architectural decisions.

```
src/lib/
├── components/
│   ├── ui/          generic reusable primitives
│   ├── layout/      nav, header, page, section grid
│   ├── tiles/       one component per tile type
│   ├── dialogs/     more-info modal / drawer
│   ├── edit/        edit mode drag-drop UI
│   └── settings/    settings panel tabs
├── ha/              HA WebSocket + entity helpers
├── stores/          dashboard config, edit mode, UI state
├── themes/          CSS variable application + presets
├── types/           TypeScript schema (SCHEMA_VERSION=4)
└── utils/           formatting, color, id helpers
```

---

## License

MIT
