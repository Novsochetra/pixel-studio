import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  colorScheme: 'dark',
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(url);
await page.waitForTimeout(1200);
await page.selectOption('#new-animation', 'Run');
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Duplicate' }).click();
await page.getByRole('button', { name: 'Duplicate' }).click();
// select tool: drag a box around the left arm and nudge it
await page.keyboard.press('s');
const canvas = page.locator('.canvas-holder canvas');
const box = await canvas.boundingBox();
const zoom = box.width / 160;
await page.mouse.move(box.x + 53 * zoom, box.y + 60 * zoom);
await page.mouse.down();
await page.mouse.move(box.x + 66 * zoom, box.y + 95 * zoom, { steps: 5 });
await page.mouse.up();
await page.keyboard.press('ArrowUp');
await page.keyboard.press('ArrowUp');
await page.getByRole('button', { name: 'Onion skin' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/20-run-edit.png` });
await page.getByRole('button', { name: 'Add layer' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/21-export.png` });
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
  page.getByRole('button', { name: /Download run.png/ }).click(),
]);
console.log('DOWNLOAD', download ? download.suggestedFilename() : 'none');
if (download) {
  await download.saveAs(`${out}/run.png`);
}
await page.getByRole('button', { name: 'Naga Eleven today (64×62)' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/22-export-game.png` });
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(700);
console.log('SAVE', await page.locator('.save-status').textContent());
console.log('ERRORS', JSON.stringify(errors));
await browser.close();
