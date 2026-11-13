// Drawing from nothing: a blank icon, a colour from the basic ones and from the picker, the Line,
// Rectangle and Ellipse tools, and a canvas made bigger with the art kept where it stands.
import { openStudio } from './harness.mjs';
import { createProject, status, waitSaved } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const place = async () => {
  const art = await canvas.boundingBox();
  const [artWidth] = (await page.locator('#statusbar span').nth(1).textContent())
    .match(/\d+/g)
    .map(Number);

  return { art, zoom: art.width / artWidth, artWidth };
};
const at = async (x, y) => {
  const { art, zoom } = await place();

  return [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
};
const drag = async (from, to, keys = []) => {
  await page.mouse.move(...(await at(...from)));
  await page.mouse.down();

  for (const key of keys) {
    await page.keyboard.down(key);
  }

  await page.mouse.move(...(await at(...to)), { steps: 6 });
  await page.mouse.up();

  for (const key of keys) {
    await page.keyboard.up(key);
  }

  await page.mouse.move(2, 2);
};
// the art's pixels of one colour, read from the middle of each so the grid lines stay out of it
const pixels = async (hex) => {
  const { artWidth } = await place();

  return canvas.evaluate(
    (element, { colour, size }) => {
      const scale = element.width / size;
      const context = element.getContext('2d');
      const wanted = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16));
      const found = [];

      for (let y = 0; y < element.height / scale; y++) {
        for (let x = 0; x < size; x++) {
          const { data } = context.getImageData(
            Math.floor((x + 0.5) * scale),
            Math.floor((y + 0.5) * scale),
            1,
            1,
          );

          if (wanted.every((value, i) => data[i] === value)) {
            found.push(`${x},${y}`);
          }
        }
      }

      return found;
    },
    { colour: hex, size: artWidth },
  );
};
const tool = (name) => page.locator('#rail').getByRole('button', { name }).click();
const basic = page.getByRole('group', { name: 'Basic colours' });

check((await basic.getByRole('button').count()) >= 16, 'an empty project offers basic colours');
await basic.getByRole('button', { name: '#3d7fe0' }).click();
check((await page.inputValue('#colour-hex')) === '#3d7fe0', 'a basic colour is the one in hand');

await tool(/^Line/);
await drag([2, 2], [9, 2]);
check((await pixels('#3d7fe0')).length === 8, 'the Line tool draws from end to end');
await drag([2, 6], [9, 9], ['Shift']);
check(
  (await pixels('#3d7fe0')).filter((point) => point.endsWith(',6')).length === 8,
  'Shift holds a nearly flat line flat',
);
await page.keyboard.press('Meta+z');
check((await pixels('#3d7fe0')).length === 8, 'a shape is one undo step');

