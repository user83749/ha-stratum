export type HapticType =
	| 'selection'
	| 'light'
	| 'medium'
	| 'heavy'
	| 'success'
	| 'warning'
	| 'error';

type HapticTarget = EventTarget | null | undefined;
const VALID_HAPTICS = new Set<HapticType>([
	'selection',
	'light',
	'medium',
	'heavy',
	'success',
	'warning',
	'error'
]);

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
	if (typeof window === 'undefined' || typeof document === 'undefined') return;
	const hapticType: HapticType = VALID_HAPTICS.has(style) ? style : 'medium';
	const dispatch = (t: HapticTarget) => dispatchHapticToTarget(t, hapticType);

	try {
		// 1) Current frame
		dispatch(window);
		dispatch(document);

		// 2) Traverse all parents (nested iframe-safe)
		let win: Window = window;
		while (win.parent && win.parent !== win) {
			try {
				win = win.parent;
				dispatch(win);
			} catch {
				break;
			}
		}

		// Also dispatch explicitly to top when accessible (avoid duplicate).
		try {
			if (window.top && window.top !== win) dispatch(window.top);
		} catch {
			// no-op
		}

		// 3) Direct iOS bridge fallback
		try {
			const webkit = (window as unknown as { webkit?: { messageHandlers?: { haptic?: { postMessage?: (v: HapticType) => void } } } }).webkit;
			webkit?.messageHandlers?.haptic?.postMessage?.(hapticType);
		} catch {
			// no-op
		}

		// 4) HA fireEvent fallback
		const fireEventFn = (globalThis as unknown as { fireEvent?: (el: unknown, type: string, detail?: unknown) => void }).fireEvent;
		if (typeof fireEventFn === 'function') {
			try {
				fireEventFn(window, 'haptic', hapticType);
			} catch {
				// no-op
			}
		}

		// 5) Optional explicit target
		dispatch(target);
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
