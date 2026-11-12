// The Team kits window on a frame with nothing drawn in it: its previews were blank, as if the
// kit had wiped the views. Each view shows its nearest drawn frame, and says which.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();

await openExample(page);
await page.mouse.move(2, 2);
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press('Alt+KeyN');
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Team kits…' }).click();
await page.waitForTimeout(400);

// the colours under the captions: a checkerboard and the guides alone are a handful
const coloursShown = await page
  .locator('.sheet canvas[aria-label="The views side by side"]')
  .evaluate((canvas) => {
    const { data } = canvas.getContext('2d').getImageData(0, 30, canvas.width, canvas.height - 30);
    const colours = new Set();

    for (let i = 0; i < data.length; i += 4) {
      colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    }

    return colours.size;
  });

check(
  coloursShown > 8,
  `on an empty frame the kit’s preview still shows the character (${coloursShown} colours)`,
);
await page.screenshot({ path: `${shots}/kits-preview-empty-frame.png` });

await finish();
