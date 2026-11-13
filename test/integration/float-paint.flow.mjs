// A moved selection floats over the art. Painted on as it floated, its next move put its own
// copy back: the paint, an eraser's work or a swap's colours were thrown away.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish } = await openStudio();
const canvas = page.getByLabel('Pixel canvas');

await openExample(page);
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const drag = async (from, to) => {
  await page.mouse.move(...at(...from));
  await page.mouse.down();
  await page.mouse.move(...at(...to), { steps: 6 });
  await page.mouse.up();
};
const colours = async () =>
  Number(
    (await page.locator('#statusbar span', { hasText: /colours?$/ }).textContent()).match(/\d+/)[0],
  );

await page.keyboard.press('s');
await drag([60, 50], [90, 80]);
await drag([75, 65], [78, 65]);
await page.fill('#colour-hex', '#12ab34');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.keyboard.press('b');
await drag([70, 60], [80, 60]);
const painted = await colours();

check(painted > 16, `the paint is a colour of its own in the art (${painted} colours)`);

await page.keyboard.press('s');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);
check(
  (await colours()) === painted,
  `paint on a floating piece moves with it (${painted} colours, then ${await colours()})`,
);

await finish();
