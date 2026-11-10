// Coming back: the first project made on the start screen, and the example once it is edited, open
// again on the next visit, instead of the start screen with the work saved but unlisted.
import { openStudio } from './harness.mjs';
import {
  createProject,
  forgetSavedWork,
  frameAction,
  openExample,
  selectFrame,
  selectView,
  waitSaved,
} from './studio.mjs';

const { page, check, finish, url } = await openStudio();
// the save waits a moment after the last change, and the status read "Saved" before it
const comesBack = async (what) => {
  await page.waitForTimeout(1500);
  await waitSaved(page);
  await page.reload();
  await page.waitForTimeout(1500);
  check(
    (await page.locator('.grid-panel').count()) === 1 &&
      !(await page.locator('.start-screen').count()),
    what,
  );
};

await openExample(page);
const canvas = await page.getByLabel('Pixel canvas').boundingBox();
// a corner, empty, so the pencil's red really changes a pixel
await page.mouse.click(canvas.x + 12, canvas.y + 12);
await comesBack('the example, once edited, opens again on the next visit');

await selectView(page, 'Side');
await page.locator('.grid-row.current .cell-add').click();
await page.waitForTimeout(200);
await selectFrame(page, 1);
await frameAction(page, 'Delete frame 2 from Side');
await comesBack('the example opens again after one view loses a frame');
check(
  (await page.locator('.grid-row[data-direction="east"] .cell').count()) === 1 &&
    (await page.locator('.grid-row[data-direction="south"] .cell').count()) === 2,
  'and that view still has the fewer frames',
);

await forgetSavedWork(page, url);
await createProject(page, { kind: 'Tiles', name: 'Floor' });
await comesBack('the first project made on the start screen opens again on the next visit');
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Floor'),
  'and it is that project',
);
await finish();
