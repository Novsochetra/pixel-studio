// A phone used by taps alone, with the touches every browser's driver can make: this flow runs on
// Safari's engine too (STUDIO_BROWSER=webkit), where the finger drags of touch.flow.mjs cannot.
import { openStudio } from './harness.mjs';
import { createProject, paintedPixels, status } from './studio.mjs';

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
await page.locator('.sheet-close').tap();
check((await page.locator('.sheet').count()) === 0, 'and its × closes it');
await page.waitForTimeout(600);
await tapPixel(15, 15);
check((await status(page)).includes('sprite 12×12'), 'and the canvas takes taps again');
await finish();
