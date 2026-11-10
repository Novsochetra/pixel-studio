// The arcade's sheet on a phone: a window rides up from the bottom edge, and is pulled down by
// its bar to close it.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);
const cdp = await context.newCDPSession(page);
const touch = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y], id) => ({ x, y, id })),
  });
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
await finish();
