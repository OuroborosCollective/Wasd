const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const clientPath = path.resolve(__dirname, 'dist/index.html');
  await page.goto('file://' + clientPath);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'ui_verification_login.png' });

  // Try to enter the game
  const enterButton = await page.$('button.cz-enter');
  if (enterButton) {
    await enterButton.click();
    await page.waitForTimeout(5000); // Wait for assets to "load" (they won't really in file://)
    await page.screenshot({ path: 'ui_verification_game.png' });
  }

  await browser.close();
})();
