// The lasso: a loop drawn round a part selects it; a drag inside lifts it off the art and moves
// it; cut, paste and undo work as for any selection; a click away lets go.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

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

await page.keyboard.press('l');
await stroke(roundTheFist);
await page.mouse.click(...(await over([10, 10])));
await page.waitForTimeout(150);
check(await bar.isHidden(), 'a click away lets go');

await finish();
