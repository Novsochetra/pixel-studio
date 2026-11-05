// Frames shared by every view: a new frame takes an upload in any view, frames drag into a new
// order, a cleaned image never lands on a picture to trace, and several images fill frames.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, side, back, out] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark' })).newPage();
const errors = [];
const problems = [];
const expect = (ok, what) => { if (!ok) problems.push(what); console.log(ok ? 'ok  ' : 'FAIL', what); };
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(url); await page.waitForTimeout(1200);
const labels = () => page.locator('.frames .frame span').allTextContents();
const view = (name) => page.locator('.view-row', { hasText: new RegExp(`^${name}`) }).first().click();
const files = (paths) => paths.map(([path, name]) => ({ name, mimeType: 'image/webp', buffer: readFileSync(path) }));

await view('Side');
await page.getByRole('button', { name: 'New frame' }).click(); await page.waitForTimeout(300);
expect(JSON.stringify(await labels()) === '["1","2 · empty"]', 'a new frame is added after the open one, empty');
expect(await page.locator('.empty-frame').isVisible(), 'an empty frame says what to do');
await view('Front');
expect((await labels()).length === 2 && (await page.locator('.frame[aria-selected=true] span').textContent()).startsWith('2'), 'the Front view has frame 2 too, and stays on it');

await view('Side');
const chooser = page.waitForEvent('filechooser');
await page.locator('.empty-frame').getByRole('button', { name: /Image into this frame/ }).click();
await (await chooser).setFiles(files([[side, 'side.webp']]));
await page.waitForSelector('pre.report', { timeout: 20000 });
expect(await page.getByRole('button', { name: 'Use for Side, frame 2' }).count() === 1, 'the dialog names the frame it cleans into');
await page.getByRole('button', { name: 'Use for Side, frame 2' }).click(); await page.waitForTimeout(500);
expect(JSON.stringify(await labels()) === '["1","2"]', 'the image went into frame 2 and frame 1 kept its art');
expect(!(await page.locator('.empty-frame').isVisible()), 'the empty-frame card goes once the frame has art');

await view('Back');
await page.getByRole('button', { name: 'Start from frame 1' }).click(); await page.waitForTimeout(300);
expect(JSON.stringify(await labels()) === '["1","2"]', 'Start from frame 1 fills an empty frame');

await page.getByRole('button', { name: 'New frame' }).click(); await page.waitForTimeout(300);
const strip = page.locator('.frames .frame');
const from = await strip.nth(2).boundingBox();
const to = await strip.nth(0).boundingBox();
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(from.x - 10, from.y + 20, { steps: 4 });
await page.mouse.move(to.x + 4, to.y + 20, { steps: 6 });
await page.screenshot({ path: `${out}/60-frame-drag.png` });
await page.mouse.up(); await page.waitForTimeout(300);
expect(JSON.stringify(await labels()) === '["1 · empty","2","3"]', 'dragging frame 3 to the front moves it there');
expect((await page.locator('.frame[aria-selected=true] span').textContent()).startsWith('1'), 'the moved frame is the one selected');
await view('Side');
expect(JSON.stringify(await labels()) === '["1 · empty","2","3"]', 'the frame moved in every view');
await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
expect(JSON.stringify(await labels()) === '["1","2","3 · empty"]', 'undo puts the frame back');

const trace = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Add picture to trace…' }).click();
await (await trace).setFiles(files([[back, 'trace.webp']]));
await page.waitForTimeout(800);
await page.locator('.frames .frame').nth(2).click();
const into = page.waitForEvent('filechooser');
await page.locator('.empty-frame').getByRole('button', { name: /Image into this frame/ }).click();
await (await into).setFiles(files([[side, 'side.webp']]));
await page.waitForSelector('pre.report', { timeout: 20000 });
await page.getByRole('button', { name: /^Use for/ }).click(); await page.waitForTimeout(500);
expect(JSON.stringify(await labels()) === '["1","2","3"]', 'with a picture to trace selected, the cleaned art still lands on the art layer');

await page.locator('.frames .frame').nth(0).click();
const many = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Clean several…' }).click();
await (await many).setFiles(files([[side, 'run-side-10.webp'], [side, 'run-side-2.webp'], [back, 'run-back-1.webp']]));
await page.waitForTimeout(500);
const rows = await page.locator('.batch-row').evaluateAll((all) => all.map((row) => `${row.querySelector('.view-name').textContent}:${row.querySelectorAll('select')[1].value}`));
expect(JSON.stringify(rows) === '["run-back-1.webp:0","run-side-2.webp:0","run-side-10.webp:1"]', `several images fill frames in name order (${rows})`);
await page.keyboard.press('Escape');
await page.screenshot({ path: `${out}/61-frames.png` });
console.log('ERRORS', JSON.stringify([...errors, ...problems]));
await browser.close();
