// What a walk through the tools, importing and exporting met: a height typed taller than the
// canvas, art on a canvas made taller, a layer nudged key after key, a tablet's Lasso bar.
import { readFileSync } from 'node:fs';
import { openStudio } from './harness.mjs';
import {
  cleanReport,
  createProject,
  dropImage,
  openExample,
  openPanel,
  projectsPage,
} from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const [, images] = process.argv.slice(2);
// the rows the art spans, as the status bar says them: "sprite 51×98, rows 31–128"
const art = async () => {
  const said = await page.locator('#statusbar span', { hasText: 'rows' }).textContent();
  const [, top, bottom] = said.match(/rows (\d+)–(\d+)/) ?? [];

  return { top: Number(top), bottom: Number(bottom) };
};

// a note dropped with a picture: the first file of all was taken, and nothing was cleaned
await createProject(page, { kind: 'Character', name: 'Dropped', width: 64 });
const both = await page.evaluateHandle(
  ([bytes]) => {
    const data = new DataTransfer();

    data.items.add(new File(['notes'], 'notes.txt', { type: 'text/plain' }));
    data.items.add(new File([new Uint8Array(bytes)], 'front.png', { type: 'image/png' }));

    return data;
  },
  [[...readFileSync(`${images}/front.png`)]],
);

await page.dispatchEvent('#stage', 'drop', { dataTransfer: both });
await cleanReport(page);
check(
  (await page.getByRole('button', { name: 'Use for Front' }).count()) === 1,
  'a picture dropped with a note is the one cleaned',
);
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(400);

// two guides added one after the other were both "Guide", the second hidden under the first
await openPanel(page, 'Guides');
await page.getByRole('button', { name: /Add (a )?guide/ }).click();
await page.getByRole('button', { name: /Add (a )?guide/ }).click();
await page.waitForTimeout(200);
const added = await page
  .locator('.guide-row input[aria-label="Guide name"]')
  .evaluateAll((fields) =>
    fields.map((field) => field.value).filter((name) => name.startsWith('Guide')),
  );

check(
  added.length === 2 && new Set(added).size === 2,
  `two guides added have names of their own (${added.join(', ')})`,
);

// The canvas size window said art outside a smaller canvas is cut off, and showed none of it:
// it shows the frame on the canvas asked for, as it is typed
await page.locator('#canvas-size-link').click();
await page.waitForTimeout(300);
const shownAt = () =>
  page.locator('.size-preview canvas').evaluate((picture) => [picture.width, picture.height]);
const before = await shownAt();

await page.fill('#canvas-width', '32');
await page.locator('#canvas-width').dispatchEvent('input');
await page.waitForTimeout(200);
const after = await shownAt();

check(
  before[0] / before[1] === 1 && after[0] / after[1] === 0.5,
  `the canvas size window shows the canvas asked for (${before} to ${after})`,
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// A height taller than the canvas has room for put the art's head above its top, cut off, and
// the report said it was scaled to fit.
await page.locator('button.wordmark').click();
await page.waitForSelector('.sheet .projects-nav');
await projectsPage(page, 'New project');
await createProject(page, { kind: 'Character', name: 'Tall ask', width: 64 });
await dropImage(page, `${images}/front.png`, 'front.png');
await cleanReport(page);
await page.fill('#import-height', '100');
await page.getByRole('button', { name: 'Clean again' }).click();
await page.waitForTimeout(600);
await cleanReport(page);
check(
  (await page.locator('#import-grow').count()) === 1,
  'a height the canvas has no room for is offered a canvas that has it',
);
await page.getByRole('button', { name: 'Use for Front' }).click();
await page.waitForTimeout(400);
const whole = await art();

check(whole.top > 0, `the art is whole on the canvas, its head under the top (${whole.top})`);

// A canvas made taller moved the Feet guide to its new row, and art cleaned there stood on the
// row the kind's share of the height gave: above its feet.
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(300);
await dropImage(page, `${images}/front.png`, 'front.png');
await cleanReport(page);
await page.locator('#import-grow').click();
await page
  .waitForFunction(
    () => document.querySelector('pre.report')?.textContent.includes('pixel size'),
    null,
    { timeout: 25000 },
  )
  .catch(() => null);
await page.getByRole('button', { name: /^Use for/ }).click();
await page.waitForTimeout(400);
await openPanel(page, 'Guides');
const feetRow = Number(await page.locator('input[aria-label="Feet row"]').inputValue());
const standing = await art();

check(
  Math.abs(standing.bottom - feetRow) <= 1,
  `on a canvas made taller the art stands on the Feet guide (${standing.bottom}, guide ${feetRow})`,
);
await page.screenshot({ path: `${shots}/tools-import-feet.png` });

// the Move tool's arrow keys made a step of every press, where a selection's made one of a run
await page.locator('button.wordmark').click();
await page.waitForSelector('.sheet .projects-nav');
await projectsPage(page, 'New project');
await openExample(page);
await page.keyboard.press('t');
await page.mouse.move(2, 2);

for (let press = 0; press < 3; press++) {
  await page.keyboard.press('ArrowDown');
}

await page.waitForTimeout(200);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(200);
check(
  !(await page.getByRole('button', { name: 'Undo', exact: true }).first().isEnabled()),
  'three nudges of a layer, key after key, are one step to undo',
);

await finish();
