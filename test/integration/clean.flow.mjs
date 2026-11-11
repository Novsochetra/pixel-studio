// Cleaning AI images: into a view, into a later frame at its own size, onto the art layer even
// with a picture to trace chosen, several at once, and placed as each kind of project stands.
import { openStudio } from './harness.mjs';
import {
  chooseFiles,
  cleanReport,
  createProject,
  dropImage,
  frameLabels,
  imageFile,
  openExample,
  selectFrame,
  selectView,
} from './studio.mjs';

const { page, check, finish, images, shots } = await openStudio();
const side = `${images}/side.webp`;
const back = `${images}/back2.webp`;
// the status bar's sprite part: "sprite 47×98, rows 31–128"
const spriteText = () => page.locator('#statusbar span').nth(2).textContent();
const rows = async () =>
  (await spriteText())
    .match(/rows (\d+)–(\d+)/)
    ?.slice(1)
    .map(Number);
await openExample(page);

await selectView(page, 'Back');
await dropImage(page, back, 'back.webp');
const backReport = await cleanReport(page);
check(
  backReport.startsWith('Grid: one art pixel'),
  'a dropped image is cleaned, the grid it found reported',
);
check(
  /match the front's|front's scale/.test(backReport),
  "the back is sized to the front's height",
);
await page.screenshot({ path: `${shots}/clean.png` });
await page.getByRole('button', { name: 'Use for Back' }).click();
check((await rows())?.[1] === 128, "and stands with its feet on the front's row");

await selectView(page, 'Side');
await page.locator('.cell-add').click();
await page.waitForTimeout(200);
await chooseFiles(
  page,
  () =>
    page
      .locator('.empty-frame')
      .getByRole('button', { name: /Image into this frame/ })
      .click(),
  [imageFile(side, 'side.webp')],
);
const frameReport = await cleanReport(page);
check(
  (await page.getByRole('button', { name: 'Use for Side, frame 2' }).count()) === 1,
  'the dialog names the frame it fills',
);
check(
  (await page.inputValue('#import-size')) === 'keep',
  'a later frame keeps its own pixel size by default',
);
check(/own pixel size|not resized/.test(frameReport), 'and the report says so');
await page.selectOption('#import-size', 'match');
await page.getByRole('button', { name: 'Clean again' }).click();
await page.waitForTimeout(400);
check(
  /match the front's|front's scale/.test(await cleanReport(page)),
  "matching the reference's height is one choice away",
);
await page.getByRole('button', { name: 'Use for Side, frame 2' }).click();
check(
  JSON.stringify(await frameLabels(page)) === '["1","2"]',
  'the image fills frame 2, frame 1 keeps its art',
);

