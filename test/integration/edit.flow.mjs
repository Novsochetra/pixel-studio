// Editing a character: drawing and undo, layers, selection, pins, zoom and pan, the panels and the
// sheets they open, and saved versions.
import { openStudio } from './harness.mjs';
import { openExample, openPanel, waitSaved } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
// the canvas's pixels, summed into one number: equal art gives an equal sum
const pixels = () =>
  canvas.evaluate((element) => {
    const { data } = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    let sum = element.width * 31 + element.height;

    for (let i = 0; i < data.length; i += 1) {
      sum = (sum * 33 + data[i]) % 2147483647;
    }

    return sum;
  });
const colours = () => page.locator('#statusbar span').nth(3).textContent();

const plain = await pixels();
await page.mouse.move(...at(5, 5));
await page.mouse.down();
await page.mouse.move(...at(40, 20), { steps: 10 });
await page.mouse.up();
check((await pixels()) !== plain, 'the pencil draws');
check(
  /^Edited|^Saving/.test(await page.locator('.save-status').textContent()),
  'and the project is saved',
);
await page.keyboard.press('Meta+z');
check((await pixels()) === plain, '⌘Z undoes the stroke');
await page.keyboard.press('Meta+Shift+z');
check((await pixels()) !== plain, '⇧⌘Z redoes it');
await page.keyboard.press('Meta+z');

const layerNames = () => page.locator('.layer-row .layer-name').allTextContents();
check(
  (await page.locator('.layer-row .layer-thumb').count()) === 1,
  'the layers panel is open, the art layer shown with its thumbnail',
);
await page.getByRole('button', { name: 'New layer', exact: true }).click();
check(
  (await page.evaluate(() => document.activeElement.getAttribute('aria-label'))) === 'Layer name',
  'a new layer waits for its name, as in an image editor',
);
await page.keyboard.type('Hair');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(JSON.stringify(await layerNames()) === '["Hair","Art"]', 'named Hair, on top of the art');
await page.getByRole('button', { name: 'Duplicate layer' }).click();
check(
  JSON.stringify(await layerNames()) === '["Hair copy","Hair","Art"]',
  'Duplicate puts a copy just above',
);
await page.getByRole('button', { name: /^Merge down/ }).click();
check(JSON.stringify(await layerNames()) === '["Hair","Art"]', 'Merge down makes the two one');
const rows = page.locator('.layer-row');
const [hairRow, artRow] = [await rows.nth(0).boundingBox(), await rows.nth(1).boundingBox()];
await page.mouse.move(hairRow.x + hairRow.width / 2, hairRow.y + hairRow.height / 2);
await page.mouse.down();
await page.mouse.move(artRow.x + artRow.width / 2, artRow.y + artRow.height - 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
check(JSON.stringify(await layerNames()) === '["Art","Hair"]', 'a drag puts Hair under the art');
await page.getByRole('button', { name: 'Hide Art' }).click();
check(
  (await page.locator('.layer-row', { hasText: 'Hidden' }).count()) === 1,
  'a hidden layer says so',
);
await page.getByRole('button', { name: 'Show Art' }).click();
await page.locator('.layer-row', { hasText: 'Hair' }).click();
await page.getByRole('button', { name: 'Delete Hair' }).click();
check(JSON.stringify(await layerNames()) === '["Art"]', 'and a layer can be deleted');
await page.getByRole('button', { name: 'Delete Art' }).click();
check((await rows.count()) === 1, 'but never the last layer of art');

await page.keyboard.press('s');
await page.mouse.move(...at(50, 60));
await page.mouse.down();
await page.mouse.move(...at(70, 95), { steps: 5 });
await page.mouse.up();
check(await page.locator('.selection-bar').isVisible(), 'a selection shows its bar');
await page.keyboard.press('ArrowUp');
await page.getByRole('button', { name: 'Flip ↔' }).click();
await page.getByRole('button', { name: '⟳ 90°' }).click();
await page.getByRole('button', { name: 'Done' }).click();
check(await page.locator('.selection-bar').isHidden(), 'Done lets go of it');
await page.keyboard.press('Meta+z');
await page.keyboard.press('Meta+z');
await page.keyboard.press('Meta+z');

const unselected = await pixels();
await page.keyboard.press('s');
await page.mouse.move(...at(50, 60));
await page.mouse.down();
await page.mouse.move(...at(70, 95), { steps: 5 });
await page.mouse.up();
await page.keyboard.press('Meta+Backspace');
check((await pixels()) !== unselected, '⌘⌫ erases the selection, as a Mac deletes');
await page.keyboard.press('Meta+Escape');
check(await page.locator('.selection-bar').isHidden(), '⌘Esc lets go of it');
await page.keyboard.press('Meta+z');
check((await pixels()) === unselected, 'and undo brings the pixels back');

await page.keyboard.press('v');
check(
  (await page
    .getByRole('button', { name: /Move the whole frame/ })
    .getAttribute('aria-pressed')) === 'true',
  'V picks the tool that moves the whole frame',
);
const unmoved = await pixels();
await page.keyboard.press('ArrowLeft');
check((await pixels()) !== unmoved, 'an arrow key moves the whole frame');
await page.keyboard.press('Meta+z');
check((await pixels()) === unmoved, 'in one undo step');
await page.mouse.move(...at(80, 80));
await page.mouse.down();
await page.mouse.move(...at(90, 84), { steps: 5 });
check((await pixels()) !== unmoved, 'a drag shows the frame moving');
await page.mouse.up();
await page.keyboard.press('Meta+z');
check((await pixels()) === unmoved, 'and letting go moves it, one undo step too');
await page.keyboard.press('b');

await page.getByRole('button', { name: 'Zoom in' }).click();
await page.getByRole('button', { name: 'Fit' }).click();
check(
  (await canvas.boundingBox()).width === art.width,
  'Fit brings back the zoom that fills the window',
);

await page.keyboard.press('p');
await page.mouse.click(...at(80, 40));
check((await page.locator('#pin-name').count()) === 1, 'the pin tool offers which pin to place');
await page.keyboard.press('b');

const zoomBefore = await page.locator('.zoom-label').textContent();
await page.mouse.move(art.x + 100, art.y + 100);
await page.keyboard.down('Meta');
await page.mouse.wheel(0, -240);
await page.keyboard.up('Meta');
await page.waitForTimeout(200);
check(
  (await page.locator('.zoom-label').textContent()) !== zoomBefore,
  '⌘ + scroll zooms around the pointer',
);
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('+');
}

