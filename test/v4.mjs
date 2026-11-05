import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [url, out, side, front] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark', acceptDownloads: true })).newPage();
const errors = [];
const log = (...a) => console.log(...a);
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { localStorage.setItem('pixel-clean-quick-start', '1'); localStorage.setItem('pixel-clean-folded', '[]'); });
await page.goto(url); await page.waitForTimeout(1200);
const drop = async (path, name) => {
  const dt = await page.evaluateHandle(([bytes, n]) => { const d = new DataTransfer(); d.items.add(new File([new Uint8Array(bytes)], n, { type: 'image/webp' })); return d; }, [[...readFileSync(path)], name]);
  await page.dispatchEvent('#stage', 'drop', { dataTransfer: dt });
};
const frames = () => page.locator('.frames .frame').count();

// 1. the reported bug: Art hidden, a new Layer 2 on top, then clean a side image
await page.getByRole('button', { name: 'Add layer' }).click();
await page.getByRole('button', { name: 'Hide Art' }).click();
await page.locator('.view-row', { hasText: 'Side' }).click();
await drop(side, 'side.webp');
await page.waitForSelector('pre.report', { timeout: 20000 });
log('HIDDEN-ART CLEAN:', (await page.locator('pre.report').textContent()).split('\n')[0]);
await page.keyboard.press('Escape');
log('FRONT META:', await page.locator('.view-row', { hasText: 'Front' }).locator('.view-meta').textContent());
await page.getByRole('button', { name: 'Show Art' }).click();

// 2. structural undo
await page.locator('.view-row', { hasText: 'Front' }).click();
const before = await frames();
await page.getByRole('button', { name: 'Duplicate' }).click();
await page.getByRole('button', { name: 'Duplicate' }).click();
log('FRAMES', before, '->', await frames());
await page.keyboard.press('Meta+z'); await page.keyboard.press('Meta+z');
log('AFTER 2 UNDOS', await frames());
await page.keyboard.press('Meta+Shift+z');
log('AFTER REDO', await frames());

// 3. copy to every view, pins, selection bar
await page.getByRole('button', { name: 'Copy to other views' }).click();
await page.keyboard.press('p');
const canvas = page.getByLabel('Pixel canvas'); let box = await canvas.boundingBox(); const z = box.width / 160;
await page.mouse.click(box.x + 80 * z, box.y + 40 * z);
await page.selectOption('#pin-name', 'Left foot');
await page.mouse.click(box.x + 70 * z, box.y + 126 * z);
await page.keyboard.press('s');
await page.mouse.move(box.x + 50 * z, box.y + 60 * z); await page.mouse.down(); await page.mouse.move(box.x + 70 * z, box.y + 95 * z, { steps: 4 }); await page.mouse.up();
await page.getByRole('button', { name: 'Flip ↔' }).click();
await page.getByRole('button', { name: '⟳ 90°' }).click();
await page.screenshot({ path: `${out}/40-pins-selection.png` });
await page.getByRole('button', { name: 'Done' }).click();

// 4. zoom with ⌘ + wheel, pan with space
const zoomBefore = await page.locator('.zoom-label').textContent();
await page.mouse.move(box.x + 100, box.y + 100);
await page.keyboard.down('Meta'); await page.mouse.wheel(0, -120); await page.keyboard.up('Meta');
await page.waitForTimeout(200);
log('ZOOM', zoomBefore, '->', await page.locator('.zoom-label').textContent());
await page.keyboard.down(' ');
await page.mouse.move(box.x + 200, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 150, { steps: 3 }); await page.mouse.up();
await page.keyboard.up(' ');
log('SCROLL', await page.evaluate(() => [document.getElementById('stage').scrollLeft, document.getElementById('stage').scrollTop]));

// 5. shortcuts, folding a section
await page.keyboard.press('?'); await page.waitForTimeout(200);
log('SHORTCUTS', await page.locator('.shortcut').count());
await page.keyboard.press('Escape');
await page.locator('section[data-name="guides"] > h2').click();
log('GUIDES FOLDED', await page.locator('section[data-name="guides"]').getAttribute('data-collapsed'));

// 6. live animation on the pitch
await page.getByRole('button', { name: 'On the pitch' }).click();
await page.getByLabel('Run across').check();
await page.getByRole('button', { name: 'Play' }).click(); await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/41-pitch.png` });
await page.getByRole('button', { name: 'Pause' }).click();

// 7. game pack
await page.getByRole('button', { name: 'Edit', exact: true }).click();
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click(); await page.waitForTimeout(300);
const [download] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }).catch(() => null), page.getByRole('button', { name: 'Naga Eleven game pack' }).click()]);
if (download) { await download.saveAs(`${out}/pack.zip`); log('PACK', download.suggestedFilename()); }
await page.keyboard.press('Escape');

// 8. clean straight into an empty Front
await page.locator('.view-row', { hasText: 'Front' }).click();
await page.getByRole('button', { name: 'Clear' }).click();
await drop(front, 'front.webp');
await page.waitForSelector('pre.report', { timeout: 20000 });
log('FRONT CLEAN:', (await page.locator('pre.report').textContent()).replace(/\n/g, ' | '));
await page.getByRole('button', { name: /Use for Front/ }).click();
log('ERRORS', JSON.stringify(errors));
await browser.close();
