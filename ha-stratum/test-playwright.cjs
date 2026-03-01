const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('LOG:', msg.text()));
    page.on('pageerror', err => console.log('ERROR:', err.message));
    page.on('request', request => console.log('>>', request.method(), request.url()));
    await page.goto('http://localhost:8099');
    await page.waitForTimeout(4000);
    await browser.close();
})();
