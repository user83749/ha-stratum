# Changelog

## [1.1.0] - 2026-03-17

### Added
- **Stream Resilience**: Enhanced WebRTC connection state monitoring to detect networking failures early and trigger HLS fallbacks.
- **Improved Stream Reliability**: Implemented hard 15-second timeouts for WebRTC ICE gathering and HLS manifest loading to prevent infinite "loading" states.
- **Advanced Diagnostics**: Added descriptive error messages for common streaming failures like missing permissions or unsupported commands.
- **Enhanced WebRTC Logic**: Added explicit tracking and verification of incoming video tracks before marking a stream as ready.
- **Visual Feedback**: Integrated "LIVE" badges and status-specific overlays to provide immediate connection feedback.

### Fixed
- **Cleanup**: Removed legacy camera proxy fallback logic and associated CSS for a leaner component.
- **Component Stability**: Improved video element attachment tracking to prevent stream double-initialization on rapid feed switches.


## [1.1.0] - 2026-03-17

### Added
- **Stream Resilience**: Enhanced WebRTC connection state monitoring to detect networking failures early and trigger HLS fallbacks.
- **Improved Stream Reliability**: Implemented hard 15-second timeouts for WebRTC ICE gathering and HLS manifest loading to prevent infinite "loading" states.
- **Advanced Diagnostics**: Added descriptive error messages for common streaming failures like missing permissions or unsupported commands.
- **Enhanced WebRTC Logic**: Added explicit tracking and verification of incoming video tracks before marking a stream as ready.
- **Visual Feedback**: Integrated "LIVE" badges and status-specific overlays to provide immediate connection feedback.

### Fixed
- **Cleanup**: Removed legacy camera proxy fallback logic and associated CSS for a leaner component.
- **Component Stability**: Improved video element attachment tracking to prevent stream double-initialization on rapid feed switches.


## [1.0.64] - 2026-03-16

### Added
- **Hybrid Camera Streaming**: Re-introduced **WebRTC** support with an automatic **HLS** fallback. The system now dynamically detects the preferred stream type from Home Assistant and coordinates the transition between protocols for the best balance of latency and compatibility.

### Changed
- **Stream Coordination**: Improved internal state management and teardown logic to handle high-latency or failing connection attempts gracefully during fast feed switching.

## [1.0.63] - 2026-03-16

### Fixed
- **Camera Streaming**: Improved HLS URL resolution to correctly handle ingress path prefixing and relative URLs across various Home Assistant installation types.

## [1.0.62] - 2026-03-16

### Changed
- **Performance Optimization**: Integrated Svelte `untrack` in the camera dialog to prevent unnecessary effect re-runs when feed data remains static.

## [1.0.61] - 2026-03-16

### Changed
- **Camera Dialog**: Refined stream coordination logic to ensure smoother transitions when switching between multiple camera feeds.
- **Internal State**: Improved effect cleanup handling for asynchronous streaming requests.

## [1.0.60] - 2026-03-16

### Fixed
- **Camera Streaming**: Fixed HLS stream URL resolution to correctly handle relative paths returned by some Home Assistant configurations.

### Changed
- **UI Refinement**: Simplified the `CameraMoreInfo` dialog by removing the loading spinner overlay for a faster, cleaner feel.

## [1.0.59] - 2026-03-16

### Changed
- **Internal Optimization**: Refactored camera stream tracking to use non-reactive state for better internal coordination and reduced overhead.

## [1.0.58] - 2026-03-16

### Changed
- **Camera Streaming**: Switched back to HLS streaming for broader device compatibility.
- **Improved Reactivity**: Implemented request cancellation and more robust state tracking in `CameraMoreInfo` to prevent race conditions during feed switching.

## [1.0.57] - 2026-03-16

### Changed
- **WebRTC Stability**: Added connection state validation for camera streaming to prevent errors during network transitions.
- **UI/UX Refinements**: Introduced subtle hover scaling and brightness effects for interactive chips in horizontal rows.
- **Type Safety**: Improved type Definitions for camera WebSocket service calls.

## [1.0.56] - 2026-03-15

### Changed
- **Camera Dialog Refinements**: Significantly improved reactivity and state management for camera feeds using Svelte 5 `$derived.by` patterns.
- Optimized stream state transitions for smoother feed switching.
- Fixed minor accessibility lint warnings in the camera overlay.

## [1.0.55] - 2026-03-15

### Added
- **Notification Badge System**: New `notificationBadge` store for persistent alert tracking across domains (alerts, updates, binary sensors, alarm panels).
- Added support for configurable alert state mapping in settings.

