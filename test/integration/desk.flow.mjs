// Bugs found by a second pass over the studio by hand, at a desk, each kept fixed: what went
// wrong is said above its check.
import { openStudio } from './harness.mjs';
import {
  chooseFiles,
  cleanReport,
  dropImage,
  imageFile,
  openExample,
  openPanel,
  selectView,
} from './studio.mjs';

const { page, check, finish, images } = await openStudio();
await openExample(page);
const said = () => page.locator('.toast').textContent();

// a guide removed could not be brought back: undo took back a stroke of the art instead
await openPanel(page, 'Guides');
const guides = () => page.locator('.guide-row').count();
const had = await guides();
await page.getByRole('button', { name: 'Remove Top of hair' }).click();
await page.waitForTimeout(200);
check((await guides()) === had - 1, 'a guide is removed');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(
  (await guides()) === had && (await said()) === 'Undone: Remove Top of hair',
  'and undo brings it back',
);

// undoing a new frame took the frame away but left the editor wherever it had settled, and redo
// brought the frame back without going to it
const onFrame = () =>
  page
    .locator('.grid-row.current .cell')
    .evaluateAll((cells) => cells.findIndex((cell) => cell.classList.contains('selected')));
await page.locator('.grid-row.current .cell-add').click();
await page.waitForTimeout(250);
check((await onFrame()) === 1, 'a new frame is the one in hand');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(250);
check((await onFrame()) === 0, 'undo goes back to the frame it was made from');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(250);
check((await onFrame()) === 1, 'and redo goes to the frame again');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(250);

// a palette added to the project could never be taken off it
await page.getByRole('button', { name: 'Swap colours…' }).click();
await page.locator('.sheet .btn.chip').first().click();
const palettes = () => page.locator('#swap-palette option').count();
const offered = await palettes();
await page.getByRole('button', { name: 'Remove', exact: true }).click();
check((await palettes()) === offered - 1, 'a palette can be taken off the project');
await page.keyboard.press('Escape');

// the window's first field was in a part folded shut: the focus stayed on the button behind,
// and Enter opened the window a second time
await page.getByRole('button', { name: 'Team kits…' }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(600);
check(
  await page.evaluate(() => Boolean(document.activeElement.closest('.sheet'))),
  'the Team kits window takes the keyboard when it opens',
);
await page.keyboard.press('Escape');

// a menu stayed where it was when the window changed size, away from the button it hangs from
await page.getByRole('button', { name: 'Download' }).click();
await page.setViewportSize({ width: 1300, height: 900 });
await page.waitForTimeout(300);
check((await page.locator('.menu').count()) === 0, 'a menu is put away when the window resizes');

await page.setViewportSize({ width: 1440, height: 960 });

// a file that is no picture took a frame's place, and pushed the next picture to a new frame
await chooseFiles(
  page,
  () => page.getByRole('button', { name: 'Clean several images into frames' }).click(),
  [
    { name: 'run-side-1.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') },
    imageFile(`${images}/side.webp`, 'run-side-2.webp'),
  ],
);
await page.waitForSelector('.batch-row');
check(
  (await page.locator('.sheet h3').textContent()) === 'Clean 1 image' &&
    (await page.locator('.batch-row').count()) === 1 &&
    (await page.locator('.batch-row select').last().inputValue()) === '0',
  'a file that is no picture is left out, and the picture keeps the first frame',
);
check(
  (await page.locator('.sheet p.hint').allTextContents()).join().includes('was left out'),
  'and the window says a file was left out',
);
await page.keyboard.press('Escape');

// a height typed was ignored by Use, which placed the result cleaned before it
await selectView(page, 'Side');
await dropImage(page, `${images}/side.webp`);
await cleanReport(page);
const use = page.locator('.sheet .btn.primary');
await page.waitForFunction(() => !document.querySelector('.sheet .btn.primary').disabled);
await page.fill('#import-height', '60');
check(await use.isDisabled(), 'a height typed makes Use wait for a cleaning with it');
await page.keyboard.press('Enter');
await page.waitForFunction(() => !document.querySelector('.sheet .btn.primary').disabled, null, {
  timeout: 60000,
});
check((await cleanReport(page)).includes('60'), 'and Enter in the field cleans again, with it');
await page.keyboard.press('Escape');

// a page loaded again came back on the first view with the pencil, whatever was in hand
await selectView(page, 'Back');
await page.keyboard.press('e');
await page.waitForTimeout(700);
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(500);
check(
  (await page.locator('.grid-row.current .grid-view').textContent()) === 'Back' &&
    (await page.getByRole('button', { name: 'Eraser' }).getAttribute('aria-pressed')) === 'true',
  'a page loaded again opens on the view and the tool it was left on',
);

// a stroke undone from another view went back out of sight: the message said Undone, the canvas
// showed nothing change
const editing = () => page.locator('.grid-row.current .grid-view').textContent();
const art = await page.getByLabel('Pixel canvas').boundingBox();

await page.keyboard.press('b');
await page.mouse.click(art.x + 10, art.y + 10);
await selectView(page, 'Front');
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(300);
check((await editing()) === 'Back', 'undo goes to the view its stroke was drawn in');
await selectView(page, 'Side');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.waitForTimeout(300);
check((await editing()) === 'Back', 'and redo draws it again there, in sight');

// a selection flipped, undone and redone was let go by the redo
await page.keyboard.press('s');
await page.mouse.move(art.x + art.width * 0.4, art.y + art.height * 0.3);
await page.mouse.down();
await page.mouse.move(art.x + art.width * 0.6, art.y + art.height * 0.5, { steps: 4 });
await page.mouse.up();
await page.getByRole('button', { name: 'Flip the selection left to right' }).click();
await page.keyboard.press('ControlOrMeta+z');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.waitForTimeout(300);
check(
  await page.locator('.selection-bar').isVisible(),
  'a selection’s step redone keeps the selection',
);
await finish();
