// A click on the art picks its layer, and a selection turns freely: by its handle, by its angle,
// and back again with nothing worn away.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const status = page.locator('#statusbar');
const box = await canvas.boundingBox();
const zoom = box.width / 160;
const at = (x, y) => [box.x + (x + 0.5) * zoom, box.y + (y + 0.5) * zoom];
const picture = () => canvas.evaluate((element) => element.toDataURL());
const onLayer = async (name) => (await status.textContent()).includes(`· ${name}`);
const click = async (x, y) => {
  await page.mouse.click(...at(x, y));
  await page.waitForTimeout(150);
};
const drag = async (from, to, shift = false) => {
  await page.mouse.move(...at(...from));
  await page.mouse.down();

  if (shift) {
    await page.keyboard.down('Shift');
  }

  await page.mouse.move(...at(...to), { steps: 6 });

  if (shift) {
    await page.keyboard.up('Shift');
  }

  await page.mouse.up();
  await page.waitForTimeout(150);
};

await page.getByRole('button', { name: 'New layer', exact: true }).click();
await page.keyboard.type('Hat');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await drag([10, 10], [30, 10]);
check(await onLayer('Hat'), 'the new layer is the one being edited');

await page.keyboard.press('s');
await click(80, 60);
check(await onLayer('Art'), 'a click on the character picks its layer');
await click(20, 10);
check(await onLayer('Hat'), 'a click on what the new layer holds picks that');
await click(150, 150);
check(await onLayer('Hat'), 'a click on empty canvas keeps the layer');

await page.keyboard.press('w');
await click(80, 60);
check(await onLayer('Art'), 'the colour selection picks the layer it clicks too');
await page.getByRole('button', { name: 'Done' }).click();

await page.keyboard.press('t');
await click(150, 150);
check(await onLayer('Art'), 'Move layer keeps the layer on a press on empty canvas');
const beforeMove = await picture();
await drag([20, 10], [20, 14]);
check(await onLayer('Hat'), 'a press on pixels of another layer picks it to move');
check((await picture()) !== beforeMove, 'and the drag moves that layer');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
await page.locator('.layer-row', { hasText: 'Art' }).click();
await page.waitForTimeout(150);
const artAt = [80, 60];
await drag(artAt, artAt);
check(await onLayer('Art'), 'a press on its own pixels keeps the layer');

await page.keyboard.press('s');
await drag([60, 60], [100, 90]);
const first = await picture();
const angle = page.locator('#selection-angle');
check((await angle.inputValue()) === '0', 'a selection starts unturned');

const handleGap = 14 / zoom;
await drag([80, 60 - handleGap], [105, 50]);
const turned = Number(await angle.inputValue());
check(turned > 0, `dragging its handle turns it (${turned}°)`);
check((await picture()) !== first, 'and the canvas shows it');
await page.screenshot({ path: `${shots}/selection-turned.png` });

await angle.fill('30');
await angle.press('Enter');
await page.waitForTimeout(150);
check((await angle.inputValue()) === '30', 'an angle can be typed');
await angle.blur();
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
check((await angle.inputValue()) === '0', 'undo ends the turn');
await page.getByRole('button', { name: 'Done' }).click();
await page.waitForTimeout(100);
await drag([60, 60], [100, 90]);
check((await picture()) === first, 'and undo puts the pixels back');

await angle.fill('47');
await angle.press('Enter');
await page.waitForTimeout(150);
await angle.fill('-112');
await angle.press('Enter');
await page.waitForTimeout(150);
check((await picture()) !== first, 'turned again');
await angle.fill('0');
await angle.press('Enter');
await page.waitForTimeout(150);
check((await picture()) === first, 'back at 0° nothing has worn away');

await finish();
