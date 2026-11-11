// On a phone: the editor fills the screen and only the canvas scrolls, the frames and panels open
// from the dock, a finger swipe scrolls the frames while press-and-hold drags one, and every
// button still works.
import { fingers, openStudio } from './harness.mjs';
import { forgetSavedWork, frameLabels, openDock, openExample } from './studio.mjs';
import { monkey } from './monkey.mjs';

const studio = await openStudio({ device: 'Pixel 7' });
const { page, context, check, shots } = studio;
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
check((await overflow()) <= 0, 'the start screen fits the phone');
await openExample(page);
check((await overflow()) <= 0, 'the editor fits the phone');
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
check(
  (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) <= 0,
  'the editor is as tall as the screen: the page itself never scrolls',
);
const shut = await page.locator('.edit-scroll').boundingBox();
check(shut.height > screen.height * 0.6, 'with every panel shut, the canvas keeps the screen');
await page.screenshot({ path: `${shots}/phone-canvas.png` });
check(!(await page.locator('.grid-panel').isVisible()), 'the frames wait in the dock');
await openDock(page, 'Colours');
check(
  (await page.locator('.section[data-name="colours"]').isVisible()) &&
    !(await page.locator('.section[data-name="layers"]').isVisible()),
  'a dock tab opens its panel alone',
);
await page.screenshot({ path: `${shots}/phone-colours.png` });
await openDock(page, 'Frames');
check(
  (await page.locator('.grid-panel').isVisible()) &&
    !(await page.locator('.section[data-name="colours"]').isVisible()),
  'another tab takes its place',
);
const dock = await page.locator('#dock').boundingBox();
// the dock floats a little above the screen's edge, as a tab bar does
check(
  screen.height - (dock.y + dock.height) < 24 &&
    (await page.locator('.edit-scroll').boundingBox()).height > 150,
  'the dock stays at the foot of the screen, the canvas above the open panel',
);
await page.locator('.cell-add').click();
await page.locator('.cell-add').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/phone.png` });
await page.getByRole('button', { name: 'Download' }).click();
const menu = await page.locator('.menu').boundingBox();
check(
  menu.x >= 0 && menu.x + menu.width <= (await page.evaluate(() => innerWidth)),
  'the download menu stays on the screen',
);
await page.keyboard.press('Escape');
check(
  (await page.locator('#toolbar [aria-label^="Workspace"]').count()) === 0,
  'the bar has no workspace to go to: the editor is the whole studio',
);
check(
  (await page.locator('.grid-row.current .cell').count()) === 3,
  'the frames added stand in their row',
);
const stage = await page.locator('.edit-scroll').boundingBox();
check(stage.height > 150, 'the canvas keeps room above the frames');

const touch = await fingers(context, page);
const drag = async (from, to, hold) => {
  const start = await page.locator('.grid-row.current .cell').nth(from).boundingBox();
  const end = await page.locator('.grid-row.current .cell').nth(to).boundingBox();
  const [x, y] = [start.x + start.width / 2, start.y + start.height / 2];

  await touch('touchStart', [[x, y]]);
  await page.waitForTimeout(hold);

  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', [[x + ((end.x + end.width - 4 - x) * i) / 8, y]]);
  }

  await touch('touchEnd', []);
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

for (const name of ['Walk', 'Run', 'Jump', 'Attack', 'Hurt']) {
  await page.getByRole('button', { name: 'New animation' }).click();
  await page.fill('#new-animation-name', name);
  await page.getByRole('button', { name: 'Create animation' }).click();
  await page.waitForTimeout(250);
}

const inSight = (selector) =>
  page.locator(selector).evaluate((element) => {
    const box = element.getBoundingClientRect();
    const strip = element.closest('.grid-tabs')?.getBoundingClientRect() ?? {
      left: 0,
      right: innerWidth,
    };

    return box.left >= strip.left - 1 && box.right <= Math.min(strip.right, innerWidth) + 1;
  });
check(await inSight('.grid-tab[aria-selected="true"]'), 'with many tabs, the open one is in sight');
check((await inSight('.tab-more')) && (await inSight('.grid-tab-add')), 'and so are its ⋯ and +');

await page.locator('button.wordmark').click();
await page.waitForSelector('.project-row');
await page.getByRole('button', { name: 'New folder', exact: true }).click();
await page.locator('.folder-name-field').fill('Naga Eleven');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const places = await page
  .locator('.folder-list .place')
  .evaluateAll((all) => all.map((place) => Math.round(place.getBoundingClientRect().top)));
const sheet = await page.locator('.sheet').boundingBox();
check(
  (await overflow()) <= 0 &&
    sheet.x >= 0 &&
    sheet.x + sheet.width <= (await page.evaluate(() => innerWidth)) &&
    new Set(places).size === 1,
  'Projects fits the phone, its folders one row above the projects',
);
await page.screenshot({ path: `${shots}/phone-projects.png` });
await page.keyboard.press('Escape');

await forgetSavedWork(page, studio.url);
await monkey(studio);
check((await overflow()) <= 0, 'and still fits after every button');
await studio.finish();
