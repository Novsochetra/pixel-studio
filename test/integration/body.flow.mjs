// Body parts: cutting a view into parts, posing them (moving, turning, keys), plain pixels and
// back, the pose kept on the next visit, a new cut, and the cut sheet on a phone.
import { openStudio } from './harness.mjs';
import { openExample, showViews } from './studio.mjs';

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
await showViews(page, 'Front only');
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
await page.locator('.sheet').getByRole('button', { name: 'Lasso', exact: true }).click();
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
await page.getByRole('button', { name: 'Paint Head' }).focus();
await page.keyboard.press('Enter');
check(
  (await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Paint Head',
  'the keys stay on the control just used in the parts list',
);
await page.keyboard.press('Escape');
check(
  (await page.locator('.sheet .ask-question').count()) === 1,
  'closing the cut window on corrections asks first',
);
await page.getByRole('button', { name: 'Go on cutting', exact: true }).click();
check((await page.locator('.cut-part').count()) === 13, 'and Go on cutting goes on with them');
await page.getByRole('button', { name: 'Guess again' }).click();
check((await head.locator('.cut-size').textContent()) === headSize, 'Guess again starts over');
await page.locator('.sheet').getByRole('button', { name: 'Cut into 13 parts' }).click();
await page.waitForTimeout(300);
check(
  (await page.locator('.layer-row', { hasText: 'Body' }).locator('.badge').textContent()) ===
    'Parts',
  'the parts are drawn on a Body layer',
);
await page.locator('.layer-row', { hasText: 'Body' }).locator('.layer-name').click();
await page.waitForTimeout(150);
check(
  (await page.locator('.pose-bar:not([hidden])').count()) === 1,
  'picking a layer in the list leaves the Pose tool in hand',
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

const turnedPart = await page.inputValue('#pose-part');
await page.keyboard.press('Escape');
await page.keyboard.press('b');
await page.mouse.click(...(await over([80, 40])));
await page.waitForTimeout(150);
check(
  (await page.locator('.toast').textContent()).includes('pick a part'),
  'with no part picked the pencil does not paint on a posed Body, and says why',
);
await page.keyboard.press('o');
await page.waitForTimeout(150);
await page.selectOption('#pose-part', turnedPart);
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Draw on part' }).click();
await page.waitForTimeout(150);
check((await poseBar.textContent()).includes('Drawing on'), 'Draw on part takes up the pencil');
check((await page.inputValue('#pose-part')) === turnedPart, 'for the part picked');
const undrawn = await picture();
await drag([50, 95], [30, 0]);
const drawn = await picture();
check(drawn !== undrawn, 'the pencil draws on the turned part');
await page.screenshot({ path: `${shots}/body-draw-on-part.png` });
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
check((await picture()) === undrawn, 'undo takes the drawing off the part');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(150);
check((await picture()) === drawn, 'and redo puts it back');
await poseBar.getByRole('button', { name: 'Back to posing' }).click();
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Reset part' }).click();
await page.waitForTimeout(150);
const drawingAtRest = await picture();
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Reset part' }).click();
await page.waitForTimeout(150);
check((await picture()) !== drawingAtRest, 'the drawing goes with the part as it turns back');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Draw on part' }).click();
await page.waitForTimeout(150);
await drag([50, 95], [30, 0]);
await poseBar.getByRole('button', { name: 'Back to posing' }).click();
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Turn into pixels' }).click();
await page.waitForTimeout(150);
check(
  (await poseBar.textContent()).includes('not posed'),
  'a frame turned into pixels says it is not posed',
);
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

await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Fit' }).click();
await page.waitForTimeout(200);
const beforeVisit = await picture();
await page.waitForSelector('[data-state="saved"]');
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(500);
await page.keyboard.press('o');
await page.getByRole('button', { name: 'Fit' }).click();
await page.waitForTimeout(200);
check((await page.locator('#pose-part').count()) === 1, 'the pose is kept for the next visit');
check((await picture()) === beforeVisit, 'and so is what was drawn on the part');

await page.selectOption('#pose-part', { label: 'Foot L' });
await page.waitForTimeout(150);
await poseBar.getByRole('button', { name: 'Edit the cut…' }).click();
await page.waitForTimeout(300);
check(
  (await page.locator('.sheet h3').textContent()).includes('Edit the cut of Front'),
  'the cut can be edited again',
);
check(
  (await page.locator('.cut-part.picked input').inputValue()) === 'Foot L',
  'starting on the part being posed, where it started on the top one',
);
check(
  await page.locator('.cut-part.picked').evaluate((row) => {
    const box = row.getBoundingClientRect();
    const list = row.closest('.cut-side, [role="list"]').getBoundingClientRect();

    return box.top >= list.top - 1 && box.bottom <= list.bottom + 1;
  }),
  'with its row in sight',
);
await page.locator('.sheet .btn.primary').click();
await page.waitForTimeout(300);
check((await page.locator('#pose-part').count()) === 1, 'and the frames stay posed');

await page.setViewportSize({ width: 900, height: 650 });
await page.waitForTimeout(300);
const shortBar = await poseBar.boundingBox();
check(shortBar.height < 60, 'in a short window the Pose bar is one row, clear of the part');
await page.mouse.move(shortBar.x + 40, shortBar.y + shortBar.height / 2);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(200);
check(
  await poseBar.evaluate((bar) => bar.scrollLeft > 0),
  'and a mouse wheel moves along it to what waits past its edge',
);

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const phoneBar = await poseBar.evaluate((bar) => ({
  scroll: bar.scrollWidth,
  shown: bar.clientWidth,
}));
check(
  phoneBar.scroll <= phoneBar.shown * 1.5,
  `on a phone the Pose bar keeps to about the screen’s width (${phoneBar.scroll} of ${phoneBar.shown}px)`,
);
await poseBar.getByRole('button', { name: 'More for the pose' }).click();
await page.getByRole('menuitem', { name: 'Edit the cut…' }).click();
await page.waitForTimeout(300);
check(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  'on a phone the cut sheet fits the screen',
);
await page.screenshot({ path: `${shots}/body-cut-phone.png` });

await finish();
