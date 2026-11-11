// A tab closed, or the page loaded again, a moment after a stroke: the stroke is there on the
// next visit. The save begun as the page left was thrown away with it, as the page was gone
// before it heard the write was done.
import { openStudio } from './harness.mjs';
import { createProject, paintedPixels } from './studio.mjs';

const { page, context, check, finish, url } = await openStudio();
await createProject(page, { kind: 'Icon', name: 'Gem', width: 16 });
const painted = async (tab) => (await paintedPixels(tab.getByLabel('Pixel canvas'), 16)).length;
const stroke = async (tab, row) => {
  const art = await tab.getByLabel('Pixel canvas').boundingBox();
  const at = (pixel) => (pixel + 0.5) * (art.width / 16);

  await tab.mouse.move(art.x + at(2), art.y + at(row));
  await tab.mouse.down();
  await tab.mouse.move(art.x + at(9), art.y + at(row), { steps: 8 });
  await tab.mouse.up();
  await tab.mouse.move(2, 2);
  // sooner than the save that follows an edit
  await tab.waitForTimeout(300);
};
const opened = async (tab) => {
  await tab.waitForSelector('.grid-panel', { state: 'attached' });
  await tab.waitForTimeout(800);
};

// the project is saved once, so the next visit opens it
await page.waitForTimeout(2000);
await stroke(page, 3);
await page.close();
const again = await context.newPage();

await again.goto(url);
await opened(again);
check(
  (await painted(again)) === 8,
  'a stroke drawn a moment before the tab was closed is there on the next visit',
);

again.on('dialog', (asked) => asked.accept());
await stroke(again, 6);
await again.reload();
await opened(again);
check((await painted(again)) === 16, 'and one drawn a moment before the page was loaded again');

// a project opened from saved work, where the first was made on this visit
await stroke(again, 9);
await again.close();
const third = await context.newPage();

await third.goto(url);
await opened(third);
check((await painted(third)) === 24, 'and one drawn in a project opened from saved work');

await finish();