await page.locator('#colour-pick').evaluate((input) => {
  input.value = '#11aa33';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
check(
  (await page.inputValue('#colour-hex')) === '#11aa33' &&
    (await page.locator('#colour-pick').count()) === 1,
  'the colour picker sets the colour as it moves, without the panel drawn anew',
);
await page.locator('#colour-pick').evaluate((input) => {
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
});

await tool(/^Rectangle/);
await drag([12, 4], [19, 9]);
check((await pixels('#11aa33')).length === 24, 'the Rectangle tool draws its four sides');
await page.locator('#shape-filled').check();
await page.keyboard.press('c');
await drag([4, 14], [12, 22]);
const filled = await pixels('#11aa33');
check(
  filled.includes('8,18') && !filled.includes('4,14') && filled.length > 24 + 50,
  'with Filled shapes on, the Ellipse is solid and round at its corners',
);
check(/3 colours|2 colours/.test(await status(page)), 'the status bar counts the colours drawn');
await page.screenshot({ path: `${shots}/draw-shapes.png` });

await page.getByRole('button', { name: 'Swap colours…' }).click();
await page.getByRole('button', { name: 'Ice', exact: true }).click();
await page.keyboard.press('Escape');
check(
  (await page.getByRole('group', { name: 'Ice' }).getByRole('button').count()) === 8,
  'a palette added to the project shows in Colours at once, to draw with',
);

await page.getByRole('button', { name: /canvas$/ }).click();
await page.fill('#canvas-width', '');
await page.getByRole('button', { name: 'Change the size' }).click();
await page.waitForTimeout(300);
check(
  (await status(page)).includes('32×32 canvas') && (await pixels('#3d7fe0')).length === 8,
  'a size field left empty keeps the size the canvas has',
);

// the lock took the other colours out of the panel above it: its own switch moved up from under
// the pointer, and the next press there landed on another switch
const lockAt = () =>
  page.locator('#palette-lock').evaluate((lock) => Math.round(lock.getBoundingClientRect().top));
const unlocked = await lockAt();

await page.locator('#palette-lock').check();
check(
  (await lockAt()) === unlocked &&
    (await page.locator('.other-colours').evaluate((others) => others.inert)),
  'Palette lock stays where it was pressed, the other colours out of reach where they stood',
);
await page.getByRole('button', { name: /canvas$/ }).click();
await page.fill('#canvas-width', '48');
await page.fill('#canvas-height', '40');
await page.getByRole('button', { name: 'Bottom right', exact: true }).click();
await page.screenshot({ path: `${shots}/canvas-size.png` });
await page.getByRole('button', { name: 'Change the size' }).click();
await page.waitForFunction(() =>
  document.querySelector('#statusbar')?.textContent.includes('48×40 canvas'),
);
await page.waitForTimeout(300);
const moved = await pixels('#3d7fe0');
check(
  moved.length === 8 && moved.includes('18,10') && moved.includes('25,10'),
  'a bigger canvas keeps the art, moved with the corner it is kept at',
);
check(
  await page.locator('#palette-lock').isChecked(),
  'the drawing settings are as they were: Palette lock is still on',
);
check(/^Saved/.test(await waitSaved(page)), 'the resized project is saved');
await page.getByRole('button', { name: 'History' }).click();
await page.waitForSelector('.version-row', { timeout: 5000 }).catch(() => null);
check(
  (await page.locator('.version-row', { hasText: 'Before the canvas became 48×40' }).count()) === 1,
  'the project as it was is kept as a version',
);
await page.keyboard.press('Escape');

// a canvas of another size started the undo history afresh: neither it nor the strokes before
// it could be undone
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(500);
const back = await pixels('#3d7fe0');
check(
  (await status(page)).includes('32×32 canvas') && back.length === 8 && !back.includes('18,10'),
  'undo puts the canvas back at its size, the art where it was',
);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(300);
check(
  (await page.locator('.toast').textContent()).startsWith('Undone: '),
  'and what was done before it can still be undone',
);
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.waitForTimeout(500);
check(
  (await status(page)).includes('48×40 canvas') &&
    JSON.stringify(await pixels('#3d7fe0')) === JSON.stringify(moved),
  'redo makes the canvas the new size again',
);
check(/^Saved/.test(await waitSaved(page)), 'which is saved again');
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(500);
check((await status(page)).includes('48×40 canvas'), 'the new size is there after a reload');
check((await pixels('#3d7fe0')).length === 8, 'and so is the art');

// "Paint only over" names the blue: Fill on a clear pixel changes nothing and says why
await page.selectOption('#paint-over', { label: '#3d7fe0' });
await page.keyboard.press('g');
await page.mouse.click(...(await at(2, 2)));
check(
  (await page.locator('.toast').textContent()).startsWith('Paint only over is set to #3d7fe0'),
  'Fill on another colour than "Paint only over" names says why nothing changed',
);
check((await pixels('#3d7fe0')).length === 8, 'and the art is as it was');

// the picker on a clear pixel did nothing, and said nothing
await page.keyboard.press('i');
await page.mouse.click(...(await at(2, 2)));
await page.waitForTimeout(150);
check(
  (await page.locator('.toast').textContent()).startsWith('Nothing is drawn there'),
  'the colour picker on a clear pixel says there is nothing to pick',
);

// Enter twice in the field while the change was under way made a second step that changed
// nothing: the first undo seemed to do nothing
await page.getByRole('button', { name: /canvas$/ }).click();
await page.fill('#canvas-width', '50');
await page.locator('#canvas-width').evaluate((input) => {
  for (let i = 0; i < 2; i++) {
    input.dispatchEvent(new globalThis.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }
});
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(300);
check(
  (await status(page)).includes('48×40 canvas'),
  'Enter pressed twice changes the size once: one undo takes it back',
);

// Sorted by how much each was used, the art's swatches changed places at a stroke, and the
// colour under the finger was another one at its next press.
const swatchOrder = () =>
  page
    .locator('[aria-label="The art\'s colours"] .swatch')
    .evaluateAll((swatches) => swatches.map((swatch) => swatch.title));
const before = await swatchOrder();

await page.selectOption('#paint-over', { label: 'Any pixel' });
await page.locator('[aria-label="The art\'s colours"] .swatch').last().click();
await page.keyboard.press('g');
await page.mouse.click(...(await at(2, 2)));
await page.waitForTimeout(200);
check(
  (await swatchOrder()).join() === before.join(),
  `a colour made the most used keeps its place among the swatches (${before.at(-1)})`,
);

await finish();
