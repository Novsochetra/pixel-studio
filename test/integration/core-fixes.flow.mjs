// Bugs a tester found in the core of the editor: a hidden layer changed unseen, the turn handle
// taking a drag meant to move, a quarter turn cut at the canvas's edge, the picker blind to
// other layers, keys left on a pull-down, a frame drag that could not be taken back.
import { openStudio } from './harness.mjs';
import { createProject, frameLabels, paintedPixels } from './studio.mjs';

const { page, check, finish } = await openStudio();
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const painted = async () => (await paintedPixels(canvas, 32)).length;
const at = async (x, y) => {
  const box = await canvas.boundingBox();
  const zoom = box.width / 32;

  return [box.x + (x + 0.5) * zoom, box.y + (y + 0.5) * zoom];
};
const drag = async (from, to) => {
  await page.mouse.move(...(await at(...from)));
  await page.mouse.down();
  await page.mouse.move(...(await at(...to)), { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};
const keys = async (...pressed) => {
  for (const key of pressed) {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  }
};
const said = async () => (await page.locator('.toast').allTextContents()).join();

await page.locator('#shape-filled').check();
await keys('u');
await drag([10, 10], [14, 13]);
check((await painted()) === 20, 'a filled rectangle of 5 by 4');

// reckoned from the middle of the pixel pressed, the handle reached the art's own top row
await keys('s');
await drag([10, 10], [14, 13]);
await drag([12, 10], [18, 10]);
const angle = await page.locator('#selection-angle').inputValue();

check(
  (await page.locator('.selection-bar').textContent()).includes('Turn'),
  'the selection’s angle says what it is, where no pointer hovers it to ask',
);

await keys('Escape');
check(
  angle === '0' && (await painted()) === 20,
  'a drag from the selection’s top pixel under the handle moves it, at a zoom this high',
);

// a quarter turn moved pixels: what left the canvas was cut off for good
await keys('Meta+a', 'Delete', 'Escape', 'u');
await drag([0, 0], [15, 1]);
await keys('s');
await drag([0, 0], [15, 1]);
await page.getByRole('button', { name: 'Turn the selection a quarter right' }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: 'Turn the selection a quarter left' }).click();
await page.waitForTimeout(150);
await keys('Escape');
check(
  (await painted()) === 32,
  'a quarter turn past the canvas’s edge comes back whole when it is turned back',
);

// each arrow stamped the selection down: nudged through a wall it left a gap as wide as itself
await keys('Meta+a', 'Delete', 'Escape', 'u');
await drag([2, 4], [5, 7]);
await drag([12, 2], [17, 13]);
await keys('s');
await drag([2, 4], [5, 7]);

for (let i = 0; i < 20; i++) {
  await page.keyboard.press('ArrowRight');
}

await keys('Escape');
check((await painted()) === 16 + 72, 'a selection nudged through other art leaves it whole');

// the picker read the layer in hand only: on a clear pixel of it, it picked nothing
await page.getByRole('button', { name: 'New layer', exact: true }).click();
await page.keyboard.type('Top');
await keys('Enter');
await page.locator('#colour-hex').click();
await page.locator('#colour-hex').fill('#2340a8');
await keys('Enter', 'i');
await page.mouse.click(...(await at(13, 5)));
await page.waitForTimeout(150);
check(
  (await page.locator('#colour-hex').inputValue()) === '#df2321',
  'the Colour picker takes the colour that shows, whichever layer it is on',
);

// what showed there was another layer's red: "there is none on a clear pixel" was not so
await keys('r');
await page.mouse.click(...(await at(13, 5)));
await page.waitForTimeout(150);
check(
  (await said()).includes('That colour is on Art'),
  'Replace colour on another layer’s pixel says which layer the colour is on',
);

// a selection's edits, a paste and a flip changed a hidden layer unseen
await page.getByRole('button', { name: 'Hide Top', exact: true }).click();
const before = await painted();

await keys('Meta+a', 'Delete');
const refused = await said();

await keys('Escape');
check(
  refused.includes('Top is hidden') && (await painted()) === before,
  'a hidden layer is not changed by Delete on a selection, and says why',
);
await keys('Shift+F');
check((await said()).includes('Top is hidden'), 'nor flipped unseen');
await keys('Meta+a', 'Meta+x');
check(
  (await said()).includes('Top is hidden') && (await painted()) === before,
  'nor cut unseen, and the message says so, not "Cut."',
);
await keys('Escape');
await page.getByRole('button', { name: 'Show Top', exact: true }).click();

// after a click the status bar named the colour that had been there
await keys('b');
await page.mouse.click(...(await at(25, 25)));
await page.waitForTimeout(150);
check(
  (await page.locator('#statusbar').textContent()).includes('x 25, y 25 · #'),
  'the status bar says the colour just painted under the pointer',
);

// focus stayed on the pull-down: E and G changed its choice, and undo did nothing
await page.locator('#paint-over').focus();
await page.locator('#paint-over').dispatchEvent('pointerdown');
await page.selectOption('#paint-over', { index: 1 });
check(
  await page.evaluate(() => document.activeElement?.id !== 'paint-over'),
  'a choice picked with the pointer gives the keys back to the editor',
);

// dropped on the canvas a frame went to an end of the row, and Escape took nothing back
for (let i = 0; i < 2; i++) {
  await page.locator('.cell-add').click();
  await page.waitForTimeout(100);
}

const order = () => frameLabels(page);
const first = await order();
const cell = await page.locator('.grid-row.current .cell').nth(0).boundingBox();

await page.mouse.move(cell.x + 20, cell.y + 20);
await page.mouse.down();
await page.mouse.move(cell.x + 150, cell.y + 20, { steps: 5 });
await page.keyboard.press('Escape');
await page.mouse.up();
await page.waitForTimeout(200);
check((await order()).join() === first.join(), 'Escape takes a frame’s drag back');
await page.mouse.move(cell.x + 20, cell.y + 20);
await page.mouse.down();
await page.mouse.move(cell.x + 150, cell.y + 20, { steps: 5 });
await page.mouse.move(cell.x + 150, cell.y - 300, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(200);
check((await order()).join() === first.join(), 'and a frame let go far from its row stays put');

// undo of a version gone back to brought the project back, on frame 1
await page.locator('.grid-row.current .cell').nth(2).click();
await page
  .getByRole('button', { name: 'More', exact: true })
  .click()
  .catch(() => {});
const history = page.getByRole('menuitem', { name: /History/ });

if (await history.count()) {
  await history.click();
} else {
  await page.getByRole('button', { name: 'History' }).click();
}

await page.getByRole('button', { name: 'Save a version' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Go back to this' }).first().click();
await page.waitForTimeout(800);
await keys('Meta+z');
await page.waitForTimeout(500);
check(
  (await page.locator('#statusbar').textContent()).includes('frame 3 of 3'),
  'undo of a version gone back to returns to the frame that was being edited',
);

// two versions saved in one minute had the same name
await page
  .getByRole('button', { name: 'More', exact: true })
  .click()
  .catch(() => {});

if (await history.count()) {
  await history.click();
} else {
  await page.getByRole('button', { name: 'History' }).click();
}

await page.getByRole('button', { name: 'Save a version' }).click();
await page.waitForTimeout(500);
const versions = await page.locator('.version-row .view-name').allTextContents();

check(
  versions.length > 1 && new Set(versions).size === versions.length,
  `versions saved in the same minute are told apart by name (${versions.length})`,
);
await finish();
