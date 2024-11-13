import { test, type Page } from '@playwright/test';

async function shoot(page: Page, path: string) {
  await page.goto(`http://localhost:4321${path}`);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: `public${path}og.png`, clip: { x: 0, y: 0, width: 1280, height: 640 } });

}
test.describe("cheese", () => {
  test("/", async ({ page }) => {await shoot(page, "/")});
  test("/404/", async ({ page }) => {await shoot(page, "/404/")});
  test("/basics/api/", async ({ page }) => {await shoot(page, "/basics/api/")});
  test("/basics/default-animations/", async ({ page }) => {await shoot(page, "/basics/default-animations/")});
  test("/basics/examples/", async ({ page }) => {await shoot(page, "/basics/examples/")});
  test("/basics/pseudos/", async ({ page }) => {await shoot(page, "/basics/pseudos/")});
  test("/basics/step-by-step/", async ({ page }) => {await shoot(page, "/basics/step-by-step/")});
  test("/basics/styling/", async ({ page }) => {await shoot(page, "/basics/styling/")});
  test("/basics/test-page/", async ({ page }) => {await shoot(page, "/basics/test-page/")});
  test("/tips/css/", async ({ page }) => {await shoot(page, "/tips/css/")});
  test("/tips/over-exposure/", async ({ page }) => {await shoot(page, "/tips/over-exposure/")});
  test("/tips/pointer/", async ({ page }) => {await shoot(page, "/tips/pointer/")});
  test("/tips/pseudo-smooth-scrolling/", async ({ page }) => {await shoot(page, "/tips/pseudo-smooth-scrolling/")});
  test("/tools/cam-shaft/", async ({ page }) => {await shoot(page, "/tools/cam-shaft/")});
  test("/tools/element-crossing/", async ({ page }) => {await shoot(page, "/tools/element-crossing/")});
  test("/tools/inspection-chamber/", async ({ page }) => {await shoot(page, "/tools/inspection-chamber/")});
  test("/tools/turn-signal/", async ({ page }) => {await shoot(page, "/tools/turn-signal/")});
  test("/vtbag/", async ({ page }) => {await shoot(page, "/vtbag/")});});

