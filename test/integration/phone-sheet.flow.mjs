// A phone held upright has one bar at its foot, the tools', with two round buttons beside it:
// the colour in hand, and the panels. A panel is a sheet that rises over the screen's foot; the
// row at its top picks another panel, and it is pulled down by its bar or shut by its ×.
import { fingers, openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);
const touch = await fingers(context, page);
const box = (selector) =>
  page.locator(selector).evaluate((element) => {
    const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
    const { borderRadius } = getComputedStyle(element);

    return { left, right, top, bottom, width, height, radius: parseFloat(borderRadius) };
  });
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const open = () => page.locator('.app').getAttribute('data-panel');
const picked = () => page.locator('.panel-tabs button[aria-pressed="true"]:visible').textContent();
const tools = await box('#rail');
const panels = await box('.dock-more');
const colour = await box('.dock-tab[data-panel="colours"]');

check(
  tools.radius >= tools.height / 2 && Math.abs(tools.bottom - panels.bottom) < 3,
  'the tools are one bar with round ends at the screen’s foot',
);
check(
  panels.left > tools.right &&
    colour.left > tools.right &&
    Math.abs(panels.width - panels.height) < 1 &&
    (await page.locator('.dock-tab:visible').count()) === 1,
  'beside it, one round button for the colour and one for the panels: no second bar of tabs',
);
await page.screenshot({ path: `${shots}/phone-bar.png` });

await page.locator('.dock-more').tap();
await page.waitForTimeout(700);
const sheet = await box('.grid-panel');
const art = await box('[aria-label="Pixel canvas"]');

check(
  (await open()) === 'frames' && sheet.radius > 20 && (await picked()) === 'Frames',
  'the panels button opens a sheet with round corners, its row naming the panel',
);
check(art.bottom <= sheet.top + 1, 'and the canvas is whole above it');

await page.locator('.panel-tabs button:visible', { hasText: 'Layers' }).tap();
await page.waitForTimeout(500);
check(
  (await open()) === 'layers' && (await page.locator('.section[data-name="layers"]').isVisible()),
  'the row at the sheet’s top picks another panel',
);
await page.screenshot({ path: `${shots}/phone-sheet.png` });

await page.getByRole('button', { name: 'Close this panel' }).tap();
await page.waitForTimeout(300);
check((await open()) === '', 'its × shuts it');

await page.locator('.dock-more').tap();
await page.waitForTimeout(700);
check((await open()) === 'layers', 'the panels button opens the panel used last');
const grab = await box('#inspector .panel-grab');
const [x, y] = [screen.width - 70, grab.top + 6];

await touch('touchStart', [[x, y]]);

for (let i = 1; i <= 10; i++) {
  await touch('touchMove', [[x, y + i * 16]]);
  await page.waitForTimeout(30);
}

await touch('touchEnd', []);
await page.waitForTimeout(400);
check((await open()) === '', 'pulled down by its bar, the sheet shuts');

await page.locator('.dock-tab[data-panel="colours"]').tap();
await page.waitForTimeout(700);
check(
  (await open()) === 'colours' &&
    (await page.locator('#inspector').evaluate((panel) => panel.style.translate)) === '',
  'the colour’s button opens Colours, the sheet in its place again',
);

await finish();