### Changed
- **Mobile Layout Refinements**: Improved bottom-bar insets and navigation behavior on mobile devices.
- **Pinned Sections**: Refined handling of bottom-pinned chip rows for better visual integration.
- **Component Consistency**: Updated `AppHeader`, `PageView`, `SectionHorizontalChipRow`, and `SectionList` for improved layout predictability.
- **Dialogs**: Refined `CameraMoreInfo` dialog behavior and migrated camera streaming to **WebRTC** for significantly lower latency.
- **Settings**: Enhanced `AlertsSettings` and `NavSettings` panels.

## [1.0.54] - 2026-03-15

### Changed
- **Major Architecture Upgrade**: Migrated to latest SvelteKit/Vite ecosystem with a refined dependency tree.
- **Dependency Cleanup**: Removed legacy packages including `svelte-sonner`, `tailwind-variants`, `vanilla-tilt`, and `svelte-dnd-action`.
- Updated `lucide-svelte` to `^0.577.0`.
- Refined Docker publishing workflow for `aarch64` optimization and image verification.
- Updated `docker-publish` action to `v6`.

## [1.0.53] - 2026-03-15

### Added
- Added shared section rendering support for more consistent page layouts.

### Changed
- Improved page rendering consistency and reduced duplicated layout logic.
- Refined dashboard editing experience and entity selection behavior.
- Improved animation compatibility across embedded/webview environments.
- Improved overlay and navigation behavior across the app.
- Refined weather, camera, and background display behavior for better reliability.
- Applied broad component cleanup and fixed related display regressions.

## [1.0.52] - 2026-03-14

### Added
- New **AlertsSettings** component for managing system-wide notification and alert preferences.
- Support for **adaptive section layout** transitions between grid and chip modes.

### Changed
- Extensive UI/UX updates to navigation components: `IntegratedNavRail` and `ShellNav`.
- Refined `SectionHorizontalChipRow` for better scroll performance and sizing.
- Improved `CameraMoreInfo` dialog with smoother video scaling.
- Enhanced `SettingsPanel` layout and `NotificationsPanel` interaction logic.
- Robust state synchronization in `dashboard.ts` store for complex section migrations.
- Improved layout rendering in `PageView` and `SectionEditor`.

## [1.0.51] - 2026-03-14

### Changed
- Refined websocket connection logic and error handling in `websocket.ts`.
- Improved server-side relay stabilization in `server.js`.
- Optimized the main layout's reactive resizing logic.

## [1.0.50] - 2026-03-14

### Added
- New **Layout Mode** for sections, supporting both `grid` and the new `horizontal_chip_row` layouts.
- New **Pin Mode** for sections, allowing them to be pinned to the `top` or `bottom` of the page.
- New `SectionHorizontalChipRow` component for fluid, scrollable chip-style section layouts.

### Changed
- Extensive refactor and expansion of editing components: `SectionEditor`, `TileEditor`, and `TilePicker` to support new section properties.
- Improved `SectionGrid` and `PageView` responsiveness to handle pinned sections and dynamic layout modes.
- Enhanced Home Assistant websocket stability and connection resilience.
- Refined `dashboard.ts` store and type definitions for better state synchronization.
- General UI refinements on the main dashboard page.

## [1.0.49] - 2026-03-14

### Added
- New **Authentication Configuration** API endpoints for managed environment setup.
- Support for `camera` entity streaming in the new `CameraMoreInfo` dialog.

### Changed
- Extensive updates to `CameraMoreInfo`, `MoreInfoDialog`, and `MoreInfoShell` dialogs.
- Improved `CameraTile` and `TileWrapper` rendering logic for better stability.
- Enhancements to `TileEditor`, `NavSettings`, `ProfilesSettings`, and `NotificationsPanel` UI handling.
- Optimized websocket stability and `dashboard.ts` store logic.
- Server-side component fixes in `server.js` and layout routines.

## [1.0.48] - 2026-03-12

### Changed
- Extensive updates to `ClimateTile`, `MediaHeroTile`, `MediaPlayerTile`, and `TimerTile` for better rendering and stability.
- Refined `MoreInfoShell` and `ThemeSettings` components.
- Improved `CommandPalette` functionality and UI.
- Enhanced optimistic update handling and websocket stability in core HA logic.
- Updated `dashboard` store logic for more robust synchronization.

## [1.0.47] - 2026-03-12

### Changed
- Refined `tile-tokens.css` for enhanced styling consistency across the board.
- Extensive updates to various tile components highlighting improved stability and rendering (Climate, Fan, Light, MediaPlayer, Slider, Update, Vacuum, etc.).
- Updated theme presets and application logic in `apply.ts`.
- Improved dashboard type definitions for better state management.

