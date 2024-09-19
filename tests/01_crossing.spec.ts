import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:4321/crossing/vanilla/1/');
  await expect(page).toHaveTitle('Vanilla Element Crossing 1/2 | @vtbag');
  await page.click('text=Page 2');
  await expect(page).toHaveTitle('Vanilla Element Crossing 2/2 | @vtbag');
});

test.describe("vtbag", () => {
  test('preserves DOM properties', async ({ page }) => {
    await page.goto('http://localhost:4321/crossing/vanilla/1/');
    await expect(page).toHaveTitle('Vanilla Element Crossing 1/2 | @vtbag');
    await page.fill('#name', 'Jane Doe');
    await page.selectOption('#gender', 'female');
    await page.check('#interest2');

    await page.click('text=Page 2');
    await expect(page).toHaveTitle('Vanilla Element Crossing 2/2 | @vtbag');

    // @ts-expect-error
    const nameValue = await page.$eval('#name', el => el.value);
    // @ts-expect-error
    const genderValue = await page.$eval('#gender', el => el.value);
    // @ts-expect-error
    const isMusicChecked = await page.$eval('#interest2', el => el.checked);

    await expect(nameValue).toBe('Jane Doe');
    await expect(genderValue).toBe('female');
    await expect(isMusicChecked).toBe(true);

  });

  test('preserves class and CSS properties', async ({ page }) => {
    await page.goto('http://localhost:4321/crossing/vanilla/1/');
    await expect(page).toHaveTitle('Vanilla Element Crossing 1/2 | @vtbag');
    const isDark1 = await page.$eval(':root', el => el.classList.contains('dark'));
    const colorScheme1 = await page.$eval(':root', el => el.style.colorScheme);

    await page.click('#dl');
    const isDark2 = await page.$eval(':root', el => el.classList.contains('dark'));
    const colorScheme2 = await page.$eval(':root', el => el.style.colorScheme);
    expect(isDark2).not.toBe(isDark1);
    expect(colorScheme2).not.toBe(colorScheme1);

    await page.click('text=Page 2');
    await expect(page).toHaveTitle('Vanilla Element Crossing 2/2 | @vtbag');

    const isDark3 = await page.$eval(':root', el => el.classList.contains('dark'));
    const colorScheme3 = await page.$eval(':root', el => el.style.colorScheme);
    expect(isDark3).toBe(isDark2);
    expect(colorScheme3).toBe(colorScheme2);
  });


  test('preserves animations and media timing', async ({ page }) => {
    // todo: unable to get the video to play yet
    await page.goto('http://localhost:4321/crossing/vanilla/1/');
    await expect(page).toHaveTitle('Vanilla Element Crossing 1/2 | @vtbag');
    await page.evaluate(async () => {
      const video = document.querySelector("video");
      video && video.play();
    });
    await new Promise(r => setTimeout(r, 1000));
    const video1 = await page.$eval('video', el => el.currentTime);
    console.log(video1);
    await page.click('text=Page 2');
    await expect(page).toHaveTitle('Vanilla Element Crossing 2/2 | @vtbag');

    const video2 = await page.$eval('video', el => el.currentTime);
    console.log(video2);
  });
});

test.describe("vtbot", () => {
  test("astro integration (vanilla)", async ({ page }) => {
    await page.goto('http://localhost:4321/tests/y/');

    expect(await page.locator("#p").getAttribute("style")).toBe("color: blue");
    await page.click('text=goto z');
    expect(await page.locator("#p").getAttribute("style")).toBe("color: blue;");
  });

  test("astro integration (vanilla, reload)", async ({ page }) => {
    await page.goto('http://localhost:4321/tests/y/');

    expect(await page.locator("#p").getAttribute("style")).toBe("color: blue");
    await page.click('text=goto z2');
    expect(await page.locator("#p").getAttribute("style")).toBe("color: blue;");
    await page.reload();
    expect(await page.locator("#p").getAttribute("style")).toBe("color: red");
  });
  test("astro integration (ott)", async ({ page }) => {
    await page.goto('http://localhost:4321/tests/x/');
    expect(await page.locator("iframe").contentFrame().locator("head title").textContent()).toBe("Test X");
  });

});