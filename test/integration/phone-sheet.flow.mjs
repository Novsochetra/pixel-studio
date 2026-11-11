// A phone held upright: the dock is a bar of tabs floating at the screen's foot, centred, and a
// panel opened from it is a sheet that rises over the bottom of the screen, pulled down by its
// bar or shut by its ×.
import { fingers, openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);
const touch = await fingers(context, page);
const box = (selector) =>
  page.locator(selector).evaluate((element) => {
    const { left, right, top, bottom, width } = element.getBoundingClientRect();

    return { left, right, top, bottom, width, radius: getComputedStyle(element).borderRadius };
  });
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const open = () => page.locator('.app').getAttribute('data-panel');
const dock = await box('#dock');

check(
  dock.width < screen.width - 16 &&
    Math.abs(dock.left - (screen.width - dock.right)) < 2 &&
    parseFloat(dock.radius) > 20,
  'the dock floats in the middle of the screen’s foot, a bar with round ends',
);

await page.locator('.dock-tab', { hasText: 'Brush' }).tap();
await page.waitForTimeout(700);
const sheet = await box('#inspector');
const art = await box('[aria-label="Pixel canvas"]');

check(
  parseFloat(sheet.radius) > 20 && (await page.locator('#inspector .panel-grab').isVisible()),
  'a panel opens as a sheet, with round corners and the bar it is pulled by',
);
check(art.bottom <= sheet.top + 1, 'and the canvas is whole above it');
await page.screenshot({ path: `${shots}/phone-sheet.png` });

await page.getByRole('button', { name: 'Close this panel' }).tap();
await page.waitForTimeout(300);
check((await open()) === '', 'its × shuts it');

await page.locator('.dock-tab', { hasText: 'Colours' }).tap();
await page.waitForTimeout(700);
const grab = await box('#inspector .panel-grab');
const [x, y] = [screen.width / 2, grab.top + 10];

await touch('touchStart', [[x, y]]);

for (let i = 1; i <= 10; i++) {
  await touch('touchMove', [[x, y + i * 16]]);
  await page.waitForTimeout(30);
}

await touch('touchEnd', []);
await page.waitForTimeout(400);
check((await open()) === '', 'pulled down by its bar, the sheet shuts');

await page.locator('.dock-tab', { hasText: 'Frames' }).tap();
await page.waitForTimeout(700);
check(
  (await page.locator('.grid-panel .panel-grab').isVisible()) &&
    (await page.locator('#inspector').evaluate((panel) => panel.style.translate)) === '',
  'the frames open as a sheet too, and the sheet pulled away opens in its place again',
);

await finish();
