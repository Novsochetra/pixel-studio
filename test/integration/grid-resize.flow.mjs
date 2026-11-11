// The line above the frames resizes them: by dragging, by keys, kept for the next visit.
import { openStudio } from './harness.mjs';
import { openExample, waitSaved } from './studio.mjs';

const { page, check, shots, finish } = await openStudio();
await openExample(page);
const handle = page.getByRole('separator', { name: 'Resize the frames' });
const panelHeight = async () => (await page.locator('.grid-panel').boundingBox()).height;
const canvasRoom = async () => (await page.locator('.edit-scroll').boundingBox()).height;
const dragBy = async (distance) => {
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + distance, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};

const fitted = await panelHeight();
const room = await canvasRoom();
const artHeight = async () => (await page.getByLabel('Pixel canvas').boundingBox()).height;
const artAboveFrames = async () => {
  const stage = await page.locator('.edit-scroll').boundingBox();
  const art = await page.getByLabel('Pixel canvas').boundingBox();

  return art.y >= stage.y && art.y + art.height <= stage.y + stage.height;
};

// fitted a zoom step larger than the stage's margins allowed, its last rows lay under the frames
check(await artAboveFrames(), 'the canvas opens fitted wholly above the frames');

await dragBy(-120);
check(Math.abs((await panelHeight()) - fitted - 120) <= 1, 'dragging up makes the frames taller');
check(Math.abs(room - (await canvasRoom()) - 120) <= 1, 'and the canvas gives up that room');
await page.screenshot({ path: `${shots}/grid-resize.png` });

const dragged = await panelHeight();

// the example comes back only once it is edited
const canvas = await page.getByLabel('Pixel canvas').boundingBox();

await page.mouse.click(canvas.x + 12, canvas.y + 12);
await page.waitForTimeout(1500);
await waitSaved(page);
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(400);
check(Math.abs((await panelHeight()) - dragged) <= 1, 'the height is kept for the next visit');

await dragBy(-2000);
// with 120 left the example's 160 rows, at 100%, had their feet under the frames
check((await canvasRoom()) >= 175, 'the frames leave the canvas room for all of it at 100%');
check(await artAboveFrames(), 'so the art is in sight however tall the frames are dragged');

// Safari took a press on the line for the start of a selection, and the drag down over the
// frames for a drag of their pictures: the line stopped following, and stayed held
await dragBy(2000);
check((await panelHeight()) <= 161, 'and can shrink only as far as a row still fits');
check(
  !(await handle.evaluate((line) => line.classList.contains('dragging'))),
  'and the line is let go of when the drag ends',
);

await handle.focus();
const before = await panelHeight();

await page.keyboard.press('ArrowUp');
check((await panelHeight()) === before + 16, 'the up arrow on the line makes the frames taller');

await page.getByRole('button', { name: 'Hide the frames' }).click();
await page.waitForTimeout(150);
check(!(await handle.isVisible()), 'folded frames have no line to drag');
check((await panelHeight()) < 80, 'and fold down to their bar whatever height was chosen');

await page.getByRole('button', { name: 'Show the frames' }).click();
await page.waitForTimeout(150);
await handle.dblclick();
await page.waitForTimeout(150);
check(Math.abs((await panelHeight()) - fitted) <= 1, 'a double-click fits the frames again');

// a tablet held wide left a 160 pixel canvas at 100%, with room for 200% but for the margins
await page.setViewportSize({ width: 1024, height: 700 });
await page.waitForTimeout(400);
check(
  (await artHeight()) === 320,
  'in a short window the canvas takes the zoom step its margins kept from it',
);
check(await artAboveFrames(), 'and still stands wholly above the frames');

await finish();
