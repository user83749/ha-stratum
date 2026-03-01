// This file MUST be imported before SvelteKit
try {
    Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true });
    Object.defineProperty(globalThis, 'navigator', {
        value: {
            userAgent: 'node',
            platform: 'node',
            serviceWorker: { register: () => Promise.resolve() }
        },
        writable: true,
        configurable: true
    });
    Object.defineProperty(globalThis, 'document', {
        value: {
            addEventListener: () => { },
            removeEventListener: () => { },
            documentElement: {
                style: { setProperty: () => { } },
                classList: { toggle: () => { }, add: () => { }, remove: () => { } }
            }
        },
        writable: true,
        configurable: true
    });
} catch (e) {
    // Fallback for restricted environments
}
