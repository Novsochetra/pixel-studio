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

await finish();
