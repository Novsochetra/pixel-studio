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

await finish();
