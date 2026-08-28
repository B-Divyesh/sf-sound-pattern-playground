import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('loads a semantic, accessible field kit without console errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle(/Sound Pattern Playground/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See what a tiny');
  await expect(page.getByText('No sound under the lens yet')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('records three labels, classifies a test sound, and exports features', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel(/ready to use this device/i).check();

  const recordClip = async (): Promise<void> => {
    await page.getByRole('button', { name: /Start listening/i }).click();
    await expect(page.getByRole('button', { name: /Stop & keep clip/i })).toBeEnabled();
    await page.waitForTimeout(550);
    await page.getByRole('button', { name: /Stop & keep clip/i }).click();
    await expect(page.getByText(/Saved a|Test complete/)).toBeVisible();
  };

  await recordClip();
  await page.locator('.mode-tab[data-index="1"]').click();
  await recordClip();
  await page.locator('.mode-tab[data-index="2"]').click();
  await recordClip();
  await expect(page.getByText('Classifier is ready')).toBeVisible();
  await page.locator('.mystery-tab').click();
  await recordClip();
  await expect(page.getByText('The baseline’s guess')).toBeVisible();
  await expect(page.locator('.neighbor')).toHaveCount(3);
  await page.getByRole('button', { name: /Mark as a misclassification/i }).click();
  await expect(page.getByText(/Finding wrong guesses/)).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export features CSV/i }).click();
  expect((await download).suggestedFilename()).toMatch(/sound-pattern-features-.*\.csv/);
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
});

test('restores the app shell while fully offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    await registration.update().catch(() => undefined);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See what a tiny');
  await expect(page.locator('#class-progress .progress-row')).toHaveCount(3);
});

test('keeps the primary flow usable at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('link', { name: /Open the field kit/i }).click();
  await expect(page.getByRole('heading', { name: 'Name three sounds' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start listening/i })).toBeVisible();
  const bodyWidth = await page.locator('body').evaluate((body) => body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);
});