await chooseFiles(
  page,
  () => page.getByRole('button', { name: /^Add a picture to trace/ }).click(),
  [imageFile(back, 'trace.webp')],
);
await page.waitForTimeout(600);
await page.locator('.layer-row', { hasText: 'Trace' }).click();
check(
  (await page.getByLabel('How strongly the picture shows').count()) === 1,
  'a picture to trace joins the layers, marked, with how strongly it shows',
);
// an image dropped on a frame in the grid went into the view being edited, whichever it was
await selectView(page, 'Front');
await dropImage(page, side, 'side.webp', '.grid-row[data-direction="east"] .cell');
await page.waitForTimeout(300);
check(
  (await page.getByRole('button', { name: /^Use for Side/ }).count()) === 1,
  'an image dropped on a frame of another view is cleaned into that view',
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.locator('.cell-add').click();
await page.waitForTimeout(200);
await dropImage(page, side, 'side.webp');
await cleanReport(page);
await page.getByRole('button', { name: /^Use for Side/ }).click();
check(
  (await frameLabels(page))[2] === '3',
  'with a picture to trace chosen, the art still lands on the art layer',
);

await selectFrame(page, 0);
await chooseFiles(
  page,
  () => page.getByRole('button', { name: 'Clean several images into frames' }).click(),
  [
    imageFile(side, 'run-side-10.webp'),
    imageFile(side, 'run-side-2.webp'),
    imageFile(back, 'run-back-1.webp'),
  ],
);
await page.waitForTimeout(500);
const placed = await page
  .locator('.batch-row')
  .evaluateAll((all) =>
    all.map(
      (row) =>
        `${row.querySelector('.view-name').textContent}:${row.querySelectorAll('select')[1].value}`,
    ),
  );
check(
  JSON.stringify(placed) === '["run-back-1.webp:0","run-side-2.webp:0","run-side-10.webp:1"]',
  'several images fill frames in the order of their names',
);
await page.waitForFunction(
  () =>
    !document.querySelector('.batch-row .hint')?.textContent.includes('Cleaning') &&
    !document.querySelector('.batch-row .hint')?.textContent.includes('Waiting'),
  null,
  { timeout: 60000 },
);
await page.waitForFunction(() => !document.querySelector('.sheet .btn.primary').disabled, null, {
  timeout: 60000,
});
await page.getByRole('button', { name: 'Use them all' }).click();
await page.waitForTimeout(300);
check(!(await page.locator('.sheet').count()), 'and are placed together');

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Tiles', name: 'Stone' });
await dropImage(page, side, 'stone.webp');
check(
  (await cleanReport(page)).includes('Scaled to fill the tile'),
  'a tile is scaled to fill its canvas',
);
await page.getByRole('button', { name: 'Use for Tile' }).click();
check((await spriteText()) === 'sprite 16×16, rows 0–15', 'edge to edge');

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Effect', name: 'Burst' });
await dropImage(page, back, 'burst.webp');
await cleanReport(page);
await page.getByRole('button', { name: 'Use for Effect' }).click();
const [top, bottom] = await rows();
check(Math.abs(top - (47 - bottom)) <= 1, 'an effect is centred on its canvas');

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Object', name: 'Chest' });
await dropImage(page, back, 'chest.webp');
await cleanReport(page);
await page.getByRole('button', { name: 'Use for Object' }).click();
await page.getByRole('button', { name: 'Outfits…' }).click();
check(
  await page.getByRole('button', { name: 'Wear it (every frame and view)' }).isDisabled(),
  'a new project has no parts yet, so nothing can be worn',
);
await page.getByRole('button', { name: "Make parts from the art's colours" }).click();
check(
  (await page.locator('.part-row').count()) > 1,
  'one click makes a part of each colour family',
);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Swap colours…' }).click();
await page.getByRole('button', { name: 'Ice', exact: true }).click();
check(
  (await page.locator('#swap-palette option:checked').textContent()) === 'Ice (8)',
  'a starter palette is one click away in Swap colours',
);
await page.keyboard.press('Escape');

// A picture too large for the canvas was made smaller without a word, and its detail went with
// it. The window says so, and offers the canvas the art keeps its own pixels on.
await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Character', name: 'Tall', width: 32 });
await dropImage(page, `${images}/front.png`, 'tall.png');
check(
  (await cleanReport(page)).includes('to fit the canvas'),
  'a picture larger than its canvas is made smaller to fit',
);
const offer = page.locator('#import-grow');
const offered = (await offer.textContent().catch(() => '')).match(/(\d+)×(\d+)/);

check(Boolean(offered), 'and the window offers the canvas it would keep its size on');
await page.screenshot({ path: `${shots}/clean-smaller.png` });
await offer.click();
await page
  .waitForFunction(
    () => document.querySelector('pre.report')?.textContent.includes('pixel size'),
    null,
    { timeout: 25000 },
  )
  .catch(() => null);
check(
  (await cleanReport(page)).includes('Kept its own colours and pixel size'),
  'cleaned again on that canvas, the art keeps every pixel',
);
check((await offer.count()) === 0, 'and nothing more is offered');
await page.getByRole('button', { name: 'Use for Front' }).click();
check(
  (await page.locator('#statusbar').textContent()).includes(
    `${offered?.[1]}×${offered?.[2]} canvas`,
  ),
  'the canvas is the size that was offered',
);
await page.keyboard.press('ControlOrMeta+z');
await page.keyboard.press('ControlOrMeta+z');
check(
  (await page.locator('#statusbar').textContent()).includes('32×32 canvas'),
  'undo puts the canvas back as it was',
);

await finish();
