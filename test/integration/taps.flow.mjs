// A phone used by taps alone, with the touches every browser's driver can make: this flow runs on
// Safari's engine too (STUDIO_BROWSER=webkit), where the finger drags of touch.flow.mjs cannot.
import { openStudio } from './harness.mjs';
import { createProject, openDock, paintedPixels, status } from './studio.mjs';

const { page, check, finish, shots } = await openStudio({ device: 'iPhone 13' });
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const painted = () => paintedPixels(canvas, 32);
// a finger down and up on the middle of an art pixel
const tapPixel = async (x, y) => {
  const art = await canvas.boundingBox();
  const scale = art.width / 32;

  await page.touchscreen.tap(art.x + (x + 0.5) * scale, art.y + (y + 0.5) * scale);
  await page.waitForTimeout(350);
};
const tool = (name) => page.locator('#rail').getByRole('button', { name }).tap();
const said = () => page.locator('.toast').textContent();

check(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'the editor fits the phone’s screen',
);
await tapPixel(4, 4);
check((await painted()).join() === '4,4', 'a tap with the Pencil draws one pixel, where it landed');

await tool('Fill');
check(
  (await page.locator('.toast').textContent()).startsWith('Fill'),
  'a tool tapped says what it does',
);
await tapPixel(20, 20);
check((await painted()).length === 32 * 32, 'a tap with Fill fills');
await page.getByRole('button', { name: 'Undo' }).tap();
await page.waitForTimeout(250);
check((await painted()).join() === '4,4', 'Undo, tapped, takes it back');

await page.locator('.dock-tab', { hasText: 'Colours' }).tap();
await page.waitForTimeout(500);
check(await page.locator('#colour-pick').isVisible(), 'a tap on the dock opens a panel');
await page.getByRole('group', { name: 'Basic colours' }).getByRole('button').nth(5).tap();
await page.locator('.dock-tab', { hasText: 'Colours' }).tap();
await page.waitForTimeout(400);
await tool('Pencil');
await tapPixel(10, 10);
check(
  (await status(page)).includes('sprite 7×7') && (await status(page)).includes('2 colours'),
  'a colour tapped is the one the next tap draws with',
);

// the tap that puts a menu away is not also a stroke
await page.getByRole('button', { name: 'More', exact: true }).tap();
const menu = await page.locator('.menu').boundingBox();
const below = await canvas.boundingBox();

// a spot of the canvas the menu does not lie over
await page.touchscreen.tap(below.x + 6, Math.max(menu.y + menu.height + 12, below.y + 6));
await page.waitForTimeout(350);
check(
  (await page.locator('.menu').count()) === 0 && (await status(page)).includes('sprite 7×7'),
  'a tap on the canvas beside a menu closes the menu and draws nothing',
);

// "Select a colour" has nothing to select on a clear pixel; on the art, its bar keeps clear of it
await tool(/^Select a colour/);
await tapPixel(30, 2);
check(
  (await page.locator('.toast').textContent()).startsWith('There is no colour there') &&
    !(await page.locator('.selection-bar').isVisible()),
  'a clear pixel has no colour to select, and says so',
);
await tapPixel(10, 10);
const bar = await page.locator('.selection-bar').boundingBox();
const art = await canvas.boundingBox();
check(
  bar.y > art.y + (11 * art.width) / 32 && bar.height < 60,
  'the selection’s bar is one row, clear of the pixels selected',
);
// what Shift does to this tool is a button on the bar, as fingers have no Shift
await page.locator('.selection-bar').getByRole('button', { name: 'Everywhere' }).tap();
await page.waitForTimeout(250);
check(
  await page.locator('.selection-bar').isVisible(),
  'Everywhere, on the bar, takes every pixel of the colour',
);
await page.locator('.selection-bar').getByRole('button', { name: 'Done' }).tap();
await tool(/^Lasso/);
check(
  (await said()).includes('Add and Take away are on its bar'),
  'the Lasso says where adding and taking away are',
);
await page.locator('.dock-tab', { hasText: 'Brush' }).tap();
await page.waitForTimeout(500);
await page.locator('#shape-even').tap();
check(await page.locator('#shape-even').isChecked(), 'Even shapes stands in for Shift on shapes');
await page.locator('.dock-tab', { hasText: 'Brush' }).tap();
await page.waitForTimeout(400);
await tool('Pencil');

await page.getByRole('button', { name: 'More', exact: true }).tap();
await page.getByRole('menuitem', { name: /Canvas size/ }).tap();
await page.waitForTimeout(700);
const sheet = await page.locator('.sheet').boundingBox();
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
check(
  sheet.width === screen.width && Math.abs(sheet.y + sheet.height - screen.height) < 1,
  'a window tapped open stands on the bottom edge',
);
await page.screenshot({ path: `${shots}/taps-sheet.png` });
await page.fill('#canvas-width', '0');
await page.getByRole('button', { name: 'Change the size' }).tap();
check(
  (await page.locator('.sheet').count()) === 1 &&
    (await page.locator('.toast').textContent()).includes('from 8 to 512') &&
    (await status(page)).includes('32×32 canvas'),
  'a size no canvas can have is said, and nothing is changed',
);
await page.locator('.sheet-close').tap();
check((await page.locator('.sheet').count()) === 0, 'and its × closes it');
await page.waitForTimeout(600);

const resizeTo = async (width, press) => {
  await page.getByRole('button', { name: 'More', exact: true }).tap();
  await page.getByRole('menuitem', { name: /Canvas size/ }).tap();
  await page.waitForTimeout(700);
  await page.fill('#canvas-width', String(width));
  await press();
  await page.waitForTimeout(900);
};

await resizeTo(40, () => page.locator('#canvas-width').press('Enter'));
check(
  (await page.locator('.sheet').count()) === 0 && (await status(page)).includes('40×32 canvas'),
  'Enter in a size’s field changes the size',
);
await resizeTo(32, () => page.getByRole('button', { name: 'Change the size' }).tap());
await page.getByRole('button', { name: 'Symmetry' }).tap();
check(
  (await said()).startsWith('Symmetry: draw one half'),
  'Symmetry says what it does when tapped on',
);
await page.getByRole('button', { name: 'Symmetry' }).tap();
check((await said()) === 'Symmetry off', 'and that it is off');
await tapPixel(15, 15);
check((await status(page)).includes('sprite 12×12'), 'and the canvas takes taps again');

// each new frame put the frames back at their start: the frame made, and the + for the next,
// were off the screen's edge
await openDock(page, 'Frames');

for (let i = 0; i < 6; i++) {
  await page.locator('.grid-row.current .cell-add').tap();
  await page.waitForTimeout(250);
}

const ends = await page.evaluate(() =>
  ['.grid-row.current .cell.selected', '.grid-row.current .cell-add'].map(
    (part) => document.querySelector(part).getBoundingClientRect().right,
  ),
);
check(
  ends.every((right) => right <= screen.width),
  'the frame just made and the + after it are in sight',
);
await page.screenshot({ path: `${shots}/taps-frames.png` });
await finish();
