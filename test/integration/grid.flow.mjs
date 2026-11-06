// The animation grid: tabs, a new animation, every frame action, dragging, the keyboard, views
// and play.
import { openStudio } from './harness.mjs';
import {
  frameAction,
  frameLabels,
  openExample,
  selectFrame,
  selectView,
  showAllViews,
} from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const tabs = () => page.locator('.grid-tab').allTextContents();
const frames = () => frameLabels(page);
const tabMenu = async (item) => {
  await page.locator('.tab-more').click();
  await page.getByRole('menuitem', { name: item }).click();
  await page.waitForTimeout(250);
};
await openExample(page);
check(JSON.stringify(await tabs()) === '["Idle"]', 'the example has one animation, Idle');

await page.getByRole('button', { name: 'New animation' }).click();
check(
  (await page.evaluate(() => document.activeElement.id)) === 'new-animation-name',
  'the new animation sheet starts in its name field',
);
await page.getByRole('button', { name: 'Run', exact: true }).click();
await page.selectOption('#new-animation-start', { label: "Every frame as Idle's first frame" });
await page.locator('#new-animation-name').press('Enter');
await page.waitForTimeout(300);
check(
  (await page.evaluate(() => document.activeElement.getAttribute('aria-label'))) ===
    'New animation',
  'and closing it gives focus back to +',
);
check(JSON.stringify(await tabs()) === '["Idle","Run"]', 'a new animation gets its own tab, open');
check(
  JSON.stringify(await frames()) === '["1","2","3","4"]',
  'with four frames, each starting as the pose',
);

await page.locator('.grid-tab[aria-selected="true"]').dblclick();
await page.fill('.tab-rename', 'Sprint');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check((await tabs()).includes('Sprint'), 'a double-click renames the tab');
await page.getByRole('button', { name: 'New animation' }).click();
await page.fill('#new-animation-name', 'Sprint');
await page.getByRole('button', { name: 'Create animation' }).click();
await page.waitForTimeout(300);
check((await tabs()).includes('Sprint 2'), 'a name already taken gets a number');
await page.locator('.grid-tab[aria-selected="true"]').dblclick();
await page.fill('.tab-rename', 'Dash');
await page.getByRole('tab', { name: 'Idle' }).click();
await page.waitForTimeout(300);
check(
  (await tabs()).includes('Dash') &&
    (await page.locator('.grid-tab[aria-selected="true"]').textContent()) === 'Idle',
  'renaming, then clicking another tab, renames and opens that tab',
);
await page.getByRole('tab', { name: 'Dash' }).click();
await tabMenu(/^Delete Dash/);
await page.getByRole('tab', { name: 'Sprint' }).click();
await page.waitForTimeout(200);
await tabMenu('Duplicate');
check((await tabs()).includes('Sprint copy'), 'the tab menu duplicates an animation');
await tabMenu(/^Delete Sprint copy/);
check(!(await tabs()).includes('Sprint copy'), 'and deletes one');

await selectFrame(page, 1);
await frameAction(page, /^Delete frame 2/);
check(
  JSON.stringify(await frames()) === '["1","2","3"]',
  'a frame deleted from its menu goes from every view',
);
await frameAction(page, 'Duplicate frame');
check((await frames()).length === 4, 'Duplicate frame adds one');
await page.locator('.cell-add').click();
await page.waitForTimeout(200);
check(
  JSON.stringify((await frames()).slice(-1)) === '["5 · empty"]',
  '+ adds an empty frame at the end',
);
check(await page.locator('.empty-frame').isVisible(), 'an empty frame says what to do');
await page.locator('.empty-frame').getByRole('button', { name: 'Start from frame 4' }).click();
await page.waitForTimeout(200);
check(JSON.stringify((await frames()).slice(-1)) === '["5"]', 'Start from frame 4 fills it');

