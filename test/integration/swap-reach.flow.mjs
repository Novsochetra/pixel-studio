// Swap colours and palette lock across frames: a colour drawn only in another frame could not be
// swapped, though Apply to all recoloured it; each swatch of a row was a stop of the keys; and a
// colour the art had lost stayed in hand under palette lock, and was painted.
import { openStudio } from './harness.mjs';
import { openExample, selectFrame } from './studio.mjs';

const { page, check, finish } = await openStudio();
const canvas = page.getByLabel('Pixel canvas');
const stroke = async () => {
  const art = await canvas.boundingBox();

  await page.mouse.move(art.x + art.width * 0.1, art.y + art.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(art.x + art.width * 0.3, art.y + art.height * 0.1, { steps: 6 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
};

await openExample(page);
await page.mouse.move(2, 2);
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('Alt+KeyN');
await page.waitForTimeout(200);
await page.fill('#colour-hex', '#7a2aa6');
await page.keyboard.press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('b');
await stroke();
await selectFrame(page, 0);
await page.getByRole('button', { name: 'Swap colours…' }).click();
await page.getByRole('button', { name: 'Make an 8-colour palette from the art' }).click();
await page.waitForTimeout(400);
check(
  (await page.locator('.sheet .map-row', { hasText: '#7a2aa6' }).count()) === 1,
  'from frame 1, Swap colours lists a colour drawn only in frame 2',
);

await page.locator('.sheet .target-picker').first().locator('[tabindex="0"]').focus();
await page.keyboard.press('ArrowRight');
const walked = await page.evaluate(() => document.activeElement.closest('.target-picker'));
await page.keyboard.press('Tab');
const rows = await page.evaluate(() => {
  const pickers = [...document.querySelectorAll('.sheet .target-picker')];

  return pickers.indexOf(document.activeElement.closest('.target-picker'));
});
check(
  walked !== null && rows === 1,
  'the arrows walk a row’s choices, and Tab goes to the next row',
);
// a choice of what a colour becomes is kept with the project: undo passed over it
await page.locator('.sheet .target-picker').nth(1).locator('.swatch').last().click();
await page.keyboard.press('Escape');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(
  (await page.locator('.toast').textContent()).startsWith('Undone: Swap #'),
  'undo takes back a choice in the swap before the palette it was made in',
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);

await selectFrame(page, 1);
await page.locator('#palette-lock').check();
await page.keyboard.press('Meta+a');
await page.keyboard.press('Delete');
await page.keyboard.press('Escape');
await page.keyboard.press('b');
await stroke();
check(
  (await page.inputValue('#colour-hex')) !== '#7a2aa6' &&
    (await page.locator('.toast').textContent()).startsWith('Palette lock'),
  'under palette lock a colour the art no longer has gives way, and the change is said',
);

await finish();
