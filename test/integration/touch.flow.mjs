// Drawing with fingers on a phone: a stroke lands where the finger goes, a tap acts once, and two
// fingers pan and pinch without the tool in hand touching the art.
import { fingers, openStudio } from './harness.mjs';
import { createProject, openDock } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const touch = await fingers(context, page);
const box = () => canvas.boundingBox();
const zoom = async () => (await box()).width / 32;
// the middle of an art pixel, on the screen
const at = async (x, y) => {
  const art = await box();
  const scale = art.width / 32;

  return [art.x + (x + 0.5) * scale, art.y + (y + 0.5) * scale];
};
const stroke = async (from, to) => {
  const [startX, startY] = await at(...from);
  const [endX, endY] = await at(...to);

  await touch('touchStart', [[startX, startY]]);

  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [
      [startX + ((endX - startX) * i) / 10, startY + ((endY - startY) * i) / 10],
    ]);
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(250);
};
const tap = async (x, y) => {
  const point = await at(x, y);

  await touch('touchStart', [point]);
  await touch('touchEnd', []);
  await page.waitForTimeout(250);
};
const pinch = async (spread) => {
  const art = await box();
  const middle = [art.x + art.width / 2, art.y + art.height / 2];
  const apart = (gap) => [
    [middle[0] - gap, middle[1]],
    [middle[0] + gap, middle[1]],
  ];

  await touch('touchStart', [apart(40)[0]]);
  await touch('touchStart', apart(40));

  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', apart(40 + (spread * i) / 8));
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(300);
};
// art pixels that are not clear, as "x,y", read from the middle of each
const painted = () =>
  canvas.evaluate((element) => {
    const scale = element.width / 32;
    const pen = element.getContext('2d');
    const found = [];

    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const [red, green, blue] = pen.getImageData(
          Math.floor((x + 0.5) * scale),
          Math.floor((y + 0.5) * scale),
          1,
          1,
        ).data;

        // the checkerboard behind clear pixels is grey: red, green and blue nearly the same
        if (Math.abs(red - green) > 40 || Math.abs(green - blue) > 40) {
          found.push(`${x},${y}`);
        }
      }
    }

    return found;
  });
const tool = (name) => page.locator('#rail').getByRole('button', { name }).click();

const empty = await box();
const stage = await page.locator('.edit-scroll').boundingBox();
check(
  (await page.locator('.empty-frame').isVisible()) &&
    empty.y >= stage.y &&
    empty.y + empty.height <= stage.y + stage.height,
  'an empty frame says so without pushing the canvas off the screen',
);

// the card went at the first pixel and the canvas jumped up under the finger, bending the stroke
await stroke([2, 2], [12, 12]);
const first = await painted();
check(
  first.length === 11 && first.every((point) => point.split(',')[0] === point.split(',')[1]),
  'the first stroke on an empty frame goes where the finger went',
);
const after = await box();
check(Math.abs(after.y - empty.y) < 1, 'and the canvas stays where it was');
await page.screenshot({ path: `${shots}/touch-stroke.png` });

await tool('Fill');
await page.waitForTimeout(100);
await pinch(60);
check((await painted()).length === 11, 'two fingers with Fill in hand fill nothing');
check((await zoom()) > after.width / 32, 'they zoom the canvas in');
await pinch(-30);
await page.getByRole('button', { name: 'More', exact: true }).click();
await page.getByRole('menuitem', { name: 'Fit the canvas' }).click();
await page.waitForTimeout(200);
check(Math.abs((await zoom()) - after.width / 32) < 0.01, 'Fit the canvas brings it back');
await tap(20, 5);
check((await painted()).length > 500, 'a tap with Fill fills');
await page.getByRole('button', { name: 'Undo' }).click();
await page.waitForTimeout(200);
check((await painted()).length === 11, 'and Undo, in the bar, takes it back');

await tool(/^Rectangle/);
check(
  (await page.locator('.toast').textContent()).startsWith('Rectangle'),
  'picking a tool says what it does, as a finger cannot hover',
);
await stroke([16, 16], [25, 22]);
check((await painted()).length === 11 + 30, 'a finger drags a rectangle out');

await openDock(page, 'Colours');
check(
  (await page.getByRole('group', { name: 'Basic colours' }).getByRole('button').count()) >= 16 &&
    (await page.locator('#colour-pick').isVisible()),
  'the Colours panel has basic colours and the picker',
);
await page.screenshot({ path: `${shots}/touch-colours.png` });
// the panel shut again, so the whole canvas is in reach
await page.locator('.dock-tab', { hasText: 'Colours' }).tap();
await page.waitForTimeout(300);

