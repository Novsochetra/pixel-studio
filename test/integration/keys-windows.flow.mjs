// The keys through the windows and the lists: a button that switches itself off keeps them, a
// window that draws itself again keeps them, a window hands them back, and the layers are
// moved and a folder is taken back with them.
import { openStudio } from './harness.mjs';
import { openExample, openPanel, waitSaved } from './studio.mjs';

const { page, check, finish } = await openStudio();
const focused = () =>
  page.evaluate(() => {
    const element = document.activeElement;

    return element === document.body
      ? 'the page'
      : element.id || element.getAttribute('aria-label') || element.textContent.trim();
  });
const canvas = page.locator('.canvas-holder canvas');
const layerNames = () => page.locator('.layer-row .layer-name').allTextContents();

await openExample(page);
const art = await canvas.boundingBox();

await page.mouse.click(art.x + 12, art.y + 12);
await page.waitForTimeout(200);

// Undo, with nothing left to undo, switched itself off under the keys: they fell to the page
await page.getByRole('button', { name: 'Undo', exact: true }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check((await focused()) === 'Undo', 'Undo keeps the keys when it has undone the last step');
check(
  (await page.evaluate(() => document.activeElement.getAttribute('aria-disabled'))) === 'true',
  'and says it is switched off',
);
await page.keyboard.press('Enter');
await page.keyboard.press('Tab');
check((await focused()) === 'Redo', 'Tab goes on from it to Redo');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check(
  (await page.locator('.toast').textContent()).includes('Redone'),
  'so the step is made again with the keys alone',
);

// an outline's row counts what it would change: at 0 it is off, and the keys were on the next
await openPanel(page, 'Outline');
const gaps = page.locator('.section[data-name="outline"] .list-action').nth(1);

await gaps.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(
  (await focused()).startsWith('Close gaps in the outline'),
  `an outline’s row keeps the keys after it has done its work (${await focused()})`,
);

// a window handed the keys back to the button that opened it only if the bar had not been drawn
await page.locator('#canvas-size-link').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
check(
  (await focused()) === 'canvas-size-link',
  'the canvas size window hands the keys back to its link',
);

// a window that draws itself again at each choice dropped the keys at each
await page.getByRole('button', { name: 'Team kits…' }).click();
await page.waitForTimeout(400);
await page.locator('#outfit-source').focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(200);
check(
  (await focused()) === 'outfit-source',
  'in Team kits the arrows walk the outfits, the keys still on the list',
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

if (await page.locator('.sheet').count()) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// a new layer named, then Tab: the list was drawn again under the control Tab was going to
await openPanel(page, 'Layers');
await page.getByRole('button', { name: 'New layer' }).focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await page.keyboard.type('Cape');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
check((await layerNames())[0] === 'Cape', 'a new layer is named as Tab leaves its name');
check((await focused()) !== 'the page', `and Tab goes on from it (${await focused()})`);

// the layers were moved by a drag alone
await page.locator('.layer-row', { hasText: 'Cape' }).focus();
const stacked = await layerNames();

await page.keyboard.press('Alt+ArrowDown');
await page.waitForTimeout(300);
check(
  (await layerNames())[1] === 'Cape' && (await layerNames())[0] === stacked[1],
  'Alt and ↓ move the layer down one',
);
await page.keyboard.press('Home');
await page.waitForTimeout(200);
check(
  (await page.locator('.layer-row[aria-current="true"] .layer-name').textContent()) === stacked[1],
  'Home goes to the top layer',
);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(300);
check((await layerNames())[0] === 'Cape', 'and the move is a step that undo takes back');

// a folder made and not wanted: Escape in its name left "New folder" behind
await waitSaved(page);
await page.locator('#projects-button').focus();
await page.keyboard.press('Enter');
await page.waitForSelector('.sheet .project-row');
await page.waitForTimeout(500);
await page.locator('.sheet .folders-new').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check((await focused()) === 'Folder name', 'a new folder is named at once');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
check(
  (await page.locator('.sheet .place', { hasText: 'New folder' }).count()) === 0,
  'Escape there takes the folder back',
);
check((await focused()).includes('New folder'), 'with the keys on New folder again');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.keyboard.type('Cast');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check(
  (await page.locator('.sheet .place', { hasText: 'Cast' }).count()) === 1 &&
    (await focused()) === 'Rename',
  `a folder named with Enter is kept, the keys on its Rename (${await focused()})`,
);

await finish();
