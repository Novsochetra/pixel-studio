// Selecting pixel by pixel: drag over pixels to select them, Shift-drag to let them go, then do
// with them what any selection does.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const canvas = page.locator('.canvas-holder canvas');
const picture = () => canvas.evaluate((element) => element.toDataURL());
const bar = page.getByRole('toolbar', { name: 'Selection' });

async function over([x, y]) {
  const box = await canvas.boundingBox();
  const scale = box.width / 160;

  return [box.x + (x + 0.5) * scale, box.y + (y + 0.5) * scale];
}

async function drag(from, to, { shift = false } = {}) {
  if (shift) {
    await page.keyboard.down('Shift');
  }

  await page.mouse.move(...(await over(from)));
  await page.mouse.down();
  await page.mouse.move(...(await over(to)), { steps: 8 });
  await page.mouse.up();

  if (shift) {
    await page.keyboard.up('Shift');
  }

  await page.waitForTimeout(150);
}

await openExample(page);
await page.keyboard.press('+');
await page.keyboard.press('q');
check(
  (await page.getByRole('button', { name: /^Select pixels/ }).getAttribute('aria-pressed')) ===
    'true',
  'Q picks Select pixels',
);

const before = await picture();
await drag([70, 70], [90, 70]);
check(await bar.isVisible(), 'a drag over pixels selects them, and the selection bar shows');
await page.screenshot({ path: `${shots}/select-pixels.png` });
await drag([60, 70], [100, 70], { shift: true });
check(await bar.isHidden(), 'Shift and a drag let them go again');

await drag([70, 70], [90, 70]);
await page.keyboard.press('Meta+x');
await page.waitForTimeout(150);
const cut = await picture();
check(cut !== before, '⌘X cuts the pixels selected');
await page.keyboard.press('Meta+v');
await page.waitForTimeout(150);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check((await picture()) === before, '⌘V puts them back where they were');

await finish();