const scrolled = () =>
  page.locator('.edit-scroll').evaluate((element) => element.scrollLeft + element.scrollTop);
const before = await scrolled();
await page.keyboard.down(' ');
await page.mouse.move(art.x + 300, art.y + 300);
await page.mouse.down();
await page.mouse.move(art.x + 150, art.y + 200, { steps: 4 });
await page.mouse.up();
await page.keyboard.up(' ');
check((await scrolled()) !== before, 'space and drag pans the canvas');
check(
  await page.locator('.grid-panel').isVisible(),
  'the frames stay docked below while zoomed in',
);

await page.keyboard.press('?');
check((await page.locator('.shortcut').count()) > 15, '? lists the shortcuts');
await page.keyboard.press('Escape');
await page.locator('section[data-name="guides"] > h2').click();
check(
  (await page.locator('section[data-name="guides"]').getAttribute('data-collapsed')) === 'false',
  'a folded panel opens from its title',
);
await page.locator('section[data-name="guides"] > h2').focus();
await page.keyboard.press('Enter');
check(
  (await page.locator('section[data-name="guides"]').getAttribute('data-collapsed')) === 'true',
  'and Enter on the title folds it away again',
);
await openPanel(page, 'Outline');

const coloursBefore = await colours();
await page.getByRole('button', { name: 'Team kits…' }).click();
await page.selectOption('#outfit-source', 'team:brazil');
await page.getByRole('button', { name: 'Wear it (whole character)' }).click();
await page.waitForTimeout(300);
check((await pixels()) !== plain, 'a team kit recolours the character');
await page.keyboard.press('Meta+z');
check((await colours()) === coloursBefore, 'and undo takes it off');
await page.getByRole('button', { name: 'Swap colours…' }).click();
await page.getByRole('button', { name: 'Make an 8-colour palette from the art' }).click();
await page.waitForTimeout(400);
check((await page.locator('.sheet .swatch').count()) >= 8, 'swap colours makes a palette');
await page.keyboard.press('Escape');
await page.getByRole('button', { name: /Thin a doubled outline/ }).click();
check((await page.locator('.toast').count()) === 1, 'the outline tools report what they did');
await page.getByRole('button', { name: 'Silhouette' }).click();
check((await pixels()) !== plain, 'the silhouette view shows one flat shape');
await page.getByRole('button', { name: 'Colour', exact: true }).click();
await page.keyboard.press('m');
check(
  (await page.getByRole('button', { name: 'Symmetry' }).first().getAttribute('aria-pressed')) ===
    'true',
  'M turns on symmetry',
);
await page.keyboard.press('m');

const kept = await pixels();
await page.getByRole('button', { name: 'History' }).click();
await page.fill('#version-name', 'Before experiments');
await page.getByRole('button', { name: 'Save a version' }).click();
await page.waitForTimeout(600);
check(
  (await page.locator('.sheet .version-row', { hasText: 'Before experiments' }).count()) === 1,
  'a version can be kept by name',
);
await page.keyboard.press('Escape');
await page.mouse.click(...at(10, 10));
await page.getByRole('button', { name: 'History' }).click();
await page
  .locator('.version-row', { hasText: 'Before experiments' })
  .getByRole('button', { name: 'Go back to this' })
  .click();
await page.waitForTimeout(800);
check((await pixels()) === kept, 'and going back to it restores the art');
await page.screenshot({ path: `${shots}/edit.png` });
check((await waitSaved(page)).startsWith('Saved'), 'everything ends up saved');

await finish();
