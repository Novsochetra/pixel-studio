// Moving one layer: only that layer moves, only in this frame, by a drag or the arrow keys. A drag
// on empty canvas moves the whole frame.
import { openStudio } from './harness.mjs';
import { frameAction, openExample, selectFrame } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const pixels = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    let sum = element.width * 31 + element.height;

    for (let i = 0; i < data.length; i += 1) {
      sum = (sum * 33 + data[i]) % 2147483647;
    }

    return sum;
  });
const press = async (from) => {
  await page.mouse.move(...at(...from));
  await page.mouse.down();
};
const drag = async (from, to) => {
  await press(from);
  await page.mouse.move(...at(...to), { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const eye = async (verb, name) => {
  await page.getByRole('button', { name: `${verb} ${name}`, exact: true }).click();
  await page.waitForTimeout(100);
};
// what each layer alone looks like
const layerPixels = async () => {
  await eye('Hide', 'Art');
  const hair = await pixels();

  await eye('Show', 'Art');
  await eye('Hide', 'Hair');
  const body = await pixels();

  await eye('Show', 'Hair');

  return { hair, body };
};

await page.getByRole('button', { name: 'New layer', exact: true }).click();
await page.keyboard.type('Hair');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await drag([5, 5], [30, 15]);

await page.keyboard.press('t');
check(
  (await page.getByRole('button', { name: /^Move:/ }).getAttribute('aria-pressed')) === 'true',
  'T picks the tool that moves a layer',
);
check(
  (await canvas.evaluate((element) => getComputedStyle(element).cursor)) === 'move',
  'and the pointer over the canvas says the art will move',
);

const before = await layerPixels();
const whole = await pixels();

await press([5, 5]);
await page.mouse.move(...at(45, 30), { steps: 8 });
check((await pixels()) !== whole, 'a drag shows the layer moving');
await page.screenshot({ path: `${shots}/layer-move-drag.png` });
await page.mouse.up();
await page.waitForTimeout(150);
const moved = await pixels();
const after = await layerPixels();

check(after.hair !== before.hair, 'letting go moves the picked layer');
check(after.body === before.body, 'and the other layer stays where it was');

await page.locator('.layer-row', { hasText: 'Hair' }).click();
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(100);
check((await pixels()) !== moved, 'with its row clicked, an arrow key still moves the layer');
check(
  (await page.locator('.layer-row[aria-selected="true"]').textContent()).includes('Hair'),
  'and does not pick another layer',
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(100);
check((await pixels()) === moved, 'the arrow key is one undo step');

await page.keyboard.press('s');
const beforeRowClick = await layerPixels();

await page.locator('.layer-row', { hasText: 'Hair' }).click();
check(
  (await page.getByRole('button', { name: /^Move:/ }).getAttribute('aria-pressed')) === 'true',
  'clicking a layer picks the tool that moves it',
);
await drag([45, 30], [50, 36]);
await page.screenshot({ path: `${shots}/layer-move-row.png` });
const afterRowClick = await layerPixels();

check(afterRowClick.hair !== beforeRowClick.hair, 'so a drag then moves that layer');
check(afterRowClick.body === beforeRowClick.body, 'and not the other layers');

await page.keyboard.press('s');
await drag([100, 100], [120, 120]);
check(await page.locator('.selection-bar').isVisible(), 'a selection shows its bar');
await page.locator('.layer-row', { hasText: 'Hair' }).click();
check(await page.locator('.selection-bar').isHidden(), 'clicking a layer lets go of a selection');

await eye('Hide', 'Hair');
const hidden = await pixels();

await drag([50, 30], [70, 50]);
check((await pixels()) === hidden, 'a hidden layer does not move');
check(
  (await page.locator('.toast').allTextContents()).join().includes('Hair is hidden'),
  'and says why',
);
await eye('Show', 'Hair');

const frameBefore = await pixels();
const layersBefore = await layerPixels();

await press([150, 150]);
await page.mouse.move(...at(145, 146), { steps: 8 });
check((await pixels()) !== frameBefore, 'a drag on empty canvas shows the whole frame moving');
await page.screenshot({ path: `${shots}/layer-move-frame.png` });
await page.mouse.up();
await page.waitForTimeout(150);
const frameMoved = await pixels();

await page.keyboard.press('Meta+z');
await page.waitForTimeout(100);
check((await pixels()) === frameBefore, 'one undo puts the whole frame back');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(100);
check((await pixels()) === frameMoved, 'one redo moves it again');

const layersAfter = await layerPixels();

check(layersAfter.hair !== layersBefore.hair, 'the drag on empty canvas moves the picked layer');
check(layersAfter.body !== layersBefore.body, 'and every other layer');
check(
  (await page.locator('.layer-row[aria-selected="true"]').textContent()).includes('Hair'),
  'and the layer being edited stays the same',
);

// picking the layer to draw on put the pencil down for Move this layer
await page.keyboard.press('b');
await page.locator('.layer-row', { hasText: 'Hair' }).click();
check(
  (await page
    .locator('#rail')
    .getByRole('button', { name: 'Pencil' })
    .getAttribute('aria-pressed')) === 'true' &&
    (await page.locator('.layer-row[aria-selected="true"]').textContent()).includes('Hair'),
  'with a tool that draws in hand, clicking a layer keeps the tool: it is the layer to draw on',
);

await page.locator('.layer-row', { hasText: 'Art' }).click();
await page.keyboard.press('b');
await frameAction(page, 'Duplicate frame');
await selectFrame(page, 0);
const firstFrame = await pixels();

await selectFrame(page, 1);
const secondFrame = await pixels();

await page.keyboard.press('t');
await drag([80, 80], [85, 84]);
await page.keyboard.press('b');
await page.waitForTimeout(100);
check((await pixels()) !== secondFrame, 'the layer moves in the frame being edited');
await selectFrame(page, 0);
check((await pixels()) === firstFrame, 'and in no other frame');
await finish();
