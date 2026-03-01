const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:8099', { waitUntil: 'networkidle' });
        const html = await page.content();
        console.log('---HTML DUMP START---');
        console.log(html.substring(0, 1500));
        console.log('...TRUNCATED...');
        console.log(html.substring(html.length - 1500));
        console.log('---HTML DUMP END---');
    } catch (e) {
        console.error(e);
    }
    await browser.close();
})();
