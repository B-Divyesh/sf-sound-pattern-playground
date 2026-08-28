import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function recordClip(page: import('@playwright/test').Page, waitMs = 550): Promise<void> {
  await page.getByRole('button', { name: /Start listening/i }).click();
  await expect(page.getByRole('button', { name: /Stop & keep clip/i })).toBeEnabled();
  await page.waitForTimeout(waitMs);
  await page.getByRole('button', { name: /Stop & keep clip/i }).click();
  await expect(page.getByText(/Saved a|Test complete/)).toBeVisible();
}

test('@claim:demo-sandbox opens seeded data in an isolated namespace and discards it when leaving', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByLabel('Demo mode')).toContainText('nothing is saved to your collection');
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
  await page.getByLabel('Sound A').fill('Demo leak');
  await page.getByLabel('Sound A').blur();
  await expect(page.getByText('Label names saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/#field-kit$/);
  await expect(page.getByLabel('Sound A')).toHaveValue('Tap');
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(databases).not.toContain('demo:sound-pattern-playground');
});

test('@claim:local-processing records without sending data to another origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByLabel(/ready to use this device/i).check();
  await recordClip(page);
  const external = requests.filter((url) => new URL(url).origin !== 'http://127.0.0.1:4173');
  expect(external).toEqual([]);
});

test('@claim:microphone-consent asks for explicit consent before capture', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Start listening/i }).click();
  await expect(page.getByText('Check the consent box before requesting microphone access.')).toBeVisible();
  await expect(page.getByLabel(/ready to use this device/i)).toBeFocused();
});

test('@claim:recording-limit stops a recording at four seconds', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel(/ready to use this device/i).check();
  await page.getByRole('button', { name: /Start listening/i }).click();
  await expect(page.locator('#timer')).toHaveText('00:04.0', { timeout: 6000 });
  await expect(page.getByText(/Saved a “Desk tap” example/)).toBeVisible();
  await expect(page.locator('.specimen-info small').first()).toContainText('4.0 s');
});

test('@claim:offline-reload restores the demo after the first visit', async ({ page, context }) => {
  await page.goto('/demo');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    await registration.update().catch(() => undefined);
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
  await expect(page.getByLabel('Demo mode')).toBeVisible();
  await expect(page.locator('#network-status')).toContainText(/Offline/i);
});

test('@claim:storage-persistence restores local labels and recordings after reload', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel('Sound A').fill('Finger snap');
  await page.getByLabel('Sound A').blur();
  await expect(page.getByText('Label names saved on this device.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Sound A')).toHaveValue('Finger snap');
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
});

test('@claim:csv-export exports one feature row per recording', async ({ page }) => {
  await page.goto('/demo');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export features CSV' }).click();
  const download = await pending;
  const body = await readFile(await download.path() as string, 'utf8');
  const rows = body.trim().split('\n');
  expect(rows[0]).toContain('centroid_hz');
  expect(rows).toHaveLength(5);
});

test('@claim:json-roundtrip exports audio and imports it back into the sandbox', async ({ page }) => {
  await page.goto('/demo');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export dataset' }).click();
  const download = await pending;
  const body = await readFile(await download.path() as string);
  const payload = JSON.parse(body.toString());
  expect(payload.samples).toHaveLength(4);
  expect(payload.samples.every((sample: { audioData?: string }) => sample.audioData?.startsWith('data:audio/'))).toBe(true);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.locator('.delete-specimen').first().click();
  await expect(page.getByText('3 recordings on this device')).toBeVisible();
  await page.getByLabel('Import dataset').setInputFiles({ name: 'playground.json', mimeType: 'application/json', buffer: body });
  await expect(page.getByText('Imported 4 recordings and merged them with this collection.')).toBeVisible();
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
});

test('@claim:transparent-classifier shows the nearest examples and their distances', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('The baseline’s guess')).toBeVisible();
  await expect(page.locator('#guess-label')).toHaveText('Desk tap');
  await expect(page.locator('.neighbor')).toHaveCount(3);
  await expect(page.locator('.neighbor-distance')).toHaveCount(3);
});

test('@claim:local-delete removes one recording or the complete dataset', async ({ page }) => {
  await page.goto('/demo');
  page.on('dialog', (dialog) => void dialog.accept());
  await page.locator('.delete-specimen').first().click();
  await expect(page.getByText('3 recordings on this device')).toBeVisible();
  await page.getByRole('button', { name: 'Erase all local data' }).click();
  await page.getByRole('button', { name: 'Erase everything' }).click();
  await expect(page.getByText('0 recordings on this device')).toBeVisible();
  const count = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('demo:sound-pattern-playground');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const countRequest = request.result.transaction('samples').objectStore('samples').count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    };
  }));
  expect(count).toBe(0);
});

test('@claim:feature-views shows three visual summaries with text alternatives', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('#feature-workbench canvas')).toHaveCount(3);
  await expect(page.locator('#waveform-description')).not.toBeEmpty();
  await expect(page.locator('#spectrogram-description')).not.toBeEmpty();
  await expect(page.locator('#mfcc-description')).not.toBeEmpty();
});

test('@claim:editable-labels saves exactly three distinct sound names', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel('Sound A').fill('Finger snap');
  await page.getByLabel('Sound A').blur();
  await expect(page.getByText('Label names saved on this device.')).toBeVisible();
  await expect(page.locator('.mode-tab[data-index="0"]')).toContainText('Finger snap');
  await expect(page.locator('.label-fields input')).toHaveCount(3);
});

test('@claim:misclassification-mark stores and displays a wrong-guess mark', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Mark as a misclassification' }).click();
  await expect(page.getByText('Marked. Finding wrong guesses is part of the experiment.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove misclassification mark' })).toBeVisible();
});

test('@claim:installable-pwa ships a standalone manifest and active offline worker', async ({ page }) => {
  await page.goto('/demo');
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192' }),
    expect.objectContaining({ sizes: '512x512' }),
    expect.objectContaining({ purpose: 'maskable' }),
  ]));
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe('http://127.0.0.1:4173/');
});

test('@claim:no-account opens the complete playground without sign-in or payment', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
  await expect(page.locator('input[type="password"], input[autocomplete="cc-number"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Start listening/i })).toBeEnabled();
});

test('rejects the verifier malformed import atomically and remains healthy after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/demo');
  const malformed = JSON.stringify({ schemaVersion: 1, labels: ['A', 'B', 'C'], samples: [{ id: 'broken', audioData: 'data:audio/webm;base64,', vector: [] }] });
  await page.getByLabel('Import dataset').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(malformed) });
  await expect(page.getByText('That file is not a valid Sound Pattern Playground dataset.')).toBeVisible();
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
  const broken = await page.evaluate(async () => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open('demo:sound-pattern-playground');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const get = request.result.transaction('samples').objectStore('samples').get('broken');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    };
  }));
  expect(broken).toBeUndefined();
  await page.reload();
  await expect(page.getByText('4 recordings on this device')).toBeVisible();
  expect(errors).toEqual([]);
});
