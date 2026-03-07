# Changelog

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
