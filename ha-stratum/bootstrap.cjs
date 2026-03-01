// THE BOOTSTRAP - Guaranteed to log before ESM hoisting crashes the process
console.log('────────────────────────────────────────────────────────────────');
console.log('[Stratum] Bootstrap process started...');

// SSR Ghost Mocks - Safe, configurable injection
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
    console.log('[Stratum] Global mocks injected successfully.');
} catch (e) {
    console.error('[Stratum] FAILED TO INJECT MOCKS:', e.message);
}

console.log('[Stratum] Importing ESM server...');
console.log('────────────────────────────────────────────────────────────────');

import('./server.js').catch(err => {
    console.error('────────────────────────────────────────────────────────────────');
    console.error('[Stratum] CRITICAL BOOT ERROR (ESM IMPORT FAILED):');
    console.error(err);
    console.error('────────────────────────────────────────────────────────────────');
    process.exit(1);
});
