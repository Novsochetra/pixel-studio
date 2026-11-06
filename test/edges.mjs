import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, image] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true })
).newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(url);
await page.waitForTimeout(1200);
for (const [set, width, height] of [
  ['eight', 32, 32],
  ['four-drawn', 96, 64],
]) {
  await page.locator('button.wordmark').click();
  await page.locator('details', { hasText: 'New project' }).evaluate((details) => {
    details.open = true;
  });
  await page.fill('#project-name', `Edge ${set}`);
  await page.selectOption('#project-profile', 'generic');
  await page.selectOption('#project-directions', set);
  await page.fill('#project-width', String(width));
  await page.fill('#project-height', String(height));
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForTimeout(500);
  console.log(
    set,
    'views',
    (await page.locator('.view-row .view-name').allTextContents()).join(', '),
  );
  const dt = await page.evaluateHandle(
    (bytes) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], 'x.webp', { type: 'image/webp' }));
      return transfer;
    },
    [...readFileSync(image)],
  );
  await page.dispatchEvent('#stage', 'drop', { dataTransfer: dt });
  await page.waitForSelector('pre.report', { timeout: 20000 });
  console.log(' ', (await page.locator('pre.report').textContent()).split('\n').at(-1));
  await page.getByRole('button', { name: /Use for/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Copy to other views' }).click();
  await page.getByRole('button', { name: 'Views board' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByLabel('Mirrored side').check();
  await page.waitForTimeout(200);
  console.log('  preview:', await page.locator('.stage .hint').last().textContent());
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
  await page.waitForTimeout(300);
  console.log('  sheet:', await page.locator('.sheet p.hint').first().textContent());
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    page.getByRole('button', { name: 'Animated GIFs' }).click(),
  ]);
  console.log('  gifs:', download ? download.suggestedFilename() : 'none');
  await page.keyboard.press('Escape');
}
console.log('errors', JSON.stringify(errors));
await browser.close();
