// ── Haptic Types ────────────────────────────────────────────────────────────

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

// ── Event Dispatch ──────────────────────────────────────────────────────────

export function triggerHaptic(style: HapticType = 'medium'): void {
	const hapticType: HapticType = VALID_HAPTICS.has(style) ? style : 'medium';
	if (hapticType === 'none') return;
	if (typeof window === 'undefined') return;

	const emit = (target: EventTarget | null | undefined) => {
		if (!target) return;
		try {
			const targetWindow = target as Window & { CustomEvent?: typeof CustomEvent };
			const TargetCustomEvent =
				(typeof targetWindow.CustomEvent === 'function'
					? targetWindow.CustomEvent
					: CustomEvent) as typeof CustomEvent;
			(target as EventTarget).dispatchEvent(
				new TargetCustomEvent('haptic', {
					bubbles: true,
					composed: true,
					detail: hapticType
				})
			);
		} catch {
			// no-op
		}
	};

	const maybeFireEvent = (globalThis as { fireEvent?: (node: EventTarget, type: string, detail?: unknown) => void }).fireEvent;
	const emitWithFallback = (target: Window) => {
		emit(target);
		if (typeof maybeFireEvent === 'function') {
			try {
				maybeFireEvent(target, 'haptic', hapticType);
			} catch {
				// no-op
			}
		}
	};

	// Current frame
	emitWithFallback(window);

	// Every reachable parent frame (important for nested iframe ingress paths).
	let current: Window = window;
	while (true) {
		let parent: Window;
		try {
			parent = current.parent;
		} catch {
			break;
		}
		if (!parent || parent === current) break;
		emitWithFallback(parent);
		current = parent;
	}

	// Final top dispatch (safe no-op if already emitted).
	try {
		if (window.top && window.top !== current) {
			emitWithFallback(window.top);
		}
	} catch {
		// no-op
	}
}

// ── Convenience Helpers ─────────────────────────────────────────────────────

export function haptic(type: HapticType = 'light'): void {
	triggerHaptic(type);
}

export function hapticDouble(): void {
	// "success" maps to the desired double-tap success pattern.
	// Keep this synchronous to the user gesture.
	triggerHaptic('success');
}
