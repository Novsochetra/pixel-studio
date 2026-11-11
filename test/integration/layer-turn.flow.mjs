// The Move tool turns what it moves: by the handle above the art or by its angle, and back again
// with nothing worn away.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const box = await canvas.boundingBox();
const zoom = box.width / 160;
const at = (x, y) => [box.x + (x + 0.5) * zoom, box.y + (y + 0.5) * zoom];
const picture = () => canvas.evaluate((element) => element.toDataURL());
const angle = page.locator('#layer-angle');
const row = (name) => page.locator('.layer-row', { hasText: name });
const undo = async () => {
  await page.keyboard.press('Meta+z');
  await page.waitForTimeout(150);
};
const drag = async (from, to, shift = false) => {
  await page.mouse.move(...at(...from));
  await page.mouse.down();

  if (shift) {
    await page.keyboard.down('Shift');
  }

  await page.mouse.move(...at(...to), { steps: 8 });

  if (shift) {
    await page.keyboard.up('Shift');
  }

  await page.mouse.up();
  await page.waitForTimeout(150);
};
const setAngle = async (value) => {
  await angle.fill(String(value));
  await angle.press('Enter');
  await page.waitForTimeout(150);
  // in a field ⌘Z undoes the typing, not the turn
  await angle.blur();
};
const eye = async (verb, name) => {
  await page.getByRole('button', { name: `${verb} ${name}`, exact: true }).click();
  await page.waitForTimeout(100);
};
const artAlone = async () => {
  await eye('Hide', 'Bar');
  const sum = await picture();

  await eye('Show', 'Bar');

  return sum;
};

await page.getByRole('button', { name: 'New layer', exact: true }).click();
await page.keyboard.type('Bar');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await drag([20, 40], [20, 60]);
check(await angle.isHidden(), 'the Pencil shows no angle to turn');

await page.keyboard.press('t');
check((await angle.inputValue()) === '0', 'T shows the angle of the layer, at first 0');
const upright = await picture();

const knob = [20, 40 - 14 / zoom];
const artBefore = await artAlone();

await page.mouse.move(...at(...knob));
await page.mouse.down();
await page.mouse.move(...at(40, 50), { steps: 8 });
check(Number(await angle.inputValue()) > 45, 'a drag on the handle turns the layer as it goes');
await page.screenshot({ path: `${shots}/layer-turn-drag.png` });
await page.mouse.up();
await page.waitForTimeout(150);
const turned = Number(await angle.inputValue());

check(turned > 45 && turned <= 90, 'letting go keeps the angle it reached');
check((await picture()) !== upright, 'and the art has turned');
check((await artAlone()) === artBefore, 'and the layer left out has not');

await undo();
await undo();
await undo();
check((await picture()) === upright, 'undo puts the layer back');
check((await angle.inputValue()) === '0', 'and the angle back at 0');

await drag(knob, [32, 34], true);
const stepped = Number(await angle.inputValue());

check(stepped !== 0 && stepped % 15 === 0, 'Shift turns it in steps of 15°');
await undo();
check((await picture()) === upright, 'and that turn is one undo step');

await setAngle(30);
check((await picture()) !== upright, 'typing an angle turns the layer');
check(await angle.isVisible(), 'and the field stays');
await setAngle(77);
await setAngle(0);
check((await picture()) === upright, 'back to 0 nothing has worn away');
await undo();
await undo();
await undo();

await row('Art').click({ modifiers: ['Meta'] });
await page.waitForTimeout(100);
const bothUpright = await picture();

await setAngle(10);
check((await picture()) !== bothUpright, 'layers picked together turn together');
await page.screenshot({ path: `${shots}/layer-turn-group.png` });
await undo();
check((await picture()) === bothUpright, 'in one undo step');

await row('Bar').click();
await eye('Hide', 'Bar');
check(await angle.isHidden(), 'a hidden layer shows no angle to turn');
await eye('Show', 'Bar');

await page.keyboard.press('s');
await drag([100, 100], [120, 120]);
check(await angle.isHidden(), 'a selection has its own angle instead');
check(await page.locator('#selection-angle').isVisible(), 'in the bar of the selection');
await page.keyboard.press('t');
check(await page.locator('#selection-angle').isVisible(), 'which T keeps while it is selected');
await page.keyboard.press('Escape');
check(await angle.isVisible(), 'and letting go brings back the angle of the layer');

// At a Tab the field said its change, and Chrome said it again as the bar was drawn anew: the
// art was turned twice, in two steps, and worn by the second.
const beforeTab = await picture();

await angle.click();
await angle.fill('20');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
check((await angle.inputValue()) === '20', 'an angle typed and left with Tab turns the layer once');
await undo();
check((await picture()) === beforeTab, 'in one undo step');

// A short window has no band above the canvas: the bar lay over the art's head and over the
// handle, which then could not be taken hold of.
await page.setViewportSize({ width: 1100, height: 700 });
await page.waitForTimeout(400);
const art = await canvas.boundingBox();
const bar = await page.locator('.layer-turn-bar').boundingBox();

check(
  bar.y >= art.y + art.height / 2 && bar.x + bar.width <= art.x + art.width / 4,
  'in a short window the bar stands in a corner at the canvas’s foot, clear of the handle',
);
await page.screenshot({ path: `${shots}/layer-turn-short.png` });
await finish();
