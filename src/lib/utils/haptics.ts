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
	const hapticType: HapticType = VALID_HAPTICS.has(style) ? style : 'medium';
	if (hapticType === 'none') return;
	if (typeof window === 'undefined') return;

	const emit = (target: EventTarget | null | undefined) => {
		if (!target) return;
		try {
			(target as EventTarget).dispatchEvent(
				new CustomEvent('haptic', {
					bubbles: true,
					composed: true,
					detail: hapticType
				})
			);
		} catch {
			// no-op
		}
	};

	let hostWindow: Window = window;
	try {
		let current: Window = window;
		while (current.parent && current.parent !== current) {
			current = current.parent;
			hostWindow = current;
		}
	} catch {
		// stop at cross-origin boundaries
	}

	try {
		if (window.top) hostWindow = window.top;
	} catch {
		// no-op
	}

	// Dispatch once in the iframe window (for local listeners), then once in the
	// highest reachable host window (HA companion listener context).
	emit(window);
	if (hostWindow !== window) emit(hostWindow);

	const maybeFireEvent = (globalThis as { fireEvent?: (node: EventTarget, type: string, detail?: unknown) => void }).fireEvent;
	if (typeof maybeFireEvent === 'function') {
		try {
			maybeFireEvent(hostWindow, 'haptic', hapticType);
		} catch {
			// no-op
		}
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
