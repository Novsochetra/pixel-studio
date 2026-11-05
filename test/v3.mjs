import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, out, side, back] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark', acceptDownloads: true })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { localStorage.setItem('pixel-clean-quick-start', '1'); localStorage.setItem('pixel-clean-folded', '[]'); });
await page.goto(url); await page.waitForTimeout(1200);
// kits
await page.getByRole('button', { name: 'Team kits…' }).click(); await page.waitForTimeout(300);
await page.selectOption('#outfit-source', 'team:brazil'); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/30-kits.png` });
await page.getByRole('button', { name: 'Wear it (whole character)' }).click(); await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/31-wearing.png` });
await page.keyboard.press('Meta+z'); await page.waitForTimeout(200);
// shade brush stroke + silhouette
await page.keyboard.press('d');
const canvas = page.getByLabel('Pixel canvas'); const box = await canvas.boundingBox(); const z = box.width / 160;
await page.mouse.move(box.x + 70 * z, box.y + 70 * z); await page.mouse.down(); await page.mouse.move(box.x + 85 * z, box.y + 72 * z, { steps: 6 }); await page.mouse.up();
await page.getByRole('button', { name: 'Silhouette' }).click(); await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/32-silhouette.png` });
await page.getByRole('button', { name: 'Colour', exact: true }).click();
// board markup
await page.getByRole('button', { name: 'Views board' }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Draws a mark' }).click();
const board = page.locator('.stage canvas').first(); const bb = await board.boundingBox();
await page.mouse.move(bb.x + bb.width * 0.55, bb.y + bb.height * 0.5); await page.mouse.down(); await page.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height * 0.6, { steps: 8 }); await page.mouse.up();
await page.getByRole('button', { name: 'Adds a note' }).click();
await page.fill('#note-text', 'arm too thin');
await page.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.45);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/33-markup.png` });
// chatgpt helper
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /ChatGPT/ }).click(); await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/34-chatgpt.png` });
console.log('PROMPT', await page.locator('#prompt-text').inputValue());
await page.keyboard.press('Escape');
// history
await page.getByRole('button', { name: 'History' }).click(); await page.waitForTimeout(300);
await page.fill('#version-name', 'Before experiments');
await page.getByRole('button', { name: 'Save a version' }).click(); await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/35-history.png` });
await page.getByRole('button', { name: 'Go back to this' }).first().click(); await page.waitForTimeout(800);
// batch
await page.getByRole('button', { name: 'Edit', exact: true }).click(); await page.waitForTimeout(200);
const files = [[side, 'new-side.webp'], [back, 'new-back.webp']].map(([p, n]) => ({ name: n, mimeType: 'image/webp', buffer: readFileSync(p) }));
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: /Clean several/ }).click();
await (await chooser).setFiles(files);
await page.waitForSelector('text=feet on row', { timeout: 20000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/36-batch.png` });
await page.getByRole('button', { name: 'Use them all' }).click(); await page.waitForTimeout(400);
// outline panel
await page.getByRole('button', { name: /Thin a doubled outline/ }).click(); await page.waitForTimeout(300);
console.log('TOAST', await page.locator('.toast').textContent().catch(() => ''));
await page.waitForTimeout(1600);
console.log('SAVE', await page.locator('.save-status').textContent());
console.log('ERRORS', JSON.stringify(errors));
await browser.close();
