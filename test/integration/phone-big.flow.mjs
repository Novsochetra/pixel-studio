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

await finish();
