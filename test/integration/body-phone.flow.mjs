// Posing on a phone, where there is the least room for it: the cut window, the Pose bar, and
// the frames' tabs with the phone on its side.
import { openStudio } from './harness.mjs';
import { openDock, openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
await openExample(page);

// cut into parts, the Pose tool's bar is wider than a phone: centred, its first controls were
// out of the scroll's reach, and the cut window's own buttons were a long scroll down
await page.locator('#rail [aria-label^="Pose"]').evaluate((button) => button.click());
await page
  .locator('.pose-bar')
  .getByRole('button', { name: /Cut into parts/ })
  .tap();
await page.waitForTimeout(600);
const foot = await page.locator('.sheet .sheet-actions').boundingBox();
check(
  foot.y > 400 && foot.y + foot.height <= 840,
  'the cut window keeps its buttons at the foot of the screen',
);
// shrunk to fit by the stylesheet, the art was squashed and the brush painted beside the finger
const cutArt = await page.locator('.cut-canvas').evaluate((canvas) => {
  const box = canvas.getBoundingClientRect();

  return {
    drawn: parseFloat(canvas.style.width) / parseFloat(canvas.style.height),
    shown: box.width / box.height,
    bottom: box.bottom,
  };
});
check(
  Math.abs(cutArt.drawn - cutArt.shown) < 0.01,
  'the art to cut keeps its proportions on a phone',
);
const firstPart = await page.locator('.cut-part').first().boundingBox();
check(
  cutArt.bottom < foot.y && firstPart.y < foot.y,
  'and the art and the parts are both in sight above the buttons',
);
// a row that scrolls has no height of its own to the column it stands in: the brush's controls
// were squeezed to nothing, and a cut could not be corrected on a phone
const brush = await page.locator('.cut-brush').boundingBox();
check(
  brush.height >= 36 &&
    (await page.locator('.cut-brush').getByRole('button', { name: 'Unpaint' }).isVisible()),
  'and the brush’s controls are a row a finger can use',
);
await page.locator('.sheet .btn.primary').tap();
await page.waitForTimeout(800);
const firstControl = await page.locator('.pose-bar > :first-child').boundingBox();
check(firstControl.x >= 0, 'the Pose bar starts at its first control, the rest a scroll away');

// another bar opened where the last one was scrolled to, its part picker off the screen
await page.selectOption('#pose-part', { index: 1 });
await page.waitForTimeout(200);
await page.locator('.pose-bar').evaluate((bar) => {
  bar.scrollLeft = bar.scrollWidth;
});
await page
  .locator('.pose-bar')
  .getByRole('button', { name: 'Draw on part' })
  .evaluate((button) => button.click());
await page.waitForTimeout(300);
const drawingBar = await page.locator('.pose-bar').evaluate((bar) => ({
  scrolled: bar.scrollLeft,
  first: bar.firstElementChild.getBoundingClientRect().left,
}));
check(
  drawingBar.scrolled === 0 && drawingBar.first >= 0,
  'the bar for drawing on a part starts at its first control too',
);
await page.screenshot({ path: `${shots}/body-phone-drawing.png` });

// on its side a phone shows the frames in a narrow panel: sharing a row with Play, the open
// tab showed two letters of its name
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(400);
await openDock(page, 'Frames');
const tab = await page.locator('.grid-tab[aria-selected="true"]').evaluate((open) => {
  const strip = open.closest('.grid-tabs').getBoundingClientRect();
  const box = open.getBoundingClientRect();

  return {
    whole: open.scrollWidth <= open.clientWidth,
    inside: box.left >= strip.left - 1 && box.right <= strip.right + 1,
  };
});
check(tab.whole && tab.inside, 'with the phone on its side the open tab shows its whole name');
await page.screenshot({ path: `${shots}/body-phone-landscape.png` });

await finish();
