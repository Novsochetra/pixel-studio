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
  openWorkspace,
  selectView,
} from './studio.mjs';

const { page, check, finish, images } = await openStudio();
await openExample(page);
const said = () => page.locator('.toast').textContent();

// a guide removed could not be brought back: undo took back a stroke of the art instead
await openPanel(page, 'Guide lines');
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

// one mark on the Views board could not be taken away: only all of them, or the last
await openWorkspace(page, 'Views board');
await page.getByRole('button', { name: 'Draws a mark' }).click();
const board = await page.locator('.board-canvas').boundingBox();
await page.mouse.move(board.x + 60, board.y + 80);
await page.mouse.down();
await page.mouse.move(board.x + 90, board.y + 100, { steps: 4 });
await page.mouse.up();
await page.getByRole('button', { name: 'Rubs one out' }).click();
await page.mouse.click(board.x + 75, board.y + 90);
await page.keyboard.press('Meta+z');
check((await said()) === 'Undone: Rub out mark', 'a press on a mark rubs that one out');
await openWorkspace(page, 'Edit');

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

// zoomed past the window, the preview carried its own controls off the screen
await page.setViewportSize({ width: 1100, height: 700 });
await openWorkspace(page, 'On the pitch');
await page.getByRole('button', { name: '3×' }).click();
await page.waitForTimeout(400);
const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
const zooms = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
check(
  play.x >= 0 && zooms.x + zooms.width <= 1100,
  'zoomed to 3×, the preview’s controls are still in the window',
);
await page.getByRole('button', { name: '1×' }).click();
await openWorkspace(page, 'Edit');
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
await finish();
