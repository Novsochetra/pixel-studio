// The views board (marks, notes, the overlay) and the preview of every kind: the pitch for a Naga
// Eleven character, a plain scene with an own background, tiles laid as a floor, an effect at its
// sizes.
import { openStudio } from './harness.mjs';
import { chooseFiles, createProject, imageFile, openExample } from './studio.mjs';

const { page, check, finish, images, shots } = await openStudio();
const workspace = (name) => page.getByRole('button', { name, exact: true }).click();
const sceneSize = () =>
  page.locator('.stage canvas').evaluate((canvas) => [canvas.width, canvas.height]);
const newProject = async (kind, name) => {
  await page.locator('button.wordmark').click();
  await page.locator('.start-section').evaluate((details) => {
    details.open = true;
  });
  await createProject(page, { kind, name });
};
await openExample(page);

await workspace('Views board');
const board = page.locator('.stage canvas').first();
const box = await board.boundingBox();
await page.getByRole('button', { name: 'Draws a mark' }).click();
await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 8 });
await page.mouse.up();
await page.getByRole('button', { name: 'Adds a note' }).click();
await page.fill('#note-text', 'arm too thin');
await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.45);
await page.waitForTimeout(300);
check(
  (await page.getByRole('button', { name: 'Clear marks' }).count()) === 1,
  'marks and notes go on the board',
);
await page.selectOption('#overlay-direction', 'east');
check(
  (await page.inputValue('#overlay-direction')) === 'east',
  'any view can be laid over the others',
);
await page.screenshot({ path: `${shots}/board.png` });
await page.getByRole('button', { name: 'Draws a mark' }).click();
const boardPixels = () => board.evaluate((canvas) => canvas.toDataURL().length);
const before = await boardPixels();
await board.evaluate((canvas) => {
  const area = canvas.getBoundingClientRect();
  const at = (pointerId, x, y) => ({
    pointerId,
    pointerType: 'touch',
    bubbles: true,
    clientX: area.left + area.width * x,
    clientY: area.top + area.height * y,
  });

  canvas.dispatchEvent(new window.PointerEvent('pointerdown', at(1, 0.2, 0.5)));
  // a second finger lands on the captions, off the art
  canvas.dispatchEvent(new window.PointerEvent('pointerdown', at(2, 0.2, 0.01)));
  canvas.dispatchEvent(new window.PointerEvent('pointermove', at(1, 0.25, 0.7)));
  canvas.dispatchEvent(new window.PointerEvent('pointerup', at(1, 0.25, 0.7)));
});
await page.waitForTimeout(200);
check((await boardPixels()) !== before, 'a second finger off the art leaves the mark being drawn');
await page.getByRole('button', { name: 'Clear marks' }).click();

await workspace('On the pitch');
const [pitchWidth] = await sceneSize();
check(pitchWidth > 700, 'a Naga Eleven character stands on the match screenshot');
await page.getByRole('button', { name: /Game size/ }).click();
await page.getByLabel('Mirrored side').check();
await page.getByLabel('Run across').check();
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(400);
check((await page.getByRole('button', { name: 'Pause' }).count()) === 1, 'the scene plays');
check(
  (await page.locator('.preview-note').textContent()).includes('Side, left'),
  'with the mirrored side standing too',
);
await page.screenshot({ path: `${shots}/pitch.png` });
await page.getByRole('button', { name: 'Pause' }).click();

// a scene zoomed past the window scrolls both ways: its controls went off with it
await page.getByRole('button', { name: '3×' }).click();
await page.locator('#stage').evaluate((stage) => stage.scrollTo(300, 300));
await page.waitForTimeout(200);
const playButton = await page.getByRole('button', { name: 'Play', exact: true }).boundingBox();
const stageBox = await page.locator('#stage').boundingBox();
check(
  playButton.y >= stageBox.y &&
    playButton.x >= stageBox.x &&
    playButton.x + playButton.width <= stageBox.x + stageBox.width,
  'the preview’s controls stay in the window while the scene scrolls under them',
);
await page.screenshot({ path: `${shots}/pitch-zoomed.png` });
await page.getByRole('button', { name: '1×' }).click();

await newProject('Character', 'Knight');
await workspace('Preview');
check(
  (await page.getByRole('button', { name: 'Use your own background…' }).count()) === 1,
  'any other character stands on a plain floor',
);
await chooseFiles(
  page,
  () => page.getByRole('button', { name: 'Use your own background…' }).click(),
  [imageFile(`${images}/back2.webp`, 'castle.webp')],
);
await page.waitForTimeout(800);
check(
  (await page.getByRole('button', { name: 'No background' }).count()) === 1,
  'and can have a background of its own',
);

await newProject('Tiles', 'Floor');
await workspace('Preview');
check(
  JSON.stringify(await sceneSize()) === '[128,80]',
  'a tile is previewed laid eight by five, edge to edge',
);
await page.screenshot({ path: `${shots}/tiles.png` });

await newProject('Effect', 'Flash');
await workspace('Preview');
const [plateWidth, plateHeight] = await sceneSize();
check(
  plateWidth === (48 * 4 + 32) * 3 && plateHeight === (48 * 4 + 32) * 2,
  'an effect is shown at 1×, 2× and 4×, on light and on dark',
);

await finish();
