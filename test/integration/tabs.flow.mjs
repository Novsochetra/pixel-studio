// Two tabs on one project: each saved over the other and neither showed the other's work. The
// tab that did not make a change is told of it, and can load it.
import { openStudio } from './harness.mjs';
import { createProject, paintedPixels, waitSaved } from './studio.mjs';

const { context, page, check, finish, url } = await openStudio();
const told = (tab) => tab.getByRole('dialog', { name: 'Changed in another tab' }).count();
const art = (tab) => paintedPixels(tab.getByLabel('Pixel canvas'), 16);
const opened = async (tab) => {
  await tab.waitForSelector('.grid-panel', { state: 'attached' });
  await tab.waitForTimeout(800);
};

await createProject(page, { kind: 'Icon', name: 'Twin', width: 16 });
await waitSaved(page);

const other = await context.newPage();

await other.goto(url);
await opened(other);
check(
  (await other.locator('.wordmark small').textContent()).includes('Twin'),
  'a second tab opens the same project',
);

const canvas = await page.getByLabel('Pixel canvas').boundingBox();

await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
await page.waitForTimeout(1500);
await waitSaved(page);
await other.waitForTimeout(400);
check((await told(other)) === 1, 'a tab is told when its project is saved from another tab');
check((await told(page)) === 0, 'the tab that made the change is told nothing');
check((await art(other)).length === 0, 'the tab told still shows the project as it was');

await other.getByRole('button', { name: 'Load the latest' }).click();
await other.waitForLoadState('load');
await opened(other);
check((await art(other)).length === 1, 'Load the latest brings the other tab’s work');
check((await told(other)) === 0, 'and has nothing more to say');
await finish();
