// ─────────────────────────────────────────────────────────────────────────────
// Stratum — haptics.ts
// Lightweight iOS haptic feedback via the HA Companion App's native bridge.
//
// The HA iOS companion app injects `window.webkit.messageHandlers.haptic`
// into WKWebView. Calling `.postMessage(type)` triggers UIKit's haptic engine:
//
//   'selection'  → UISelectionFeedbackGenerator  (lightest tap feel)
//   'light'      → UIImpactFeedbackGenerator(.light)
//   'medium'     → UIImpactFeedbackGenerator(.medium)
//   'heavy'      → UIImpactFeedbackGenerator(.heavy)
//   'success'    → UINotificationFeedbackGenerator(.success)
//   'warning'    → UINotificationFeedbackGenerator(.warning)
//   'error'      → UINotificationFeedbackGenerator(.error)
//
// On non-iOS platforms (or when the bridge isn't available), all calls are no-ops.
// ─────────────────────────────────────────────────────────────────────────────

export type HapticType =
    | 'selection'
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'warning'
    | 'error';

/** Send a single haptic impulse via HA iOS bridge. */
export function haptic(type: HapticType = 'light'): void {
    try {
        // The HA iOS companion app injects this into all frames (forMainFrameOnly: false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkit?.messageHandlers?.haptic?.postMessage?.(type);
    } catch {
        // Silently ignore lack of bridge
    }
}

/**
 * Fire two quick light taps in succession — used for double-tap feedback.
 * The 80 ms gap matches UIKit's natural double-tap cadence.
 */
export function hapticDouble(): void {
    haptic('light');
    setTimeout(() => haptic('light'), 80);
}
