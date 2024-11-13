import { test, expect, type Page } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');
  await expect(page).toHaveTitle('🔬 Inspection Chamber Demo | @vtbag');
});

test.describe("devToolbar", () => {
  async function openClose(page: Page) {
    const app = page.locator('#bar-container > button[data-app-id="vtbot"]');
    await expect(app).toBeVisible();
    await app.click();
  }
  async function toolbarAction(page: Page, status: string) {
    await openClose(page);
    const button = page.locator('#inspection-chamber-button button');
    await expect(button).toBeVisible();
    await expect(page.locator("#inspection-chamber-status")).toContainText(status);
    return button;
  }

  test('can open and close', async ({ page }) => {
    await page.goto('http://localhost:4321/');
    await expect(page.locator('#inspection-chamber-button')).toBeHidden();
    await toolbarAction(page, "There is an Inspection Chamber here");
    await expect(page.locator('#inspection-chamber-button')).toBeVisible();
    await openClose(page);
    await expect(page.locator('#inspection-chamber-button')).toBeHidden();
  });

  test('can use', async ({ page }) => {
    await page.goto('http://localhost:4321/');
    let button = await toolbarAction(page, "There is an Inspection Chamber here");
    await button.click();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();
    await expect(page.locator('#vtbag-ui-reopen')).toBeHidden();
    await page.click('#vtbag-ui-standby');
    await expect(page.locator('#vtbag-ui-reopen')).toBeVisible();
    await expect(page.locator('#vtbag-ui-panel')).toBeHidden();
    await page.click("a[class*='primary']");
    await page.waitForURL('http://localhost:4321/vtbag/');
    await expect(page.locator('#vtbag-ui-reopen')).toBeVisible();
    await expect(page.locator('#vtbag-ui-panel')).toBeHidden();
    await page.click('#vtbag-ui-reopen');
    await expect(page.locator('#vtbag-ui-reopen')).toBeHidden();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();
  });



  test('can detect standby', async ({ page }) => {
    await page.goto('http://localhost:4321/');

    let button = await toolbarAction(page, "There is an Inspection Chamber here");
    await button.click();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();
    await page.click('#vtbag-ui-standby');
    await expect(page.locator('#vtbag-ui-reopen')).toBeVisible();
    button = await toolbarAction(page, "The Chamber is currently in standby mode.");
    await button.click();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();
  });
});

test.describe("controls", () => {
  test('can close', async ({ page }) => {
    await page.goto('http://localhost:4321/demo/BasicS/');

    await expect(page.locator('#vtbag-ui-reopen')).toBeVisible();
    await page.click('#vtbag-ui-reopen');
    await expect(page.locator('#vtbag-ui-reopen')).toBeHidden();
    await page.click('#vtbag-ui-standby');
    await expect(page.locator('#vtbag-ui-panel')).toBeHidden();
    await expect(page.locator('#vtbag-ui-reopen')).toBeVisible();
  });

  test('can reopen', async ({ page }) => {
    await page.goto('http://localhost:4321/demo/BasicS/');

    await expect(page.locator('#vtbag-ui-panel')).toBeHidden();
    await page.click('#vtbag-ui-reopen');
    await expect(page.locator('#vtbag-ui-reopen')).toBeHidden();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();

  });

  test('can really reopen', async ({ page }) => {
    await page.goto('http://localhost:4321/demo/BasicC1/');

    await expect(page.locator('#vtbag-ui-panel')).toBeHidden();
    await page.click(".right");
    await page.waitForURL('http://localhost:4321/demo/BasicC2/');
    await page.click('#vtbag-ui-reopen');
    await expect(page.locator('#vtbag-ui-reopen')).toBeHidden();
    await expect(page.locator('#vtbag-ui-panel')).toBeVisible();

  });

  test('can toggle dark mode', async ({ page }) => {
    await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');

    const colorScheme = async () => await page.evaluate(() => top!.document.documentElement.style.colorScheme);

    expect(await colorScheme()).toBe("dark");
    await page.click('#vtbag-ui-light-dark');
    expect(await colorScheme()).toBe("light");
    await page.click('#vtbag-ui-light-dark');
    expect(await colorScheme()).toBe("dark");
  });

  test('can turn', async ({ page }) => {
    await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');

    await new Promise<void>(r => setTimeout(r, 1000));
    const element = page.locator('#vtbag-ui-panel');
    const boundingBox = await element.boundingBox();
    expect(boundingBox).not.toBe(null);
    expect(boundingBox!.height).toBeGreaterThan(boundingBox!.width);
    expect(boundingBox!.y).toBe(0);

    await page.click('#vtbag-ui-turn');
    await new Promise<void>(r => setTimeout(r, 1000));
    const element2 = page.locator('#vtbag-ui-panel');
    const boundingBox2 = await element2.boundingBox();
    expect(boundingBox2).not.toBe(null);
    expect(boundingBox2!.width).toBeGreaterThan(boundingBox!.height);
    expect(boundingBox2!.x).toBe(0);
  });
});

