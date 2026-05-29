import { test, expect } from '@playwright/test';

test('chart paints and help navigation works', async ({ page }) => {
  await page.goto('./');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  // wait a beat for the rAF draw, then assert the canvas has non-blank pixels
  await page.waitForTimeout(500);
  const nonBlank = await canvas.evaluate((c: HTMLCanvasElement) => {
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    // look for any pixel that isn't the near-black background
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 20 || data[i + 1] > 30 || data[i + 2] > 20) return true;
    }
    return false;
  });
  expect(nonBlank).toBe(true);

  await page.getByRole('link', { name: /HELP/ }).click();
  await expect(page).toHaveURL(/help/);
  await expect(page.getByRole('heading', { name: /HELP/i })).toBeVisible();
});
