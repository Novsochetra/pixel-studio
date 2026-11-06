// On a phone: nothing scrolls sideways, the frames stay usable, a finger swipe scrolls the frames
// while press-and-hold drags one, and every button still works.
import { openStudio } from './harness.mjs';
import { frameLabels, openExample } from './studio.mjs';
import { monkey } from './monkey.mjs';

const studio = await openStudio({ device: 'Pixel 7' });
const { page, context, check, shots } = studio;
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check((await overflow()) <= 0, 'the start screen fits the phone');
await openExample(page);
check((await overflow()) <= 0, 'the editor fits the phone');
await page.locator('.cell-add').click();
await page.locator('.cell-add').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/phone.png` });
const stage = await page.locator('.edit-scroll').boundingBox();
check(stage.height > 150, 'the canvas keeps room above the frames');

const cdp = await context.newCDPSession(page);
const touch = (type, x, y) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
  });
const drag = async (from, to, hold) => {
  const start = await page.locator('.grid-row.current .cell').nth(from).boundingBox();
  const end = await page.locator('.grid-row.current .cell').nth(to).boundingBox();
  const y = start.y + start.height / 2;
  await touch('touchStart', start.x + start.width / 2, y);
  await page.waitForTimeout(hold);

  for (let i = 1; i <= 8; i++) {
    await touch(
      'touchMove',
      start.x + start.width / 2 + ((end.x + end.width - 4 - start.x - start.width / 2) * i) / 8,
      y,
    );
  }

  await touch('touchEnd');
  await page.waitForTimeout(300);
};
await drag(0, 2, 60);
check(
  JSON.stringify(await frameLabels(page)) === '["1","2 · empty","3 · empty"]',
  'a quick swipe over the frames moves none',
);
await drag(0, 2, 450);
check(
  JSON.stringify(await frameLabels(page)) === '["1 · empty","2 · empty","3"]',
  'press, hold and drag moves a frame',
);

await page.goto(studio.url);
await page.waitForTimeout(800);
await page.evaluate(() => indexedDB.deleteDatabase('pixel-clean-studio'));
await page.reload();
await page.waitForSelector('.start-screen');
await monkey(studio);
check((await overflow()) <= 0, 'and still fits after every button');
await studio.finish();
