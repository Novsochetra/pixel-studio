// A phone on its side: the canvas keeps the screen's height, the tools and the dock stand at its
// sides, and a panel opens beside the canvas, not over it.
import { openStudio } from './harness.mjs';
import { openDock, openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio({ device: 'Pixel 7 landscape' });
await openExample(page);
const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
const box = (selector) => page.locator(selector).boundingBox();
const overflow = () =>
  page.evaluate(() => [
    document.documentElement.scrollWidth - innerWidth,
    document.documentElement.scrollHeight - innerHeight,
  ]);

check(
  (await overflow()).every((extra) => extra <= 0),
  'the editor fits the screen both ways',
);
const rail = await box('#rail');
const dock = await box('#dock');
const canvas = await box('.edit-scroll');
check(rail.x < 4 && rail.height > rail.width * 3, 'the tools stand down the left side');
check(
  Math.abs(dock.x + dock.width - screen.width) < 2 && dock.height > dock.width * 3,
  'the dock stands down the right side',
);
check(canvas.height > screen.height * 0.7, 'the canvas keeps the height of the screen');

await openDock(page, 'Colours');
const panel = await box('#inspector');
const beside = await box('.edit-scroll');
check(
  panel.x >= beside.x + beside.width - 2 && panel.x + panel.width <= dock.x + 2,
  'a panel opens between the canvas and the dock',
);
check(beside.width > 200 && beside.height === canvas.height, 'and the canvas keeps its height');
await page.screenshot({ path: `${shots}/side-colours.png` });

await openDock(page, 'Frames');
const frames = await box('.grid-panel');
check(
  frames.x > (await box('.edit-scroll')).x && frames.height > screen.height * 0.6,
  'the frames open beside the canvas too',
);
await page.screenshot({ path: `${shots}/side-frames.png` });
check(
  (await overflow()).every((extra) => extra <= 0),
  'and nothing has pushed the page wider or taller',
);
await finish();
