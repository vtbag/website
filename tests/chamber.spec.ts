import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle('Inspection Chamber Demo | @vtbag');
});
