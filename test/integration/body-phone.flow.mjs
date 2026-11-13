// Posing on a phone, where there is the least room for it: the cut window, the Pose bar, and
// the frames' tabs with the phone on its side.
import { fingers, openStudio } from './harness.mjs';
import { openDock, openExample } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'Pixel 7' });
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
const small = await page
  .locator('.cut-part')
  .first()
  .evaluate((part) =>
    [...part.querySelectorAll('button, select')]
      .map((control) => control.getBoundingClientRect())
      .filter((box) => box.width < 40 || box.height < 40),
  );
check(
  small.length === 0,
  `a part’s colour and buttons are a finger’s size (${small.length} smaller)`,
);

// A second finger landing in the middle of a stroke painted with it too: two fingers set down
// to zoom left two smears. It takes the stroke back, as on the editor's canvas.
const touch = await fingers(context, page);
const sizes = () => page.locator('.cut-size').allTextContents();
const guessed = (await sizes()).join();
const art = await page.locator('.cut-canvas').boundingBox();
const across = (share) => [art.x + art.width * share, art.y + art.height * 0.45];

await page.locator('.cut-brush').getByRole('button', { name: 'Unpaint' }).tap();
await touch('touchStart', [across(0.3)]);
await touch('touchMove', [across(0.5)]);
await touch('touchStart', [across(0.5), across(0.7)]);
await touch('touchMove', [across(0.45), across(0.75)]);
await touch('touchEnd', []);
await page.waitForTimeout(250);
check(
  (await sizes()).join() === guessed,
  'a second finger in the cut window takes the stroke back',
);
check(
  await page.locator('.sheet').getByRole('button', { name: 'Undo', exact: true }).isDisabled(),
  'and leaves no step',
);
await touch('touchStart', [across(0.3)]);
await touch('touchMove', [across(0.5)]);
await touch('touchEnd', []);
await page.waitForTimeout(250);
check((await sizes()).join() !== guessed, 'one finger alone still unpaints');
// Chromium makes no click of a tap that follows two fingers within a moment
await page.waitForTimeout(1500);
await page.locator('.sheet').getByRole('button', { name: 'Undo', exact: true }).tap();
await page.waitForTimeout(250);
check((await sizes()).join() === guessed, 'and Undo under a finger takes that back');
// the whole figure left a hand a few pixels wide on a phone: zoomed, the part fills the room
const shape = () =>
  page.locator('.cut-canvas').evaluate((canvas) => {
    const box = canvas.getBoundingClientRect();

    return { tall: box.height / box.width, wide: box.width };
  });
const wholeArt = await shape();
const zoomAt = await page.getByRole('button', { name: 'Zoom to part' }).boundingBox();

check(
  zoomAt.x >= 0 && zoomAt.x + zoomAt.width <= 412,
  'Zoom to part is in sight, where it was two scrolls along the tools’ row',
);

await page.locator('.cut-art').getByRole('button', { name: 'Zoom to part' }).tap();
await page.waitForTimeout(300);
const zoomed = await shape();

check(
  wholeArt.tall > 1.5 && zoomed.tall < 1.5 && zoomed.wide > wholeArt.wide,
  `Zoom to part shows the part picked close up (${wholeArt.wide}px wide, then ${zoomed.wide}px)`,
);
const beforeZoomedStroke = (await sizes()).join();
const close = await page.locator('.cut-canvas').boundingBox();

await page.locator('.cut-brush').getByRole('button', { name: 'Paint', exact: true }).tap();
await touch('touchStart', [[close.x + close.width * 0.2, close.y + close.height * 0.5]]);
await touch('touchMove', [[close.x + close.width * 0.8, close.y + close.height * 0.5]]);
await touch('touchEnd', []);
await page.waitForTimeout(250);
check((await sizes()).join() !== beforeZoomedStroke, 'and a stroke there paints the part');
// Chromium makes no click of the first tap after a driven stroke, wherever it lands
await page
  .locator('.cut-art')
  .getByRole('button', { name: 'Zoom to part' })
  .evaluate((button) => button.click());
await page.waitForTimeout(300);
check((await shape()).tall > 1.5, 'and pressed again it shows the whole art');
await page.locator('.sheet').getByRole('button', { name: 'Undo', exact: true }).tap();
await page.locator('.sheet .btn.primary').tap();
await page.waitForTimeout(800);
const firstControl = await page.locator('.pose-bar > :first-child').boundingBox();
check(firstControl.x >= 0, 'the Pose bar starts at its first control, the rest a scroll away');

// another bar opened where the last one was scrolled to, its part picker off the screen
await page.selectOption('#pose-part', { index: 1 });
await page.waitForTimeout(200);
// with a part picked, the menu of what else a pose can do was a scroll past the screen's edge
const moreAt = await page.getByRole('button', { name: 'More for the pose' }).boundingBox();
check(
  moreAt.x + moreAt.width <= 412,
  `with a part picked the Pose bar’s ⋯ is on the screen (its right at ${Math.round(moreAt.x + moreAt.width)}px)`,
);
await page.locator('.pose-bar').evaluate((bar) => {
  bar.scrollLeft = bar.scrollWidth;
});
await page.getByRole('button', { name: 'More for the pose' }).evaluate((button) => button.click());
await page.getByRole('menuitem', { name: 'Draw on part' }).tap();
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

// the shortest phone on its side: the art ran past its card, its caption under the buttons
await page.setViewportSize({ width: 658, height: 320 });
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page
  .locator('[aria-label^="Pose"]')
  .first()
  .evaluate((button) => button.click());
await page.getByRole('button', { name: 'More for the pose' }).evaluate((button) => button.click());
await page.getByRole('menuitem', { name: 'Edit the cut…' }).tap();
await page.waitForTimeout(600);
const inCard = await page.evaluate(() => {
  const card = document.querySelector('.cut-art').getBoundingClientRect();
  const drawn = document.querySelector('.cut-canvas').getBoundingClientRect();
  const said = document.querySelector('.cut-paints').getBoundingClientRect();
  const buttons = document.querySelector('.sheet .sheet-actions').getBoundingClientRect();

  return (
    drawn.bottom <= card.bottom + 0.5 &&
    said.bottom <= card.bottom + 0.5 &&
    card.bottom <= buttons.top
  );
});

check(inCard, 'on the shortest phone on its side the art and what it paints stay in their card');
await page.screenshot({ path: `${shots}/body-phone-short-cut.png` });

await finish();
