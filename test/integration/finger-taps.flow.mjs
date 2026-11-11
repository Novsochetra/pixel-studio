// Two fingers on the canvas are a pinch or a tap, never both: what zoomed the canvas takes no
// step back as well.
import { fingers, openStudio } from './harness.mjs';
import { createProject, paintedPixels } from './studio.mjs';

const { page, context, check, finish } = await openStudio({ device: 'Pixel 7' });
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const touch = await fingers(context, page);
const painted = async () => (await paintedPixels(canvas, 32)).length;
const zoom = async () => (await canvas.boundingBox()).width / 32;
const stage = await page.locator('.edit-scroll').boundingBox();
const apart = (gap) => [
  [stage.x + stage.width / 2 - gap, stage.y + stage.height / 2],
  [stage.x + stage.width / 2 + gap, stage.y + stage.height / 2],
];
const twoFingers = async (from, to = null) => {
  await touch('touchStart', apart(from).slice(0, 1));
  await touch('touchStart', apart(from));

  if (to) {
    await touch('touchMove', apart(to));
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(300);
};

const art = await canvas.boundingBox();
const at = (pixel) => art.x + (pixel + 0.5) * (art.width / 32);

await touch('touchStart', [[at(2), art.y + at(2) - art.x]]);

for (let i = 1; i <= 10; i++) {
  await touch('touchMove', [[at(2 + i), art.y + at(2 + i) - art.x]]);
}

await touch('touchEnd', []);
await page.waitForTimeout(250);
const drawn = await painted();

check(drawn === 11, 'a finger draws a stroke');

// Fingers spread a little are within a tap's reach, and far in that is enough to zoom a step:
// the canvas zoomed and the stroke was undone at once.
const fitted = await zoom();

await twoFingers(60, 67);
check(
  (await zoom()) > fitted && (await painted()) === drawn,
  `a small spread that zooms the canvas a step undoes nothing (zoom ${fitted} to ${await zoom()})`,
);
await twoFingers(60);
check((await painted()) === 0, 'two fingers that only tap undo the stroke');

await finish();