## [1.0.46] - 2026-03-10

### Changed
- Extensive cleanup and refactor for various tile components (Button, Lock, Map, MediaPlayer, Person, Remote, Siren, Slider, TileWrapper, Timer, Todo, Update, Vacuum, WaterHeater, Weather).
- Improved `SectionEditor` UI and functionality for better dashboard customization.
- Enhanced core tile handling and component stability.

## [1.0.45] - 2026-03-10

### Changed
- Extensive updates to `ClimateMoreInfo` and `TilePicker` components.
- Improved `SectionGrid` layout and responsiveness via updated `sectionLayout.ts`.
- Enhanced stability for `TileRenderer` and `TileWrapper`.
- Refined `dashboard.ts` store for improved state management and synchronization.
- Optimized `tileSizing.ts` logic for more precise tile dimensioning.

## [1.0.44] - 2026-03-10

### Changed
- Extensive cleanup and refactor of nearly all tile components (**Siren**, **Slider**, **Timer**, **Todo**, **Update**, **Vacuum**, **WaterHeater**, **Weather**, etc.).
- Refined tile grid sizing logic in `tileSizing.ts`.
- Improved **CustomIcon** component and expanded icon definitions.
- Enhanced **TileRenderer** logic for more robust component mounting.

## [1.0.43] - 2026-03-10

### Changed
- Extensive updates to MoreInfo dialogs for Cover, Weather, and various entity types.
- Major refactor and improvements to almost all tile components (Camera, Climate, Entity, Humidifier, InputSelect, Remote, Timer, Todo, Update, WaterHeater).
- Refined Dashboard type definitions and page layout.
- Enhanced TileWrapper stability and rendering.

## [1.0.42] - 2026-03-09

### Changed
- Further improved websocket relay stability and error handling in `server.js`.
- Refined release notes fetching logic in `UpdateMoreInfo.svelte` to use sequence keys for better race condition handling.

## [1.0.41] - 2026-03-09

### Changed
- Further improved websocket relay stabilization and error handling in `server.js`.
- Refined session cleanup logic for cleaner disconnections.

## [1.0.40] - 2026-03-09

### Changed
- Improved the websocket relay connection management.
- Refined the authentication mirroring logic in `server.js`.

## [1.0.39] - 2026-03-09

### Changed
- Improved Home Assistant authentication message interception in `server.js`.
- Stabilized the websocket session by avoiding forwarding late browser auth messages to HA.

## [1.0.38] - 2026-03-08

### Changed
- Extensive updates to MoreInfo dialogs for AlarmPanel, Climate, Cover, and Todo entities.
- Improved TilePicker and ClimateTile UI components.
- Enhanced MediaPlayerTile and TileWrapper rendering logic.
- Refined Home Assistant service handling and haptics feedback.

## [1.0.37] - 2026-03-08

### Changed
- Improved custom iconography handling and updated built-in icon definitions.
- Enhanced Home Assistant websocket stability and connection logic.
- Updated theme presets for better visual consistency.
- Optimized layout server-side logic for initial state hydration.

## [1.0.36] - 2026-03-08

### Changed
- Improved `ShellNav` component logic and layout.
- Refined `MapTile` and `WeatherTile` rendering.
- Enhanced `TileRenderer` component stability.
- Optimized main layout structure in `+layout.svelte`.

## [1.0.35] - 2026-03-08

### Changed
- Extensive updates to MoreInfo dialogs for various entity types (Todo, TV, Update, Vacuum, WaterHeater, Weather).
- Refactored `SectionGrid` layout and responsiveness handling.
- Improved settings panels for navigation and themes.
- Enhanced `ClimateTile` and `TileWrapper` component logic.
- Optimized theme application and utility methods.

## [1.0.34] - 2026-03-08

### Changed
- Improved `EntityTile` and `LightTile` component logic.
- Refactored `TileEditor` UI for better tile management.
- Enhanced server-side logic in `server.js`.
- Refined `haptics` utility for better device feedback.

## [1.0.33] - 2026-03-08

### Changed
- Improved `SectionGrid` layout and responsiveness.
- Enhanced `ClimateTile` UI and interaction logic.
- Refined `TileWrapper` component for better tile stability.
- Optimized `haptics` utility for consistent feedback.

## [1.0.32] - 2026-03-08

### Added
- New `ShellNav` component (replacing AppNav).
- New TV remote utility service.

### Changed
- Extensive updates to `MoreInfo` dialogs for TVs and Updates.
- Refactored `TileEditor` for smoother interaction.
- Improved `PageView` layout and navigation integration.
- Enhanced `ClimateTile`, `LightTile`, and `CircleControl` UI logic.
- Focused improvements on haptics and dashboard type definitions.

