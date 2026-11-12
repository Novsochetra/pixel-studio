// The largest canvas on a phone: whole above a sheet, at a quarter of its size, and what a
// frame deleted from one view says of a frame hidden from play.
import { fingers, openStudio } from './harness.mjs';
import { createProject, frameAction, selectFrame, selectView } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({ device: 'iPhone 13' });
const touch = await fingers(context, page);
const canvas = page.getByLabel('Pixel canvas');
const stroke = async (from, to) => {
  const art = await canvas.boundingBox();
  const at = ([x, y]) => [art.x + art.width * x, art.y + art.height * y];

  await touch('touchStart', [at(from)]);
  await touch('touchMove', [at([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2])]);
  await touch('touchMove', [at(to)]);
  await touch('touchEnd', []);
  await page.waitForTimeout(400);
};

await createProject(page, { kind: 'Character', name: 'Poster', width: 512 });
const shut = await canvas.boundingBox();

check(shut.width === 256, `the largest canvas is shown whole, at a half (${shut.width})`);
await page.locator('.dock-more').tap();
await page.waitForTimeout(700);
const up = await canvas.boundingBox();
const sheet = await page.locator('.grid-panel').boundingBox();

check(
  up.width === 128 && up.y + up.height <= sheet.y,
  `with a sheet up it is whole above the sheet, at a quarter (${up.width}, to ${Math.round(up.y + up.height)} of ${Math.round(sheet.y)})`,
);
await stroke([0.2, 0.2], [0.7, 0.7]);
check(
  await page.getByRole('button', { name: 'Undo', exact: true }).first().isEnabled(),
  'and a finger still draws on it there',
);

// Drawn at a quarter by leaving rows out, a stroke one pixel thick was on a row left out three
// times in four: in the art, and not on the screen.
const rowsShown = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    let rows = 0;

    for (let y = 0; y < element.height; y++) {
      let red = 0;

      for (let x = 0; x < element.width; x++) {
        const at = (y * element.width + x) * 4;

        red += data[at] > 180 && data[at + 1] < 90 && data[at + 2] < 90 ? 1 : 0;
      }

      rows += red > element.width / 3 ? 1 : 0;
    }

    return rows;
  });
const before = await rowsShown();

for (const down of [0.31, 0.42, 0.53, 0.64]) {
  await stroke([0.05, down], [0.95, down]);
}

check(
  (await rowsShown()) - before >= 4,
  `four thin strokes drawn at a quarter are all to be seen (${(await rowsShown()) - before} rows)`,
);
await page.screenshot({ path: `${shots}/phone-big.png` });

// A frame hidden from play is a place in every view. One view's frames moving up under it
// looked like the hidden frame coming back into play, and nothing said why.
await frameAction(page, 'Duplicate frame');
await frameAction(page, 'Duplicate frame');
await selectView(page, 'Side');
await selectFrame(page, 1);
await stroke([0.3, 0.3], [0.6, 0.6]);
await selectView(page, 'Front');
await selectFrame(page, 2);
await frameAction(page, 'Hide from play');
await selectFrame(page, 1);
await frameAction(page, 'Delete frame 2 from Front');
await page.waitForTimeout(300);
const said = (await page.locator('.toast').textContent()) ?? '';

check(
  said.includes('moved up a place') && said.includes('Frame 3 is still hidden'),
  `a frame deleted from one view says what became of the hidden one (${said})`,
);
await page.locator('.panel-close:visible').tap();
await page.waitForTimeout(700);
check(
  (await canvas.boundingBox()).width === 256,
  'the sheet shut, the canvas is at its half again',
);

// Held on its side a phone has no room under the canvas: a pin's bar lay over its last rows,
// and nothing scrolled them out. It is a card beside the canvas there.
await page.setViewportSize({ width: 750, height: 342 });
await page.waitForTimeout(600);
await page.keyboard.press('p');
await page.waitForTimeout(400);
const pin = await page.locator('.pin-bar').boundingBox();
const art = await canvas.boundingBox();
const beside = pin.x + pin.width <= art.x;
const under = Math.max(0, art.y + art.height - pin.y);
const scrolls = await page
  .locator('.edit-scroll')
  .evaluate((stage) => stage.scrollHeight - stage.clientHeight);

check(
  beside || scrolls >= under,
  `on its side the pin’s bar is beside the canvas, or the canvas scrolls out from under it (${Math.round(under)} under, ${scrolls} to scroll)`,
);
await page.screenshot({ path: `${shots}/phone-big-landscape.png` });

await finish();