// with no keyboard there was no way to paste at all; pasting then dragging moved the original
await tool(/^Select and move/);
await stroke([1, 1], [13, 13]);
// tapped the moment the finger is off the canvas: Chromium took a finger lifted while moving for
// a fling and swallowed the tap that followed, so Copy did nothing until tapped again
await page.locator('.selection-bar').getByRole('button', { name: 'Copy' }).tap();
check(
  (await page.locator('.toast').textContent()).startsWith('Copied'),
  'a tap right after a stroke is taken, and Copy says it copied',
);
await page.locator('.selection-bar').getByRole('button', { name: 'Done' }).tap();
await page.getByRole('button', { name: 'More', exact: true }).tap();
await page.waitForTimeout(200);
await page.getByRole('menuitem', { name: 'Paste' }).tap();
await page.waitForTimeout(200);
await stroke([5, 5], [5, 20]);

// a second finger during the drag of a selection left it moved, unsaved and not undoable
const settled = (await painted()).join();
const [fromX, fromY] = await at(5, 20);

await touch('touchStart', [[fromX, fromY]]);
await touch('touchMove', [[fromX + 30, fromY]]);
await touch('touchMove', [[fromX + 60, fromY]]);
await touch('touchStart', [
  [fromX + 60, fromY],
  [fromX + 60, fromY + 80],
]);
await touch('touchEnd', []);
await page.waitForTimeout(300);
check((await painted()).join() === settled, 'a second finger takes a selection’s drag back');
await page.locator('.selection-bar').getByRole('button', { name: 'Done' }).tap();
await page.waitForTimeout(200);
// counted with the selection let go, as its outline is drawn on the canvas too
check((await painted()).length === 11 + 30 + 11, 'Paste, in the More menu, makes a copy to drag');

// the tap that ended a rename was lost: the tab tapped did not open
await openDock(page, 'Frames');
await page.locator('.grid-tab-add').tap();
await page.fill('#new-animation-name', 'Run');
await page.locator('.sheet .btn.primary').tap();
await page.waitForTimeout(300);
await page.locator('.tab-more').tap();
await page.getByRole('menuitem', { name: 'Rename' }).tap();
await page.locator('.tab-rename').fill('Dash');
await page.locator('.grid-tab', { hasText: 'Coin' }).tap();
await page.waitForTimeout(900);
check(
  (await page.locator('.grid-tab').allTextContents()).join() === 'Coin,Dash' &&
    (await page.locator('.grid-tab[aria-selected="true"]').textContent()) === 'Coin',
  'a tap on another tab keeps the name typed and opens that tab, in one tap',
);

// two fingers that missed the canvas zoomed the whole page, and its bars left the screen
const spread = async ([x, y], [alongX, alongY]) => {
  const apart = (gap) => [
    [x - alongX * gap, y - alongY * gap],
    [x + alongX * gap, y + alongY * gap],
  ];

  await touch('touchStart', [apart(1)[0]]);
  await touch('touchStart', apart(1));

  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', apart(1 + i / 8));
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(300);
};
const toolbar = await page.locator('#toolbar').boundingBox();

await openDock(page, 'Frames');
await spread([toolbar.x + toolbar.width / 2, toolbar.y + toolbar.height / 2], [40, 0]);
check(
  (await page.evaluate(() => window.visualViewport.scale)) === 1,
  'two fingers spread on the toolbar leave the page as it is',
);

// one finger above the canvas and one below it are a pinch too
await page.getByRole('button', { name: 'More', exact: true }).click();
await page.getByRole('menuitem', { name: 'Fit the canvas' }).click();
await page.waitForTimeout(200);
const fitted = await box();

await spread(
  [fitted.x + fitted.width / 2, fitted.y + fitted.height / 2],
  [0, fitted.height / 2 + 8],
);
check(
  (await page.evaluate(() => window.visualViewport.scale)) === 1 &&
    (await zoom()) > fitted.width / 32,
  'two fingers on the stage beside the canvas zoom the canvas, not the page',
);

// zoomed in, the selection's bar went off with the canvas, and Done with it
await tool('Select and move');
await stroke([14, 14], [18, 18]);
await pinch(200);
const done = await page.locator('.selection-done').evaluate((button) => {
  const place = button.getBoundingClientRect();
  const hit = document.elementFromPoint(place.left + place.width / 2, place.top + place.height / 2);

  return { left: place.left, right: place.right, top: place.top, hit: hit === button };
});
check(
  done.hit && done.left >= 0 && done.right <= 412 && done.top >= toolbar.y + toolbar.height,
  'with the canvas zoomed far in, the selection’s Done is still in reach',
);
await page.screenshot({ path: `${shots}/touch-zoomed-selection.png` });
await finish();
