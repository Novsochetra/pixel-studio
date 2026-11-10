// The arcade's sheet on a phone: a window rides up from the bottom edge, and is pulled down by
// its bar to close it.
import { fingers, openStudio } from './harness.mjs';
import { openDock, openExample, openWorkspace } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);
const touch = await fingers(context, page);
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const openSheet = async () => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: /Canvas size/ }).click();
  await page.waitForTimeout(700);
};
// a finger on the window's bar, drawn down by so many pixels over a third of a second
const pullDown = async (distance) => {
  const head = await page.locator('.sheet-head').boundingBox();
  const [x, y] = [head.x + head.width / 3, head.y + 14];

  await touch('touchStart', [[x, y]]);

  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [[x, y + (distance * i) / 10]]);
    await page.waitForTimeout(30);
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(150);
};

await openSheet();
const sheet = await page.locator('.sheet').boundingBox();
check(
  sheet.width === screen.width && Math.abs(sheet.y + sheet.height - screen.height) < 1,
  'a window stands on the bottom edge, as wide as the screen',
);
const grabber = await page.evaluate(() => {
  const mark = getComputedStyle(document.querySelector('.sheet-head'), '::before');

  return { width: mark.width, height: mark.height };
});
check(grabber.width === '36px' && grabber.height === '5px', 'with the grabber on its bar');
await page.screenshot({ path: `${shots}/look-phone-sheet.png` });

await pullDown(40);
await page.waitForTimeout(400);
const settled = await page.locator('.sheet').boundingBox();
check(
  (await page.locator('.sheet').count()) === 1 && Math.abs(settled.y - sheet.y) < 1,
  'pulled down a little and let go, it springs back',
);

await pullDown(sheet.height * 0.6);
check((await page.locator('.sheet').count()) === 0, 'pulled down far, it closes');
await page.waitForTimeout(700);
check(
  (await page.locator('.sheet-out, .sheet-backdrop-out').count()) === 0,
  'and is taken away once it has slid off',
);

await openSheet();
await page.locator('.sheet-close').tap();
check((await page.locator('.sheet').count()) === 0, 'its × still closes it with a tap');

// the bar keeps one row and the workspace's name whole, down to the narrowest phone
await openWorkspace(page, 'Views board');
const picked = () =>
  page.locator('.workspace-pick span').evaluate((name) => ({
    text: name.textContent,
    whole: name.scrollWidth <= name.clientWidth,
  }));
check(
  (await picked()).text === 'Board' && (await picked()).whole,
  'the workspace is named in one word, whole',
);
await page.setViewportSize({ width: 320, height: 640 });
await page.waitForTimeout(300);
check(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'on a 320 px phone the bar still fits the screen',
);
check((await picked()).whole, 'and the workspace keeps its name whole');

// every view plays in the room above the frames, cut to the art, with nothing to scroll to
await page.setViewportSize({ width: 412, height: 839 });
await openWorkspace(page, 'Edit');
await openDock(page, 'Frames');
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(400);
const spill = await page.locator('.edit-scroll').evaluate((area) => ({
  across: area.scrollWidth - area.clientWidth,
  down: area.scrollHeight - area.clientHeight,
}));
check(spill.across <= 0 && spill.down <= 0, 'all views play within the screen, none off its edge');
await page.screenshot({ path: `${shots}/look-phone-play.png` });
await page.getByRole('button', { name: 'Pause' }).click();

// a frame's menu opens on its own side of the frame: it never lies over the frame it is for
await page.locator('.cell.selected').click();
const menu = await page.locator('.menu').boundingBox();
const frame = await page.locator('.cell.selected').boundingBox();
const bar = await page.locator('#toolbar').boundingBox();
check(
  menu.y + menu.height <= frame.y && menu.y >= bar.y + bar.height,
  'a tall menu stays between the bar at the top and the frame it opened from',
);
await page.keyboard.press('Escape');

// the studio's own slider, the same in every browser, tinted up to its knob
await openDock(page, 'Brush');
const size = await page.locator('#brush-size').evaluate((field) => ({
  look: getComputedStyle(field).appearance,
  filled: field.style.getPropertyValue('--filled'),
}));
check(size.look === 'none' && size.filled === '0%', 'a slider is drawn the studio’s way');
await page.locator('#brush-size').evaluate((field) => {
  field.value = field.max;
  field.dispatchEvent(new window.Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
check(
  (await page
    .locator('#brush-size')
    .evaluate((field) => field.style.getPropertyValue('--filled'))) === '100%',
  'and its track is tinted up to the knob',
);
await openDock(page, 'Brush');

// a scene zoomed past the screen scrolls; its controls stay where they can be reached
await openWorkspace(page, 'On the pitch');
await page.getByRole('button', { name: '3×' }).tap();
await page.waitForTimeout(400);
const play = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
const zooms = await page.getByRole('group', { name: 'Zoom' }).boundingBox();
const wide = await page.evaluate(() => innerWidth);
check(
  play.x >= 0 && play.x + play.width <= wide && zooms.x >= 0 && zooms.x + zooms.width <= wide,
  'zoomed to 3×, the preview’s controls are still on the screen',
);
await page.screenshot({ path: `${shots}/look-phone-pitch.png` });
await page.getByRole('button', { name: '1×' }).tap();

// a message is as wide as its words, not half the screen
await openWorkspace(page, 'Edit');
await page.locator('#rail [aria-label^="Select and move"]').evaluate((button) => button.click());
const said = await page.locator('.toast').boundingBox();
check(said.width > 200 && said.height < 80, 'a message spreads across the screen');
await finish();
