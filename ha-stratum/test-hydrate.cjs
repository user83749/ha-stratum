const { chromium } = require('playwright');

(async () => {
	const browserMobile = await chromium.launch();
	const contextMobile = await browserMobile.newContext({
		viewport: { width: 375, height: 667 },
		isMobile: true
	});
	const pageMobile = await contextMobile.newPage();
	pageMobile.on('console', msg => console.log('MOBILE_LOG:', msg.text()));
	pageMobile.on('pageerror', err => console.log('MOBILE_ERROR:', err.message));
	try {
		await pageMobile.goto('http://localhost:8099/');
		await pageMobile.waitForTimeout(5000);
	} catch (err) {
		console.log("MOBILE_PLAYWRIGHT_ERROR:", err.message);
	}
	await browserMobile.close();

	const browserDesktop = await chromium.launch();
	const pageDesktop = await browserDesktop.newPage();
	pageDesktop.on('console', msg => console.log('DESKTOP_LOG:', msg.text()));
	pageDesktop.on('pageerror', err => console.log('DESKTOP_ERROR:', err.message));
	try {
		await pageDesktop.goto('http://localhost:8099/');
		await pageDesktop.waitForTimeout(5000);
	} catch (err) {
		console.log("DESKTOP_PLAYWRIGHT_ERROR:", err.message);
	}
	await browserDesktop.close();
})();
