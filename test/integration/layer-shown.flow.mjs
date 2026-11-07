// Showing and hiding a layer belongs to one frame: its copy, the frame it came from, undo, reopening.
import { openStudio } from './harness.mjs';
import { frameAction, openExample, selectFrame, waitSaved } from './studio.mjs';

const { page, check, finish } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const hairHidden = async () =>
  (await page.locator('.layer-row', { hasText: 'Hair' }).getAttribute('data-hidden')) === 'true';
const pixels = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    let sum = element.width * 31 + element.height;

    for (let i = 0; i < data.length; i += 1) {
      sum = (sum * 33 + data[i]) % 2147483647;
    }

    return sum;
  });

await page.getByRole('button', { name: 'New layer', exact: true }).click();
await page.keyboard.type('Hair');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await page.mouse.move(...at(5, 5));
await page.mouse.down();
await page.mouse.move(...at(30, 15), { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(150);
const withHair = await pixels();

await frameAction(page, 'Duplicate frame');
await page.getByRole('button', { name: 'Hide Hair', exact: true }).click();
await page.waitForTimeout(150);
check(await hairHidden(), 'the eye hides the layer on the copied frame');
check((await pixels()) !== withHair, 'and the frame no longer draws it');

await selectFrame(page, 0);
check(!(await hairHidden()), 'the frame it was copied from still shows the layer');
check((await pixels()) === withHair, 'and still draws it');

await selectFrame(page, 1);
check(await hairHidden(), 'back on the copy, the layer is still hidden');

await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
check(!(await hairHidden()), 'undo shows it again');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(150);
check(await hairHidden(), 'redo hides it again, on this frame');

await page.waitForTimeout(1500);
await waitSaved(page);
await page.reload();
await page.waitForTimeout(1500);
await selectFrame(page, 1);
check(await hairHidden(), 'after reopening, the copy still hides it');
await selectFrame(page, 0);
check(!(await hairHidden()), 'and the first frame still shows it');
await finish();