test.describe("sub-panel", () => {
  const open = async (page: Page) => {
    await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');

    // account for tutorial mode: close the auto-opened panel
    await page.click('#vtbag-ui-messages h4');
    await expect(page.locator('#vtbag-ui-inner-panel')).toBeHidden();
    await new Promise<void>(r => setTimeout(r, 100));
    await page.click('#vtbag-ui-messages h4');
    await expect(page.locator('#vtbag-ui-inner-panel')).toBeVisible();
  };

  test('can open', async ({ page }) => {
    await open(page);
    await expect(page.locator('#vtbag-ui-inner-panel')).toBeVisible();
  });

  test('can be closed', async ({ page }) => {
    await open(page);
    await page.click('#vtbag-ui-inner-panel-close');
    await expect(page.locator('#vtbag-ui-inner-panel')).toBeHidden();
  });

  test('can be dragged', async ({ page }) => {
    await open(page);
    const mover = page.locator('#vtbag-ui-move');
    await new Promise<void>(r => setTimeout(r, 100));
    const boundingBox = await mover.boundingBox() || { x: 0, y: 0 };

    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.move(boundingBox.x + 5, boundingBox.y + 5);
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.down();
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.move(boundingBox.x - 100, boundingBox.y - 100);
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.up();
    await new Promise<void>(r => setTimeout(r, 100));

    const newBoundingBox = await mover.boundingBox() || { x: 0, y: 0 };
    expect(newBoundingBox).not.toBeNull();
    expect(boundingBox.x).toBeGreaterThan(newBoundingBox.x);
    expect(boundingBox.y).toBeGreaterThan(newBoundingBox.y);
  });

  test('can be resized', async ({ page }) => {
    await open(page);
    const panel = page.locator('#vtbag-ui-inner-panel');
    const resizer = page.locator('#vtbag-ui-resize');
    await new Promise<void>(r => setTimeout(r, 100));
    const boundingBox = await panel.boundingBox() || { width: 0, height: 0 };
    const resize = await resizer.boundingBox() || { x: 0, y: 0 };

    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.move(resize.x + 5, resize.y + 5);
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.down();
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.move(resize.x + 100, resize.y + 100);
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.up();
    await new Promise<void>(r => setTimeout(r, 100));

    const newBoundingBox = await panel.boundingBox() || { width: 0, height: 0 };
    expect(newBoundingBox).not.toBeNull();
    expect(newBoundingBox.width).toBeGreaterThan(boundingBox.width);
    expect(newBoundingBox.height).toBeGreaterThan(boundingBox.height);
  });

  test('can be made transparent', async ({ page }) => {
    const opacity = async () => await page.evaluate(() => document.querySelector<HTMLDivElement>("#vtbag-ui-inner-panel")!.style.opacity);

    await open(page);

    await new Promise<void>(r => setTimeout(r, 100));
    expect(+await opacity()).toBeGreaterThan(0.9);
    const opa = page.locator('#vtbag-ui-opacity');
    await new Promise<void>(r => setTimeout(r, 100));
    const boundingBox = await opa.boundingBox() || { x: 0, y: 0, width: 0 };
    await new Promise<void>(r => setTimeout(r, 100));
    await page.mouse.click(boundingBox.x + boundingBox.width / 2, boundingBox.y + 3);
    await new Promise<void>(r => setTimeout(r, 100));

    expect(+await opacity()).toBeLessThan(0.9);
  });
});


test.describe("Full control", () => {
  const start = async (page: Page, click = true) => {
    await page.goto('http://localhost:4321/inspection-chamber-demo/first-page/');
    await page.click('#vtbag-m-full-control');
    await expect(page.locator('#vtbag-ui-control')).toBeVisible();
    if (click) {
      await page.evaluate(() =>
        top!.document.querySelector<HTMLIFrameElement>('#vtbag-main-frame')!.contentDocument!.querySelector<HTMLAnchorElement>('main div p a')?.click()
      );
      await page.waitForURL('http://localhost:4321/inspection-chamber-demo/second-page/');
    }
  };

  test('opens sub-panel', async ({ page }) => {
    await start(page, false);
  });

  test('stops animation', async ({ page }) => {
    await start(page);

    await expect(page.locator('#vtbag-ui-names h4')).toHaveText("Animation Groups");
    expect(await page.evaluate(() =>
      [...top!.document.querySelector<HTMLIFrameElement>('#vtbag-main-frame')!.contentDocument!.getAnimations()].every(a => a.playState !== 'running' && a.currentTime === 0)
    )).toBe(true);
  });

  test('shows all animations', async ({ page }) => {
    await start(page);
    await expect(page.locator("#vtbag-ui-names li")).toHaveCount(10);
    await expect(page.locator("#vtbag-ui-names li.old")).toHaveCount(10);
    await expect(page.locator("#vtbag-ui-names li.new")).toHaveCount(9);
  });

  test('can fast forward', async ({ page }) => {
    await start(page);

    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const input = top!.document.querySelector<HTMLInputElement>('#vtbag-ui-controller2')!;
      input.value = "125";
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(await page.evaluate(() =>
      [...top!.document.querySelector<HTMLIFrameElement>('#vtbag-main-frame')!.contentDocument!.getAnimations()].every(a => (a as CSSAnimation).animationName === 'vtbag-twin-noop' || a.playState !== 'running' && a.currentTime === 125 || console.log(a.currentTime, (a as CSSAnimation).animationName))
    )).toBe(true);
  });
});