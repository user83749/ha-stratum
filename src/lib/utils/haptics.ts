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

/** Send a single haptic impulse if the HA iOS bridge is available. */
export function haptic(type: HapticType = 'selection'): void {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkit?.messageHandlers?.haptic?.postMessage?.(type);
    } catch {
        // Not running in HA iOS companion — silently ignore.
    }
}

/**
 * Fire two quick "selection" taps in succession — used for double-tap feedback.
 * The 80 ms gap matches UIKit's natural double-tap cadence.
 */
export function hapticDouble(): void {
    haptic('selection');
    setTimeout(() => haptic('selection'), 80);
}
