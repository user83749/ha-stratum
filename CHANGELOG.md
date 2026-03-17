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

## [1.0.65] - 2026-03-16