await page.locator('.cell-add').click();
await page.waitForTimeout(200);
const strip = page.locator('.grid-row.current .cell');
const from = await strip.nth(5).boundingBox();
const to = await strip.nth(0).boundingBox();
await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
await page.mouse.down();
await page.mouse.move(from.x - 10, from.y + 30, { steps: 4 });
await page.mouse.move(to.x + 4, to.y + 30, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(300);
check((await frames())[0] === '1 · empty', 'dragging the last frame to the front moves it there');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(300);
check((await frames())[5] === '6 · empty', 'undo puts it back');

await selectFrame(page, 5);
await page.locator('.grid-row.current .cell.selected').focus();
await page.keyboard.press('Alt+ArrowLeft');
await page.waitForTimeout(250);
check((await frames())[4] === '5 · empty', 'Alt+← moves the selected frame earlier');
check(
  (await page.locator('.cell.selected').getAttribute('aria-label')).includes('frame 5'),
  'and it stays selected',
);
await page.keyboard.press('Enter');
check(await page.getByRole('menu').isVisible(), 'Enter opens the frame menu');
await page.keyboard.press('Escape');
check(!(await page.getByRole('menu').count()), 'Escape closes it');
await page.locator('.cell.selected').click();
check(await page.getByRole('menu').isVisible(), 'a click on the selected frame opens its menu too');
await page.keyboard.press('Escape');
await page.keyboard.press(',');
await page.waitForTimeout(150);
check(
  (await page.locator('.cell.selected').getAttribute('aria-label')).includes('frame 4'),
  ', steps to the frame before',
);

await showAllViews(page);
check(
  (await page.locator('.grid-row:not(.grid-numbers):not(.mirrored)').count()) === 3,
  'All views shows every drawn view',
);
await page.locator('.grid-add-view').click();
await page.getByRole('menuitem', { name: 'Front side' }).click();
await page.waitForTimeout(250);
check(
  (await page.locator('.grid-view', { hasText: /^Front side$/ }).count()) === 1,
  'Add a view adds a row',
);
await selectView(page, 'Front side');
check((await frames()).length === 6, 'with as many frames as the others');
await page.locator('.grid-row.current .grid-view-more').click();
await page.getByRole('menuitem', { name: /Remove Front side/ }).click();
await page.waitForTimeout(250);
check(
  !(await page.locator('.grid-view', { hasText: /^Front side$/ }).count()),
  'and a view can be removed',
);
await selectView(page, 'Side');
await page.locator('.grid-row.current .grid-view-more').click();
await page.getByRole('menuitem', { name: 'Make Side the view the others match' }).click();
await page.waitForTimeout(250);
check(
  (await page.locator('.grid-row.current .grid-star').count()) === 1,
  'any view can become the reference',
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
const starred = page
  .locator('.grid-row', { has: page.locator('.grid-star') })
  .locator('.grid-view');
check((await starred.textContent()) === 'Front', 'undo gives the reference back to Front');
check(
  !(await page.locator('.grid-view', { hasText: /^Front side$/ }).count()),
  'and undoes nothing else',
);

await page.screenshot({ path: `${shots}/grid.png` });
const before = await page.locator('.canvas-holder canvas').evaluate((canvas) => canvas.toDataURL());
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(500);
check((await page.getByRole('button', { name: 'Pause' }).count()) === 1, 'Play turns into Pause');
check((await page.locator('.grid-number.playing').count()) === 1, 'the frame playing is marked');
// frame 5 is the empty one: once it plays, the canvas must show it
await page
  .waitForFunction(
    () => document.querySelector('.grid-number.playing')?.textContent === '5',
    null,
    { timeout: 5000 },
  )
  .catch(() => null);
const during = await page.locator('.canvas-holder canvas').evaluate((canvas) => canvas.toDataURL());
check(during !== before, 'the canvas plays the animation');
await selectFrame(page, 0);
check(
  (await page.getByRole('button', { name: 'Play' }).count()) === 1,
  'picking a frame stops playing',
);
await page.getByRole('button', { name: 'Onion skin' }).click();
check(
  (await page.getByRole('button', { name: 'Onion skin' }).getAttribute('aria-pressed')) === 'true',
  'onion skin toggles',
);
await page.fill('#fps', '12');
await page.locator('#fps').press('Enter');
await page.locator('#fps').blur();
await page.waitForTimeout(200);
check((await page.inputValue('#fps')) === '12', 'the frame rate is kept');

await finish();
