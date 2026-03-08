export type HapticType =
	| 'selection'
	| 'light'
	| 'medium'
	| 'heavy'
	| 'success'
	| 'warning'
	| 'error';

type HapticTarget = EventTarget | null | undefined;

let lastUserInteraction = 0;

const haHapticMap: Record<string, HapticType> = {
	selection: 'selection',
	light: 'light',
	medium: 'medium',
	heavy: 'heavy',
	success: 'success',
	warning: 'warning',
	error: 'error'
};

function dispatchHapticToTarget(target: HapticTarget, type: HapticType): void {
	if (!target || typeof (target as EventTarget).dispatchEvent !== 'function') return;
	try {
		const evt = new CustomEvent('haptic', {
			bubbles: true,
			composed: true,
			detail: type
		});
		(target as EventTarget).dispatchEvent(evt);
	} catch {
		// no-op
	}
}

export function triggerHaptic(style: HapticType = 'medium', target?: HapticTarget): void {
	try {
		lastUserInteraction = Date.now();
	} catch {
		// no-op
	}

	try {
		const hapticType = haHapticMap[style] ?? 'medium';
		if (typeof window !== 'undefined') dispatchHapticToTarget(window, hapticType);
		if (typeof document !== 'undefined') dispatchHapticToTarget(document, hapticType);
		if (typeof document !== 'undefined') {
			dispatchHapticToTarget(document.body, hapticType);
			dispatchHapticToTarget(document.activeElement, hapticType);
			const haRoot = document.querySelector('home-assistant') as (HTMLElement & { shadowRoot?: ShadowRoot | null }) | null;
			dispatchHapticToTarget(haRoot, hapticType);
			dispatchHapticToTarget(haRoot?.shadowRoot?.querySelector('home-assistant-main'), hapticType);
		}
		if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
			try {
				dispatchHapticToTarget(window.parent, hapticType);
			} catch {
				// no-op (cross-origin parent or restricted frame)
			}
		}
		dispatchHapticToTarget(target, hapticType);

		const fireEventFn = (globalThis as unknown as { fireEvent?: (el: unknown, type: string, detail?: unknown) => void }).fireEvent;
		if (typeof fireEventFn === 'function' && typeof window !== 'undefined') {
			try {
				fireEventFn(window, 'haptic', hapticType);
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
