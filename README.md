# Stratum

A fast, highly customizable Home Assistant dashboard add-on with a clean, tile-first layout editor, real-time entity updates, and deep theming.

---

## Installation

### Add-on (recommended)

Add the repository to your Home Assistant instance, then install the **Stratum** add-on from the store.

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fuser83749%2Fha-stratum.git)

Or manually add: `https://github.com/user83749/ha-stratum.git`

After installing and starting the add-on, it will appear in your Home Assistant sidebar as a panel.

---

### Docker

Stratum publishes separate images per architecture:
- `ghcr.io/user83749/ha-stratum-amd64`
- `ghcr.io/user83749/ha-stratum-aarch64`

```bash
docker run -d \
  --name ha-stratum \
  -p 8099:8099 \
  -e ADDON=false \
  ghcr.io/user83749/ha-stratum-amd64:latest
```

Open `http://<your-host>:8099` in a browser.

**Docker Compose:**

```yaml
services:
  ha-stratum:
    image: ghcr.io/user83749/ha-stratum-amd64:latest
    ports:
      - "8099:8099"
    environment:
      ADDON: "false"
    restart: unless-stopped
```

For ARM64 (aarch64), use `ghcr.io/user83749/ha-stratum-aarch64:latest` (or pin to `:1.0.0`).

---

## Features

### Dashboard
- Responsive, section-based grid layout
- Lots of tile types (entities, lights, climate, media player, history, gauges, camera, weather, and more)
- Conditional tiles (render different tiles based on entity state)
- Custom icons (built-in + user-defined)

### Navigation
- Desktop + mobile navigation with swipe support on touch devices

### Theming
- Built-in theme presets (dark + light)
- Theme tokens exposed as CSS variables (accent, surfaces, text, borders, shadows)

### Edit Mode
- Drag-and-drop tiles and resize by dragging the corner handle
- Tile editor + section/page editors
- **Undo/redo**

### More
- Cmd/Ctrl+K search
- Favorites (pin entities in the header and/or navigation)
- User profiles

---

## Requirements

- Home Assistant 2024.1 or newer (for best compatibility)
- A [Long-Lived Access Token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-token) from your HA profile page

---

## First-Time Setup

1. Open Stratum from the sidebar (or navigate to its URL)
2. You will be redirected to the **Connect** page
3. Enter your **Home Assistant URL** (e.g. `http://homeassistant.local:8123`)
4. Paste a **Long-Lived Access Token** from `Profile > Security > Long-lived access tokens`
5. Click **Connect**

---

## License

MIT
