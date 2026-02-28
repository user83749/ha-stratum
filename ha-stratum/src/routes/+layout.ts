// Disable server-side rendering entirely.
// Stratum is a client-side dashboard — all rendering happens in the browser.
// This eliminates ALL 'navigator/window/document is not defined' SSR crashes.
export const ssr = false;
