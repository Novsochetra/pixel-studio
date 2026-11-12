// The layouts a finger meets least: a short phone on its side, where the selection's bar lay on
// the art's last rows, and a tablet held wide, the desk's layout, with words under 12px and
// buttons under a finger's size.
import { fingers, openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({
  device: 'Galaxy S9+ landscape',
});
const touch = await fingers(context, page);
const canvas = page.getByLabel('Pixel canvas');

await openExample(page);
await page.keyboard.press('s');
const art = await canvas.boundingBox();
const at = (x, y) => [art.x + art.width * x, art.y + art.height * y];

await touch('touchStart', [at(0.3, 0.3)]);
await touch('touchMove', [at(0.5, 0.5)]);
await touch('touchMove', [at(0.7, 0.7)]);
await touch('touchEnd', []);
await page.waitForTimeout(600);
const bar = await page.locator('.selection-bar').boundingBox();
const shown = await canvas.boundingBox();

check(
  bar.y >= shown.y + shown.height - 1 || bar.y + bar.height <= shown.y + 1,
  `a short phone on its side keeps the selection’s bar off the art (${Math.round(bar.y)}–${Math.round(bar.y + bar.height)}, art ${Math.round(shown.y)}–${Math.round(shown.y + shown.height)})`,
);
await page.screenshot({ path: `${shots}/touch-sizes-landscape.png` });

// on a phone the dock opens a panel: a title that folds nothing takes no stop of the keys
const titleStops = await page.locator('.section > h2[tabindex]').count();

check(titleStops === 0, `a phone’s panel titles take no stop of the keys (${titleStops} do)`);

// a press a pixel past Undo's edge was Redo's, whose reach lay over the gap between them
const besideUndo = await page.evaluate(() => {
  const [undo, redo] = ['Undo', 'Redo'].map((name) =>
    document.querySelector(`#toolbar [aria-label="${name}"]`).getBoundingClientRect(),
  );
  const y = undo.top + undo.height / 2;
  const hit = (x) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label');

  return [hit(undo.right + 1), hit(redo.left - 1)].join();
});

check(besideUndo === 'Undo,Redo', `a press beside Undo or Redo is its own (${besideUndo})`);

// a tablet held wide has the desk's layout, under fingers
await page.setViewportSize({ width: 1194, height: 834 });
await page.waitForTimeout(600);
const small = await page.evaluate(() => {
  const words = [...document.querySelectorAll('.statusbar, .statusbar *, .wordmark small')]
    .filter((el) => el.offsetParent)
    .map((el) => parseFloat(getComputedStyle(el).fontSize))
    .filter((size) => size < 12);
  const buttons = [...document.querySelectorAll('#toolbar .btn')]
    .filter((el) => el.offsetParent)
    .map((el) => el.getBoundingClientRect())
    .filter((box) => box.width < 40 || box.height < 40);

  return { words: words.length, buttons: buttons.length };
});

check(
  small.words === 0 && small.buttons === 0,
  `held wide, a tablet’s words are 12px or more and its toolbar a finger wide (${small.words} words, ${small.buttons} buttons smaller)`,
);

// An iPad held wide fits the canvas a step larger by giving up the stage's margins: the band
// above it went too, and the Pose bar lay over the canvas's first rows.
await page.setViewportSize({ width: 1080, height: 810 });
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page
  .locator('[aria-label^="Pose"]')
  .first()
  .evaluate((button) => button.click());
await page
  .locator('.pose-bar')
  .getByRole('button', { name: /Cut into parts/ })
  .click();
await page.waitForTimeout(600);
await page.locator('.sheet .btn.primary').click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Fit', exact: true }).click();
await page.waitForTimeout(400);
const overArt = await page.evaluate(() => {
  const poseBar = document.querySelector('.pose-bar').getBoundingClientRect();
  const canvasBox = document.querySelector('[aria-label="Pixel canvas"]').getBoundingClientRect();

  return Math.round(poseBar.bottom - canvasBox.top);
});

check(
  overArt <= 0,
  `on an iPad held wide the Pose bar stays above the canvas (${overArt}px over it)`,
);
await page.screenshot({ path: `${shots}/touch-sizes-ipad-pose.png` });

await finish();
