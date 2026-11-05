// On a phone: a quick swipe over the frames scrolls them, a press-and-hold then drag moves one.
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('pixel-clean-quick-start', '1'); localStorage.setItem('pixel-clean-folded', '[]'); });
await page.goto(process.argv[2]); await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'New frame' }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'New frame' }).click(); await page.waitForTimeout(300);
await page.locator('.frames .frame').nth(0).scrollIntoViewIfNeeded();
const labels = () => page.locator('.frames .frame span').allTextContents();

const cdp = await context.newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const drag = async (fromIndex, toIndex, hold) => {
  const from = await page.locator('.frames .frame').nth(fromIndex).boundingBox();
  const to = await page.locator('.frames .frame').nth(toIndex).boundingBox();
  const y = from.y + from.height / 2;
  await touch('touchStart', from.x + from.width / 2, y);
  await page.waitForTimeout(hold);
  for (let i = 1; i <= 8; i++) await touch('touchMove', from.x + from.width / 2 + ((to.x + to.width - 4 - from.x - from.width / 2) * i) / 8, y);
  await touch('touchEnd');
  await page.waitForTimeout(300);
};
await drag(0, 2, 60);
const swiped = JSON.stringify(await labels());
await drag(0, 2, 450);
const held = JSON.stringify(await labels());
if (swiped !== '["1","2 · empty","3 · empty"]') errors.push(`a swipe moved a frame: ${swiped}`);
if (held !== '["1 · empty","2 · empty","3"]') errors.push(`hold and drag did not move the frame: ${held}`);
console.log('errors', errors);
await browser.close();
