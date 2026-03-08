// ─────────────────────────────────────────────────────────────────────────────
// Stratum — haptics.ts
// Lightweight Home Assistant haptic feedback.
//
// HA-compatible pattern: dispatch a `haptic` CustomEvent with `detail = type`
// from the active user gesture handler. This is the expected trigger route for
// HA frontend/app integrations that listen for haptic events.
//
//   'selection'  → UISelectionFeedbackGenerator  (lightest tap feel)
//   'light'      → UIImpactFeedbackGenerator(.light)
//   'medium'     → UIImpactFeedbackGenerator(.medium)
//   'heavy'      → UIImpactFeedbackGenerator(.heavy)
//   'success'    → UINotificationFeedbackGenerator(.success)
//   'warning'    → UINotificationFeedbackGenerator(.warning)
//   'error'      → UINotificationFeedbackGenerator(.error)
//
// On platforms that do not listen for this event, calls are harmless no-ops.
// ─────────────────────────────────────────────────────────────────────────────

export type HapticType =
    | 'selection'
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'warning'
    | 'error';

/** Send a single HA haptic event. */
export function haptic(type: HapticType = 'light'): void {
	try {
		const evt = new CustomEvent('haptic', {
			bubbles: true,
			composed: true,
			detail: type
		});
		if (typeof window !== 'undefined') window.dispatchEvent(evt);
	} catch {
		// Silently ignore — haptics are non-critical UX feedback.
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
