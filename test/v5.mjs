import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, side, bg] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  colorScheme: 'dark',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
const log = (...parts) => console.log(...parts);
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(url);
await page.waitForTimeout(1200);
const drop = async (path, name) => {
  const dt = await page.evaluateHandle(
    ([bytes, count]) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], count, { type: 'image/webp' }));
      return transfer;
    },
    [[...readFileSync(path)], name],
  );
  await page.dispatchEvent('#stage', 'drop', { dataTransfer: dt });
};
const saveDownload = async (click, name) => {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    click(),
  ]);
  if (download) {
    await download.saveAs(`${out}/${name}`);
  }
  return download ? download.suggestedFilename() : 'none';
};

// 1. a side-scroller project
await page.locator('button.wordmark').click();
await page.fill('#project-name', 'Slime');
await page.selectOption('#project-profile', 'generic');
await page.selectOption('#project-directions', 'side');
await page.fill('#project-width', '48');
await page.fill('#project-height', '48');
await page.getByRole('button', { name: 'Create project' }).click();
await page.waitForTimeout(500);
log(
  'TOOLBAR',
  await page.locator('button.wordmark small').textContent(),
  '| mode label:',
  await page.locator('.segmented button').nth(2).textContent(),
);
log('VIEWS', await page.locator('.view-row .view-name').allTextContents());
await drop(side, 'slime.webp');
await page.waitForSelector('pre.report', { timeout: 20000 });
log('CLEAN', (await page.locator('pre.report').textContent()).replace(/\n/g, ' | '));
await page.getByRole('button', { name: /Use for Side/ }).click();
await page.waitForTimeout(1600);
log('STATUS', await page.locator('#statusbar span').nth(2).textContent());

// 2. outfits with own parts
await page.getByRole('button', { name: 'Outfits…' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Add a part' }).click();
await page.locator('.part-row .swatch').first().click();
await page.locator('.part-row .swatch').nth(1).click();
await page.locator('input[type=color]').first().fill('#30d158');
await page.getByRole('button', { name: 'Keep these colours as an outfit' }).click();
await page.screenshot({ path: `${out}/50-outfits.png` });
await page.getByRole('button', { name: 'Wear it (whole character)' }).click();
await page.waitForTimeout(300);

// 3. export every format
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
await page.waitForTimeout(300);
log('PRESETS', await page.locator('.sheet .segmented button').allTextContents());
log(
  'JSON',
  await saveDownload(
    () => page.getByRole('button', { name: 'Sheets + JSON' }).click(),
    'sheets.zip',
  ),
);
log(
  'FRAMES',
  await saveDownload(
    () => page.getByRole('button', { name: 'Separate frames' }).click(),
    'frames.zip',
  ),
);
log(
  'GIFS',
  await saveDownload(() => page.getByRole('button', { name: 'Animated GIFs' }).click(), 'gifs.zip'),
);
await page.keyboard.press('Escape');

// 4. preview with an own background
await page.getByRole('button', { name: 'Preview', exact: true }).click();
await page.waitForTimeout(300);
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Use your own background…' }).click();
await (await chooser).setFiles(bg);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/51-preview.png` });

// 4b. every button that opens a file picker opens one
for (const [label, where] of [
  ['Add picture to trace…', null],
  ['Clean several…', null],
  ['Open a project file…', 'projects'],
]) {
  if (where === 'projects') {
    await page.locator('button.wordmark').click();
  }
  if (!where) {
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
  }
  const picker = page.waitForEvent('filechooser', { timeout: 4000 }).then(
    () => 'opened',
    () => 'NOT OPENED',
  );
  await page.getByRole('button', { name: label }).first().click();
  log('PICKER', label, await picker);
  await page.keyboard.press('Escape');
}

// 5. back to Sochetra, reload, still there; then delete Slime
await page.getByRole('button', { name: 'Edit', exact: true }).click();
await page.locator('button.wordmark').click();
await page
  .locator('.version-row', { hasText: 'Sochetra' })
  .getByRole('button', { name: 'Open' })
  .click();
await page.waitForTimeout(800);
log(
  'OPEN',
  await page.locator('button.wordmark small').textContent(),
  '| views',
  await page.locator('.view-row .view-meta').allTextContents(),
);
await page.waitForTimeout(1500);
await page.reload();
await page.waitForTimeout(1500);
log('AFTER RELOAD', await page.locator('button.wordmark small').textContent());
await page.locator('button.wordmark').click();
const slime = page.locator('.version-row', { hasText: 'Slime' });
log('LISTED', await page.locator('.version-row').count());
await slime.getByRole('button', { name: 'Delete' }).click();
await slime.getByRole('button', { name: /Delete Slime/ }).click();
await page.waitForTimeout(600);
log('AFTER DELETE', await page.locator('.version-row').count());
log('ERRORS', JSON.stringify(errors));
await browser.close();
