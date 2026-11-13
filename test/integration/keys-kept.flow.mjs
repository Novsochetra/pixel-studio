// The bars are drawn again at every change: someone using the keys stays on the control they
// used, so Enter, the arrows and Tab go on from it. Before, the keys were left on nothing after
// almost every control of the page.
import { openStudio } from './harness.mjs';
import { openExample, openPanel } from './studio.mjs';

const { page, check, finish } = await openStudio();
const focused = () =>
  page.evaluate(() => {
    const element = document.activeElement;

    return element === document.body
      ? 'the page'
      : element.id || element.getAttribute('aria-label') || element.textContent.trim();
  });
const zoom = async () => Number((await page.locator('#toolbar').textContent()).match(/(\d+)%/)[1]);
await openExample(page);

const before = await zoom();
await page.getByRole('button', { name: 'Zoom in' }).focus();
await page.keyboard.press('Enter');
const once = await zoom();
await page.keyboard.press('Enter');
check(
  once > before && (await zoom()) > once && (await focused()).startsWith('Zoom in'),
  'Enter on Zoom in zooms again at the second press: the keys stay on the button',
);
await page.keyboard.press('Tab');
check((await focused()) !== 'the page', 'and Tab goes on to the control after it');

await page.locator('#fps').focus();
const fps = Number(await page.inputValue('#fps'));

for (let i = 0; i < 3; i++) {
  await page.keyboard.press('ArrowUp');
}

check(
  Number(await page.inputValue('#fps')) === fps + 3,
  'three arrow presses on the frame rate are three steps',
);
// each arrow was a step of its own to undo: a run of them is one, as a run of nudges is
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(150);
check(Number(await page.inputValue('#fps')) === fps, 'and one undo takes the run of them back');
await page.keyboard.press('Meta+Shift+z');
await page.waitForTimeout(150);

await page.locator('#rail button').nth(2).focus();
await page.keyboard.press('Enter');
check((await focused()) !== 'the page', 'a tool picked with Enter keeps the keys on the tools');

// after a click the keys are the editor's own: Space pans, and must not press a button again
await page.locator('#rail button').nth(3).click();
check((await focused()) === 'the page', 'a tool clicked leaves the keys to the canvas');

await openPanel(page, 'Guide');
const name = page.locator('.guide-row input[aria-label="Guide name"]').first();
await name.focus();
await page.keyboard.type('x');
await page.keyboard.press('Tab');
check(
  (await focused()).startsWith('guide-row-'),
  'Tab out of a guide’s name, changed, goes on to its row',
);
check((await name.inputValue()).endsWith('x'), 'and the new name is kept');

// Play draws its panel itself as it starts, and turns to Pause: the keys stay where it stood
await page.getByRole('button', { name: 'Play', exact: true }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check((await focused()) === 'Pause', 'Enter on Play leaves the keys on Pause');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check((await focused()) === 'Play', 'and a second Enter pauses');

await openPanel(page, 'Layers');
await page.locator('.layer-row').first().focus();
await page.keyboard.press('F2');
await page.keyboard.type('Sketch');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(
  (await focused()) !== 'the page' &&
    (await page.locator('.layer-name').first().textContent()) === 'Sketch',
  'a layer named with Enter keeps the keys on its row',
);

// the eye is in the layer's row: sent to the row, the keys left it and a second Enter did nothing
await page.getByRole('button', { name: 'New layer' }).click();
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const eye = page
  .locator('.layer-row')
  .last()
  .getByRole('button', { name: /^Hide / });
const lower = (await eye.getAttribute('aria-label')).replace('Hide ', '');

await eye.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check(
  (await focused()) === `Show ${lower}`,
  'Enter on a layer’s eye hides it, the keys still on the eye',
);
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check((await focused()) === `Hide ${lower}`, 'and a second Enter shows it again');

// Enter in a field clicked into ends the typing: left in the field, the next shortcut was typed
// after the colour's code
await openPanel(page, 'Colours');
await page.locator('#colour-hex').click();
await page.locator('#colour-hex').fill('#00ff00');
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
await page.keyboard.press('e');
check(
  (await page.inputValue('#colour-hex')) === '#00ff00' &&
    (
      await page.locator('#rail [aria-pressed="true"]').first().getAttribute('aria-label')
    ).startsWith('Eraser'),
  'after Enter in the colour’s code, E picks the Eraser and is not typed into the code',
);

// Escape left some fields with what was typed and others with what they held
await page.locator('#fps').focus();
const rate = await page.inputValue('#fps');

await page.keyboard.type('7');
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
check(
  (await page.inputValue('#fps')) === rate && (await focused()) === 'the page',
  'Escape leaves a field with what it held',
);

// with nothing left to undo, the keys went to Redo: the next Enter did the opposite
await page.locator('.cell-add').first().click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Undo' }).focus();

for (let i = 0; i < 12 && (await focused()).startsWith('Undo'); i++) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
}

check(
  !(await focused()).startsWith('Redo'),
  'when nothing is left to undo, the keys do not go to Redo',
);

// A window that draws itself again at each change dropped the keys onto the page behind it:
// a frame width typed and Tab pressed, and the next number could not be typed.
const fieldId = () => page.evaluate(() => document.activeElement?.id);

await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
await page.waitForTimeout(400);
await page.locator('#frame-width').focus();
await page.keyboard.press('ControlOrMeta+a');
await page.keyboard.type('70');
await page.keyboard.press('Tab');
check(
  (await fieldId()) === 'frame-height' && (await page.inputValue('#frame-width')) === '70',
  'in the sprite sheet’s window, Tab after a width typed goes on to the height',
);
await page.keyboard.type('110');
await page.keyboard.press('Tab');
check((await fieldId()) === 'anchor-x', 'and on from there');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.locator('.status-link').click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Top left' }).focus();
await page.keyboard.press('Tab');
await page.keyboard.press('Space');
check(
  (await focused()).startsWith('Top'),
  'the place picked for the art in Canvas size keeps the keys',
);
await page.keyboard.press('Escape');

// Deleted with Enter, a layer handed the keys to the next layer's Delete: Enter after Enter
// deleted layer after layer, nothing asked
await page.getByRole('button', { name: 'New layer' }).click();
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'New layer' }).click();
await page.keyboard.press('Escape');
await page.locator('.layer-row').first().click();
await page.keyboard.press('Escape');
const layersBefore = await page.locator('.layer-row').count();

await page.locator('.layer-bar button[aria-label^="Delete "]').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(
  (await page.locator('.layer-row').count()) === layersBefore - 1 &&
    !/^(Delete|Merge|Clear) /.test(await focused()) &&
    (await focused()) !== 'the page',
  `Enter on Delete layer leaves the keys on a control that deletes nothing (${await focused()})`,
);
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);

// with Move in hand the arrows move art, and Home and End in the list did nothing at all
await page.keyboard.press('t');
await page.locator('.layer-row').first().focus();
await page.keyboard.press('End');
await page.waitForTimeout(200);
check(
  (await page.locator('.layer-row').last().getAttribute('aria-current')) === 'true',
  'with Move in hand, End in the layers goes to the bottom layer',
);

await finish();
