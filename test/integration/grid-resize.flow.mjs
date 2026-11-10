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
check((await canvasRoom()) >= 119, 'the frames can never take all of the canvas');

await dragBy(2000);
check((await panelHeight()) <= 121, 'and can shrink only as far as a row still fits');

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

await finish();
