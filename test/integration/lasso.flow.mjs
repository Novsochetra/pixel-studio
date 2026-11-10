// The lasso: a loop drawn round a part selects it; a drag inside lifts it off the art and moves
// it; cut, paste and undo work as for any selection; a click away lets go.
import { openStudio } from './harness.mjs';
import { frameAction, frameLabels, openExample, selectView } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const canvas = page.locator('.canvas-holder canvas');
const picture = () => canvas.evaluate((element) => element.toDataURL());
const bar = page.getByRole('toolbar', { name: 'Selection' });

async function over([x, y]) {
  const box = await canvas.boundingBox();
  const scale = box.width / 160;

  return [box.x + (x + 0.5) * scale, box.y + (y + 0.5) * scale];
}

async function stroke(points) {
  await page.mouse.move(...(await over(points[0])));
  await page.mouse.down();

  for (const point of points.slice(1)) {
    await page.mouse.move(...(await over(point)), { steps: 4 });
  }

  await page.mouse.up();
  await page.waitForTimeout(150);
}

// a loop round the fist on the left of the picture
const roundTheFist = [
  [50, 80],
  [64, 79],
  [65, 96],
  [52, 97],
  [50, 88],
];

await openExample(page);
await page.keyboard.press('+');
await page.keyboard.press('l');
check(
  (await page.getByRole('button', { name: /^Lasso/ }).getAttribute('aria-pressed')) === 'true',
  'L picks the lasso',
);

const before = await picture();
await stroke(roundTheFist);
check(await bar.isVisible(), 'a loop round a part selects it');
await stroke([
  [58, 88],
  [40, 70],
]);
check(await bar.isVisible(), 'a drag inside keeps it selected');
check((await picture()) !== before, 'and moves it off the art');
await page.screenshot({ path: `${shots}/lasso-moved.png` });
await page.keyboard.press('Meta+z');
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check((await picture()) === before, 'undo puts it back');

await stroke(roundTheFist);
await page.keyboard.press('Meta+x');
await page.waitForTimeout(150);
check((await picture()) !== before, '⌘X cuts what the lasso holds');
await page.keyboard.press('Meta+v');
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check((await picture()) === before, '⌘V puts it back where it was');

// the colour shown at the middle of art pixel (x, y)
async function colourAt(point) {
  const [x, y] = await over(point);
  const box = await canvas.boundingBox();

  return canvas.evaluate(
    (element, [cx, cy]) => [...element.getContext('2d').getImageData(cx, cy, 1, 1).data].join(),
    [x - box.x, y - box.y],
  );
}

const [kept, gone, far] = [
  [58, 88],
  [56, 86],
  [80, 40],
];
const colours = await Promise.all([kept, gone, far].map(colourAt));
// ⌘V leaves the box tool picked, to place what was pasted
await page.keyboard.press('l');
await stroke(roundTheFist);
await page.keyboard.down('Alt');
await page.mouse.click(...(await over(kept)));
await page.keyboard.up('Alt');
await page.keyboard.down('Shift');
await page.mouse.click(...(await over(far)));
await page.keyboard.up('Shift');
await page.keyboard.press('Delete');
await page.waitForTimeout(150);
check(
  (await colourAt(kept)) === colours[0],
  'Alt and a click takes one pixel out of the selection',
);
check((await colourAt(gone)) !== colours[1], 'the rest of what the lasso held is deleted');
check((await colourAt(far)) !== colours[2], 'Shift and a click adds one pixel far from it');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);

await page.keyboard.press('l');
await stroke(roundTheFist);
await frameAction(page, 'Duplicate frame');
check(
  (await bar.isVisible()) && (await frameLabels(page)).length === 2,
  'a duplicated frame keeps the selection',
);
const copied = await picture();
await stroke([
  [58, 88],
  [58, 80],
]);
check((await picture()) !== copied, 'so the part is moved in the new frame at once');
await page.keyboard.press(',');
await page.waitForTimeout(150);
check(await bar.isVisible(), 'stepping to another frame keeps it too');
await selectView(page, 'Side');
check(await bar.isHidden(), 'another view is another drawing: the selection goes');
await selectView(page, 'Front');

await stroke(roundTheFist);
await page.mouse.click(...(await over([10, 10])));
await page.waitForTimeout(150);
check(await bar.isHidden(), 'a click away lets go');

// Add stayed on after its loop: the next drag inside the selection drew a loop, and moved nothing
const add = bar.getByRole('button', { name: 'Add', exact: true });

await stroke(roundTheFist);
await add.click();
await stroke([
  [70, 80],
  [84, 79],
  [85, 96],
  [72, 97],
  [70, 88],
]);
check((await add.getAttribute('aria-pressed')) === 'false', 'Add is for the next loop alone');
const added = await picture();

await stroke([
  [58, 88],
  [58, 70],
]);
check((await picture()) !== added, 'and the drag after it moves what is selected');

await finish();
