# Changelog

## [1.0.28] - 2026-03-08

### Changed
- Extensive refactor of navigation components (AppNav, IntegratedNavRail, MobileNav).
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
