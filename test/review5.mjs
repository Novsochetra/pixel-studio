// The second V5 review's fixes, in the page: a duplicate keeps its background, the projects sheet
// closes after a file opens, and removing the reference view still lets a view be cleaned.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [url, side, bg] = process.argv.slice(2);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: 'dark', acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const problems = [];
const expect = (ok, what) => { if (!ok) problems.push(what); console.log(ok ? 'ok  ' : 'FAIL', what); };
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(url); await page.waitForTimeout(1200);

// a background on the sample, then Duplicate: the copy has it too
await page.getByRole('button', { name: 'On the pitch', exact: true }).click(); await page.waitForTimeout(300);
const chooser = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Use your own background…' }).click();
await (await chooser).setFiles(bg);
await page.waitForTimeout(1200);
await page.locator('button.wordmark').click();
await page.getByRole('button', { name: 'Duplicate' }).click();
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
expect((await page.locator('button.wordmark small').textContent()).includes('copy'), 'the copy is open');
await page.getByRole('button', { name: 'On the pitch', exact: true }).click(); await page.waitForTimeout(500);
expect(await page.getByRole('button', { name: 'Change background…' }).count() === 1, 'the copy keeps the background');

// a project file saved with a background opens with it, and closes the projects sheet
await page.locator('button.wordmark').click();
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save as file' }).click()]);
const file = `${process.env.TMPDIR ?? '/tmp'}/review5-project.json`;
await download.saveAs(file);
expect(typeof JSON.parse(readFileSync(file, 'utf8')).background === 'string', 'the file holds the background');
const picker = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Open a project file…' }).click();
await (await picker).setFiles(file);
await page.waitForTimeout(2000);
expect(await page.locator('.sheet').count() === 0, 'the projects sheet closed after the file opened');
await page.getByRole('button', { name: 'On the pitch', exact: true }).click(); await page.waitForTimeout(500);
expect(await page.getByRole('button', { name: 'Change background…' }).count() === 1, 'the opened file keeps the background');

// remove the Front (reference) view, then clean into the side view
await page.getByRole('button', { name: 'Edit', exact: true }).click(); await page.waitForTimeout(300);
await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
await page.locator('[aria-label="Directions drawn"] button', { hasText: /^Front$/ }).click();
await page.waitForTimeout(400);
expect(!(await page.locator('.view-row .view-name').allTextContents()).includes('Front'), 'the Front view is gone');
await page.locator('.view-row', { hasText: /^Side/ }).first().click();
const dt = await page.evaluateHandle((bytes) => { const d = new DataTransfer(); d.items.add(new File([new Uint8Array(bytes)], 'side.webp', { type: 'image/webp' })); return d; }, [...readFileSync(side)]);
await page.dispatchEvent('#stage', 'drop', { dataTransfer: dt });
const report = await page.waitForSelector('pre.report', { timeout: 20000 }).then(() => page.locator('pre.report').textContent(), () => '');
expect(report.length > 0 && !/undefined|NaN/.test(report), 'cleaning works with the reference view removed');
await page.keyboard.press('Escape');

// "Fit the art" never warns about art outside the frame
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Fit the art' }).click(); await page.waitForTimeout(200);
expect(!(await page.locator('.sheet').textContent()).includes('outside'), 'nothing falls outside a fitted frame');
console.log('ERRORS', JSON.stringify([...errors, ...problems]));
await browser.close();
