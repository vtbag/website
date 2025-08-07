import { test, expect } from '@playwright/test';

test('auto gen', async ({ page }) => {
  page.on("console", msg => console.log(msg));
  await page.goto('http://localhost:4321/auto/Auto1/');
  await expect(page).toHaveTitle('Auto 1');
  await page.click('#button');
  await new Promise(r=>setTimeout(r,1000))
  await page.click('#click');
  await expect(page).toHaveTitle('Auto 2');
});

