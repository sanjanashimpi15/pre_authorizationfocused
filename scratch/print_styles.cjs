const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
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

    console.log('Waiting for OCR...');
    await page.waitForTimeout(15000);

    // Navigate to Step 4
    const step4Tab = page.locator('button:has-text("Documents & Generate")');
    if (await step4Tab.isVisible()) {
        await step4Tab.click();
        await page.waitForTimeout(3000);
    }

    // Print computed style of the children of the first button in the rail
    const childStyles = await page.evaluate(() => {
        const button = document.querySelector('aside button');
        if (!button) return 'NO BUTTON FOUND';
        
        const children = [];
        button.querySelectorAll('*').forEach((el, idx) => {
            const style = window.getComputedStyle(el);
            children.push({
                index: idx,
                tagName: el.tagName,
                className: el.className,
                innerText: el.innerText,
                display: style.display,
                height: style.height,
                width: style.width,
                visibility: style.visibility,
                opacity: style.opacity,
                overflow: style.overflow,
                backgroundColor: style.backgroundColor,
                color: style.color
            });
        });
        return {
            buttonText: button.innerText,
            buttonHeight: window.getComputedStyle(button).height,
            children
        };
    });

    console.log(JSON.stringify(childStyles, null, 2));

    await browser.close();
})();
