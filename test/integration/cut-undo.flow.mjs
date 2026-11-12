// The cut window's own undo: a stroke painted there taken back and made again, by its buttons
// and by the keys, and the window closing without a question once every change is taken back.
import { openStudio } from './harness.mjs';
import { openExample, showViews } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const sheet = page.locator('.sheet');
const undo = sheet.getByRole('button', { name: 'Undo', exact: true });
const redo = sheet.getByRole('button', { name: 'Redo', exact: true });
const head = page.locator('.cut-part', { has: page.getByRole('button', { name: 'Paint Head' }) });
const headSize = () => head.locator('.cut-size').textContent();

await openExample(page);
await showViews(page, 'Front only');
await page.keyboard.press('o');
await page.locator('.pose-bar').getByRole('button', { name: 'Cut into parts…' }).click();
await page.waitForTimeout(300);
check(
  (await undo.isDisabled()) && (await redo.isDisabled()),
  'a cut window just opened has nothing to undo',
);

const guessed = await headSize();
const art = await page.locator('.cut-canvas').boundingBox();

await sheet.getByRole('button', { name: 'Unpaint' }).click();
check(await undo.isDisabled(), 'picking Unpaint is no step');
await page.mouse.click(art.x + art.width / 2, art.y + 40);
await page.waitForTimeout(150);
const unpainted = await headSize();

check(unpainted !== guessed, 'a stroke unpaints some of the head');
check(await undo.isEnabled(), 'and can be undone');
await undo.click();
await page.waitForTimeout(150);
check((await headSize()) === guessed, 'Undo in the cut window takes the stroke back');
check(
  (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Undo' ||
    (await undo.isDisabled()),
  'with the keys still in the window',
);
await redo.click();
await page.waitForTimeout(150);
check((await headSize()) === unpainted, 'and Redo makes it again');

await page.locator('.cut-canvas').click({ position: { x: 2, y: 2 } });
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(150);
check((await headSize()) === guessed, 'the undo keys are the window’s own while it is open');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.waitForTimeout(150);
check((await headSize()) === unpainted, 'and the redo keys');

await head.getByRole('button', { name: 'Remove Head' }).click();
await page.waitForTimeout(150);
check((await page.locator('.cut-part').count()) === 12, 'a part is removed');
await undo.click();
await page.waitForTimeout(150);
check((await page.locator('.cut-part').count()) === 13, 'and Undo brings it back');
check((await headSize()) === unpainted, 'with the pixels it had');
await page.screenshot({ path: `${shots}/cut-undo.png` });

await undo.click();
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(
  (await page.locator('.sheet').count()) === 0,
  'with every change taken back the window closes without asking',
);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(150);
check(
  (await page.locator('.toast').textContent()).includes('Nothing to undo'),
  'and the keys are the editor’s again',
);

await finish();
