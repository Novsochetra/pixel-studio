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
// the frames and the other panels are two sheets: risen again at each change, the sheet blinked
check(
  (await page.locator('.app').getAttribute('data-rises')) === 'false',
  'and the sheet stays up as the panel changes: it rises only when it opens',
);
await page.screenshot({ path: `${shots}/phone-sheet.png` });

await page.getByRole('button', { name: 'Close this panel' }).tap();
await page.waitForTimeout(300);
check((await open()) === '', 'its × shuts it');

await page.locator('.dock-more').tap();
await page.waitForTimeout(700);
check((await open()) === 'layers', 'the panels button opens the panel used last');
// from the row of names, where a thumb takes hold: only the grabber's own strip took the pull
const pullBy = async (distance) => {
  const row = await box('#inspector .panel-tabs');
  const [x, y] = [row.left + 30, row.top + row.height / 2];

  await touch('touchStart', [[x, y]]);

  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [[x, y + (distance * i) / 10]]);
    await page.waitForTimeout(30);
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(400);
};
const height = async () => (await box('#inspector')).height;
const usual = await height();

await pullBy(-120);
check(
  (await height()) > usual + 100 && (await open()) === 'layers',
  'pulled up by its top, the sheet is taller, for a long list',
);
check(
  (await box('.layer-row')).height < 60,
  'and its rows keep their own height: one layer’s row was stretched down the tall sheet',
);
await pullBy(120);
check(
  Math.abs((await height()) - usual) < 2 && (await open()) === 'layers',
  'pulled down, a tall sheet is its own height again',
);
await pullBy(120);
check((await open()) === '', 'and pulled down once more, it shuts');

// the bar shows five tools as bare pictures: the far ones were a blind swipe away
await page.getByRole('button', { name: 'All tools' }).tap();
await page.waitForTimeout(600);
const named = await page.locator('.tool-tile').allTextContents();

check(
  (await open()) === 'tools' && named.includes('Lasso') && named.includes('Pencil'),
  'All tools, at the end of the bar, shows every tool with its name',
);
await page.locator('.tool-tile', { hasText: 'Lasso' }).tap();
await page.waitForTimeout(400);
check(
  (await open()) === '' &&
    (
      await page.locator('#rail [aria-pressed="true"]').first().getAttribute('aria-label')
    ).startsWith('Lasso'),
  'a tool picked there is in hand, the sheet out of the canvas’s way',
);

await page.locator('.dock-tab[data-panel="colours"]').tap();
await page.waitForTimeout(700);
check(
  (await open()) === 'colours' &&
    (await page.locator('#inspector').evaluate((panel) => panel.style.translate)) === '',
  'the colour’s button opens Colours, the sheet in its place again',
);

// Move's bar over the canvas is one field. As a bar across the screen it lay over a canvas
// already made small by a sheet.
await page.getByRole('button', { name: 'Close this panel' }).tap();
await page.locator('.rail-all').tap();
await page.waitForTimeout(500);
await page.locator('.tool-tile', { hasText: /^Move$/ }).tap();
await page.waitForTimeout(500);
const turn = await box('.layer-turn-bar');

check(
  turn.width < tools.width / 2 &&
    (await page.locator('.layer-turn-bar').textContent()).includes('Turn'),
  'the bar that turns layers is a small pill that says what it is for',
);
await page.screenshot({ path: `${shots}/phone-turn-bar.png` });
await page.locator('.dock-more').tap();
await page.waitForTimeout(600);
check(
  await page.locator('.layer-turn-bar').isHidden(),
  'and it steps aside while a sheet is up, as the handle on the art turns them too',
);

// A message showed at the canvas's top: with a sheet up that was over the little of the art
// still in sight.
await page.locator('.panel-tabs button:visible', { hasText: 'Layers' }).tap();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'New layer' }).tap();
await page.waitForTimeout(300);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.getByRole('button', { name: /^Delete Layer/ }).tap();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Undo', exact: true }).tap();
await page.waitForTimeout(300);
const said = await box('.toast');
const artFoot = (await box('.canvas-holder canvas')).bottom;
const sheetTop = (await box('#inspector')).top;

check(
  said.top >= artFoot - 12 && said.top < sheetTop,
  `with a sheet up a message shows at the sheet’s top, not over the art (${Math.round(said.top)} under ${Math.round(artFoot)})`,
);
await page.screenshot({ path: `${shots}/phone-sheet-toast.png` });

// A selection's bar lay over the canvas's first or last rows, a fifth of the art a sheet had
// left in sight. The room under the canvas is kept for it.
await page.setViewportSize({ width: 390, height: 664 });
await page.waitForTimeout(500);
await page.keyboard.press('s');
const drawn = await box('.canvas-holder canvas');
const across = (share) => drawn.left + drawn.width * share;
const down = (share) => drawn.top + drawn.height * share;

await touch('touchStart', [[across(0.2), down(0.2)]]);

for (let i = 1; i <= 8; i++) {
  await touch('touchMove', [[across(0.2 + 0.07 * i), down(0.2 + 0.07 * i)]]);
  await page.waitForTimeout(20);
}

await touch('touchEnd', []);
await page.waitForTimeout(500);
const bar = await box('.selection-bar');
const under = await box('.canvas-holder canvas');

check(
  bar.top >= under.bottom - 2 && bar.bottom <= (await box('#inspector')).top + 1,
  `with a sheet up the selection’s bar stands under the canvas, not over it (${Math.round(bar.top)} under ${Math.round(under.bottom)})`,
);
await page.screenshot({ path: `${shots}/phone-sheet-selection.png` });

await finish();
