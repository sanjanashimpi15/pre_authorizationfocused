const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1400, height: 950 });
    await page.goto('http://localhost:3000/');
    await page.waitForTimeout(2000);

    const guestBtn = page.locator('button:has-text("Continue as Guest")');
    if (await guestBtn.isVisible()) {
        await guestBtn.click();
        await page.waitForTimeout(2000);
    }

    // Clear local storage and reload
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.waitForTimeout(2000);

    if (await guestBtn.isVisible()) {
        await guestBtn.click();
        await page.waitForTimeout(3000);
    }

    // Upload file
    const pdfPath = path.join(__dirname, '..', 'sample_claim.pdf');
    await page.waitForSelector('input[type="file"]', { state: 'attached' });
    await page.setInputFiles('input[type="file"]', pdfPath);

    console.log('Waiting for OCR to complete...');
    await page.waitForTimeout(15000);

    // Navigate to Step 4
    const step4Tab = page.locator('button:has-text("Documents & Generate")');
    if (await step4Tab.isVisible()) {
        await step4Tab.click();
        await page.waitForTimeout(3000);
    }

    // Capture screenshot
    await page.screenshot({ path: path.join(__dirname, 'test_screenshot.png') });
    console.log('Screenshot captured!');

    await browser.close();
})();
