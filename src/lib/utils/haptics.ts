export type HapticType =
	| 'selection'
	| 'light'
	| 'medium'
	| 'heavy'
	| 'success'
	| 'warning'
	| 'error';

type HapticTarget = EventTarget | null | undefined;

declare function fireEvent(node: EventTarget, type: string, detail?: unknown): void;

const VALID_HAPTICS = new Set<HapticType>([
	'selection',
	'light',
	'medium',
	'heavy',
	'success',
	'warning',
	'error'
]);

export function triggerHaptic(style: HapticType = 'medium', target?: HapticTarget): void {
	try {
		const hapticType: HapticType = VALID_HAPTICS.has(style) ? style : 'medium';
		const makeEvent = () =>
			new CustomEvent('haptic', {
				bubbles: true,
				composed: true,
				detail: hapticType
			});

		if (typeof window !== 'undefined') {
			try {
				window.dispatchEvent(makeEvent());
			} catch {
				// no-op
			}
		}

		if (target && typeof (target as EventTarget).dispatchEvent === 'function') {
			try {
				(target as EventTarget).dispatchEvent(makeEvent());
			} catch {
				// no-op
			}
		}

		if (typeof fireEvent === 'function') {
			try {
				fireEvent(window, 'haptic', hapticType);
			} catch {
				// no-op
			}
		}
	} catch {
		// no-op
	}
}

export function haptic(type: HapticType = 'light', target?: HapticTarget): void {
	triggerHaptic(type, target);
}

export function hapticDouble(target?: HapticTarget): void {
	triggerHaptic('light', target);
	setTimeout(() => triggerHaptic('light', target), 80);
}
