// The frames on the smallest phone, and what a walk through an animation there met: a frame in
// sight whole, the tall sheet's strip of canvas, the open tab, a hidden frame's mark.
import { fingers, openStudio } from './harness.mjs';
import { createProject, frameAction, paintedPixels, selectFrame } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'iPhone SE' });
const touch = await fingers(context, page);
const box = (selector) => page.locator(selector).first().boundingBox();
const canvas = page.getByLabel('Pixel canvas');
const painted = async () => (await paintedPixels(canvas, 32)).length;

await createProject(page, { kind: 'Character', name: 'Tiny', width: 32 });
await page.locator('.dock-more').click();
await page.waitForTimeout(600);

const cell = await box('.grid-row.current .cell');
const bar = await box('#rail');

check(
  cell.y + cell.height <= bar.y,
  `on the smallest phone a frame is in sight whole above the tools (${Math.round(cell.y + cell.height)} of ${Math.round(bar.y)})`,
);
await page.screenshot({ path: `${shots}/phone-frames-small.png` });

// two things to do with an empty frame: both buttons are on the screen
await page.locator('.grid-row.current .cell-add').click();
await page.waitForTimeout(300);
await selectFrame(page, 0);
const stage = await canvas.boundingBox();

await page.mouse.click(stage.x + stage.width / 2, stage.y + stage.height / 2);
await page.waitForTimeout(300);

// the frames' sheet takes none of the canvas's room: a selection's bar stands under the art
await page.keyboard.press('s');
await touch('touchStart', [[stage.x + stage.width * 0.3, stage.y + stage.height * 0.3]]);
await touch('touchMove', [[stage.x + stage.width * 0.5, stage.y + stage.height * 0.5]]);
await touch('touchMove', [[stage.x + stage.width * 0.7, stage.y + stage.height * 0.7]]);
await touch('touchEnd', []);
await page.waitForTimeout(500);
const selection = await box('.selection-bar');
const art = await canvas.boundingBox();

check(
  selection.y >= art.y + art.height - 2,
  `with the frames up, a selection’s bar is under the canvas, not over its foot (${Math.round(selection.y)} under ${Math.round(art.y + art.height)})`,
);
await page.locator('.selection-bar').getByRole('button', { name: 'Done' }).tap();
await page.keyboard.press('b');
await page.waitForTimeout(1500);
await selectFrame(page, 1);
await page.waitForTimeout(300);
const image = await page
  .locator('.empty-frame')
  .getByRole('button', { name: 'Image into this frame…' })
  .boundingBox();

check(
  image.x >= 0 && image.x + image.width <= 320,
  'an empty frame’s two buttons are both on a narrow screen',
);

// hidden from play, a frame's mark under a finger is no button: a tap on it picks the frame
await selectFrame(page, 0);
await frameAction(page, 'Hide from play');
await page.waitForTimeout(200);
await selectFrame(page, 1);
check(
  (await page
    .locator('.cell-hidden')
    .first()
    .evaluate((mark) => getComputedStyle(mark).pointerEvents)) === 'none',
  'under a finger the hidden frame’s mark takes no tap',
);

await selectFrame(page, 0);
await frameAction(page, 'Show in play');

// pulled tall, the sheet leaves a strip of canvas: it takes no stroke, and Play lowers the sheet
const before = await painted();
const grab = await box('.grid-panel .panel-grab');
const [x, y] = [grab.x + grab.width / 2, grab.y + grab.height / 2];

await touch('touchStart', [[x, y]]);
await touch('touchMove', [[x, y - 60]]);
await touch('touchMove', [[x, y - 120]]);
await touch('touchEnd', []);
await page.waitForTimeout(600);
check(
  (await page.locator('.app').getAttribute('data-sheet')) === 'tall',
  'the sheet is pulled tall',
);
check(
  (await page.locator('.edit-scroll').evaluate((el) => getComputedStyle(el).pointerEvents)) ===
    'none',
  'the strip of canvas above a tall sheet takes no stroke',
);
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForTimeout(600);
check(
  (await page.locator('.app').getAttribute('data-sheet')) !== 'tall',
  'Play brings a tall sheet back to its height, so the play is seen',
);
await page.getByRole('button', { name: 'Pause', exact: true }).click();
check((await painted()) === before, 'and nothing was drawn meanwhile');

await finish();