## [1.0.31] - 2026-03-08

### Changed
- Improved Sensor and Update more-info dialog views.

## [1.0.30] - 2026-03-08

### Added
- New library entry point `src/lib/index.ts`.

### Changed
- Major refactor of tile components for improved state handling and consistency (Calendar, Camera, Climate, Cover, Energy, Fan, Humidifier, LawnMower, Lock, Siren, Slider, Todo, Vacuum, WaterHeater).
- Enhanced tile entity mapping logic in `tileEntity.ts`.
- Updated navigation settings UI.
- Improved TileRenderer logic for better component lifecycle management.

## [1.0.29] - 2026-03-08

### Changed
- Refactored SirenTile and WaterHeaterTile components for better consistency.
- Improved Home Assistant service handling logic.
- Updated MobileNav layout for better mobile experience.
- Refined haptics utility for more precise feedback.

## [1.0.28] - 2026-03-08

### Changed
- Extensive refactor of navigation components (ShellNav, IntegratedNavRail, MobileNav).
- Improved UI for MoreInfoShell and SettingsPanel.
- Enhanced core tile rendering and wrapper logic.
- Optimized TilePicker and haptic feedback utility.
- Refined global layout structure.

## [1.0.27] - 2026-03-08

### Changed
- Refined haptics utility and integration.
- Global styling and HTML structure optimizations.

## [1.0.26] - 2026-03-07

### Changed
- Improved AppShell and Layout structure for better performance.
- Global styling enhancements in app.css.
- Refined TileWrapper logic and rendering.

## [1.0.25] - 2026-03-07

### Added
- Optimistic UI state handling for faster interaction feedback.

### Changed
- Extensive updates to MoreInfo dialogs (Graph, Media, TV).
- Improved Edit mode UI component performance (TileEditor, TilePicker).
- Enhanced tile rendering logic and style wrapper consistency.
- Refactored Home Assistant core service and entity mapping logic.
- Focused websocket reliability and optimistic update handling.

## [1.0.24] - 2026-03-07

### Changed
- Improved MoreInfo shell dialog logic.
- Focused main dashboard page view for better responsiveness.

## [1.0.23] - 2026-03-07

### Added
- New standalone clock store.
- New update summary utility and HTML sanitization service.

### Changed
- Extensive refactor of settings panels (Profiles, Reset, Theme, General).
- Refactored Edit mode UI (TileEditor, TilePicker) for better performance and layout management.
- Improved tile components (Button, MediaHero, TileRenderer, TileWrapper, Update).
- Simplified navigation structures and integrated navigation rail logic.
- Focused PageView and SectionGrid layout handling on stability.
- Cleaned up demo data and moved to production-ready Home Assistant stores.
- Enhanced Home Assistant websocket and service handling.
- Optimized formatting and theme application logic.
- Updated main layout and dashboard responsive behavior.
- Removed legacy ClockTile in favor of a flexible store-based approach.

### Fixed
- Improved icon rendering and custom iconography reliability.

## [1.0.22] - Unreleased (Draft)
- Initial draft for settings refactor and UI improvements (merged into 1.0.23).

## [1.0.21] - 2026-03-07

### Added
- New authentication configuration API route.
- Improved MoreInfo shell and dialog components.

### Changed
- Refactored sensor more-info views for better data presentation.
- Updated UI store logic for improved state management.

## [1.0.2] - 2026-03-07

### Added
- Integrated navigation rail improvements for better layout consistency.
- New "More Info" dialog components for Sensors, TVs, and Updates.

### Changed
- Refactored `TileRenderer` and `TileWrapper` for improved performance and reliability.
- Enhanced `MediaHeroTile` and `LockTile` UI elements.
- Updated `PageView` component for smoother transitions.
- Refactored `DisplaySettings` to improve user experience.
- Updated core dashboard types and icon handling logic.

## [1.0.1] - 2026-03-07

### Changed
- Major refactor of icon rendering across all tile types (Calendar, Camera, Climate, Cover, Energy, Fan, Humidifier, LawnMower, Lock, Siren, etc.).
- Improved `CustomIcon` and `Icon` component components.
- Updated dashboard layout types and page handling.

### Fixed
- Resolved GHCR authentication issues in Docker publishing workflow.
- Fixed CI workflow validation and secret handling.
- Improved buildx attestation processing.

## [1.0.0] - 2026-03-05

### Added
- Initial stable release of Stratum.
- Core dashboard functionality with customizable tiles.
- Support for various Home Assistant entity types.
- Theme engine with presets.