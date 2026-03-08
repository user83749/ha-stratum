export type HapticType =
	| 'success'
	| 'warning'
	| 'failure'
	| 'light'
	| 'medium'
	| 'heavy'
	| 'selection'
	| 'none';

const VALID_HAPTICS = new Set<HapticType>([
	'success',
	'warning',
	'failure',
	'light',
	'medium',
	'heavy',
	'selection',
	'none'
]);

export function triggerHaptic(style: HapticType = 'medium'): void {
	try {
		const hapticType: HapticType = VALID_HAPTICS.has(style) ? style : 'medium';
		if (hapticType === 'none') return;
		window.parent.dispatchEvent(
			new CustomEvent('haptic', {
				bubbles: true,
				composed: true,
				detail: hapticType
			})
		);
	} catch {
		// no-op
	}
}

export function haptic(type: HapticType = 'light'): void {
	triggerHaptic(type);
}

export function hapticDouble(): void {
	// In HA iOS app, "success" already maps to the double-tap success pattern.
	// Keep this synchronous to the user gesture.
	triggerHaptic('success');
}
