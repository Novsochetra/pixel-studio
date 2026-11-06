// Body parts: cutting a view into parts, posing them (moving, turning, keys), plain pixels and
// back, the pose kept on the next visit, a new cut, and the cut sheet on a phone.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const canvas = page.locator('.canvas-holder canvas');
const picture = () => canvas.evaluate((element) => element.toDataURL());
const poseBar = page.locator('.pose-bar');

// the screen point over art pixel (x, y) of the 160 × 160 example
async function over([x, y]) {
  const box = await canvas.boundingBox();
  const scale = box.width / 160;

  return [box.x + (x + 0.5) * scale, box.y + (y + 0.5) * scale];
}

async function drag(from, by, { shift = false } = {}) {
  const [x, y] = await over(from);

  if (shift) {
    await page.keyboard.down('Shift');
  }

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + by[0], y + by[1], { steps: 6 });
  await page.mouse.up();

  if (shift) {
    await page.keyboard.up('Shift');
  }

  await page.waitForTimeout(150);
}

await openExample(page);
await page.getByRole('button', { name: 'This view' }).click();
await page.keyboard.press('o');
await page.waitForTimeout(150);
check((await poseBar.textContent()).includes('not cut into parts'), 'the Pose tool offers a cut');

await poseBar.getByRole('button', { name: 'Cut into parts…' }).click();
await page.waitForTimeout(300);
check((await page.locator('.cut-part').count()) === 13, 'the cut sheet starts from 13 parts');
check(
  (await page.locator('.cut-size', { hasText: 'empty' }).count()) === 0,
  'and its first guess gives each of them pixels',
);
await page.screenshot({ path: `${shots}/body-cut-sheet.png` });
await page.getByRole('button', { name: 'Unpaint' }).click();
const head = page.locator('.cut-part', { has: page.getByRole('button', { name: 'Paint Head' }) });
const headSize = await head.locator('.cut-size').textContent();
const cutCanvas = await page.locator('.cut-canvas').boundingBox();
await page.mouse.click(cutCanvas.x + cutCanvas.width / 2, cutCanvas.y + 40);
await page.waitForTimeout(150);
check(
  (await head.locator('.cut-size').textContent()) !== headSize,
  'the brush unpaints pixels from a part',
);
await page.getByRole('button', { name: 'Paint', exact: true }).click();
await page.getByRole('button', { name: 'Lasso' }).click();
await page.getByRole('button', { name: 'Paint Torso' }).click();
const torso = page.locator('.cut-part', { has: page.getByRole('button', { name: 'Paint Torso' }) });
const torsoSize = await torso.locator('.cut-size').textContent();
const [left, top] = [cutCanvas.x + cutCanvas.width * 0.25, cutCanvas.y + cutCanvas.height * 0.08];
const [right, bottom] = [
  cutCanvas.x + cutCanvas.width * 0.75,
  cutCanvas.y + cutCanvas.height * 0.3,
];
await page.mouse.move(left, top);
await page.mouse.down();
for (const [x, y] of [
  [right, top],
  [right, bottom],
  [left, bottom],
]) {
  await page.mouse.move(x, y, { steps: 4 });
}
await page.mouse.up();
await page.waitForTimeout(150);
check(
  parseInt(await torso.locator('.cut-size').textContent(), 10) > parseInt(torsoSize, 10) + 100,
  'a lasso round the head gives what it holds to the part picked',
);
await page.getByRole('button', { name: 'Guess again' }).click();
check((await head.locator('.cut-size').textContent()) === headSize, 'Guess again starts over');
await page.locator('.sheet').getByRole('button', { name: 'Cut into 13 parts' }).click();
await page.waitForTimeout(300);
check(
  (await page.locator('.layer-row', { hasText: 'Body' }).locator('.badge').textContent()) ===
    'Parts',
  'the parts are drawn on a Body layer',
);

for (let i = 0; i < 2; i++) {
  await page.keyboard.press('+');
}

await page.waitForTimeout(300);
const rest = await picture();
await drag([58, 88], [-24, -8]);
check((await page.inputValue('#pose-part')) === 'lower-arm-l', 'a press picks the part under it');
check((await picture()) !== rest, 'and a drag moves it');
await page.keyboard.press('Meta+z');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
check((await picture()) === rest, 'undo puts it back');

await drag([59, 70], [30, 30], { shift: true });
const angle = Number(await page.inputValue('#pose-angle'));
check(angle !== 0, `Shift and a drag turns a part (${angle}°)`);
await page.keyboard.press(']');
await page.waitForTimeout(150);
check(Number(await page.inputValue('#pose-angle')) === angle + 5, '] turns it 5° more');
await page.screenshot({ path: `${shots}/body-posed.png` });

await page.keyboard.press('b');
await page.mouse.click(...(await over([80, 40])));
await page.waitForTimeout(150);
check(
  (await page.locator('.toast').textContent()).includes('drawn from its parts'),
  'the pencil does not paint on a posed Body, and says why',
);
await page.keyboard.press('o');
await poseBar.getByRole('button', { name: 'Turn into pixels' }).click();
await page.waitForTimeout(150);
check((await poseBar.textContent()).includes('plain pixels'), 'a frame can become plain pixels');
await poseBar.getByRole('button', { name: 'Pose the parts here' }).click();
await page.waitForTimeout(150);
check((await page.locator('#pose-part').count()) === 1, 'and be posed again');

await page.locator('.cell-add').click();
await page.waitForTimeout(200);
await poseBar.getByRole('button', { name: 'Pose the parts here' }).click();
await page.waitForTimeout(200);
check(
  !(await page.locator('.cell.selected').getAttribute('aria-label')).includes('empty'),
  'a new frame is posed from the frame before',
);

await page.waitForSelector('[data-state="saved"]');
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(500);
await page.keyboard.press('o');
await page.waitForTimeout(150);
check((await page.locator('#pose-part').count()) === 1, 'the pose is kept for the next visit');

await poseBar.getByRole('button', { name: 'Edit the cut…' }).click();
await page.waitForTimeout(300);
check(
  (await page.locator('.sheet h3').textContent()).includes('Edit the cut of Front'),
  'the cut can be edited again',
);
await page.locator('.sheet .btn.primary').click();
await page.waitForTimeout(300);
check((await page.locator('#pose-part').count()) === 1, 'and the frames stay posed');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await poseBar.getByRole('button', { name: 'Edit the cut…' }).click();
await page.waitForTimeout(300);
check(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'on a phone the cut sheet fits the screen',
);
await page.screenshot({ path: `${shots}/body-cut-phone.png` });

await finish();
