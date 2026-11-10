// Drawing with fingers on a phone: a stroke lands where the finger goes, a tap acts once, and two
// fingers pan and pinch without the tool in hand touching the art.
import { openStudio } from './harness.mjs';
import { createProject, openDock } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const cdp = await context.newCDPSession(page);
const touch = (type, points) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y], id) => ({ x, y, id })),
  });
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
  const fingers = (gap) => [
    [middle[0] - gap, middle[1]],
    [middle[0] + gap, middle[1]],
  ];

  await touch('touchStart', [fingers(40)[0]]);
  await touch('touchStart', fingers(40));

  for (let i = 1; i <= 8; i++) {
    await touch('touchMove', fingers(40 + (spread * i) / 8));
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
await finish();
