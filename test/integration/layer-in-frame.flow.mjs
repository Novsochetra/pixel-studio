// A layer belongs to its frame: changing the layers of one frame leaves every other frame and view.
import { openStudio } from './harness.mjs';
import { frameAction, frameLabels, openExample, selectFrame, selectView } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await openExample(page);
const layerNames = () => page.locator('.layer-row .layer-name').allTextContents();
const named = async (names) => JSON.stringify(await layerNames()) === JSON.stringify(names);
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const zoom = art.width / 160;
const at = (x, y) => [art.x + (x + 0.5) * zoom, art.y + (y + 0.5) * zoom];
const panelButton = (name) => page.getByRole('button', { name, exact: true });

await page.mouse.move(...at(40, 40));
await page.mouse.down();
await page.mouse.move(...at(60, 50), { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(150);
await frameAction(page, 'Duplicate frame');
const framesBefore = await frameLabels(page);

await panelButton('New layer').click();
await page.keyboard.type('Hair');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await page.mouse.move(...at(5, 5));
await page.mouse.down();
await page.mouse.move(...at(30, 15), { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(150);
check(await named(['Hair', 'Art']), 'a new layer joins the frame it was made in');

await selectFrame(page, 0);
check(await named(['Art']), 'the frame before does not get the new layer');
await selectFrame(page, 1);

await page.locator('.layer-row', { hasText: 'Art' }).click();
await panelButton('Delete Art').click();
await page.waitForTimeout(200);
check(await named(['Hair']), 'deleting the first layer leaves the other layer of the frame');
check(
  JSON.stringify(await frameLabels(page)) === JSON.stringify(framesBefore),
  'no frame goes away or turns empty',
);

await selectFrame(page, 0);
check(await named(['Art']), 'the frame before keeps the layer deleted from this one');
check((await frameLabels(page))[0] === '1', 'and keeps its art');
await selectView(page, 'Side');
await selectFrame(page, 1);
check(await named(['Art']), 'the same frame of another view keeps its layer');

await selectView(page, 'Front');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(await named(['Hair', 'Art']), 'undo brings the layer back');

await page.getByRole('button', { name: 'Duplicate layer' }).click();
await page.waitForTimeout(200);
check((await layerNames()).length === 3, 'duplicating a layer adds it to this frame');
await selectFrame(page, 0);
check(await named(['Art']), 'and to no other frame');

await selectFrame(page, 1);
await frameAction(page, 'Duplicate frame');
check((await layerNames()).length === 3, 'a duplicated frame takes the layers of its frame');

const rows = page.locator('.layer-row');
const merge = page.getByRole('button', { name: /^Merge down/ });
const topName = () => rows.first().locator('.layer-name').textContent();

await rows.last().click();
check(await merge.isDisabled(), 'the bottom layer has nothing to merge onto');
await rows.first().click();
check(!(await merge.isDisabled()), 'a layer with art below can merge');

const before = await layerNames();
const [firstRow, lastRow] = [await rows.first().boundingBox(), await rows.last().boundingBox()];
await page.mouse.move(firstRow.x + 60, firstRow.y + 10);
await page.mouse.down();
await page.mouse.move(lastRow.x + 60, lastRow.y + lastRow.height - 2, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(200);
check((await layerNames()).at(-1) === before[0], 'a drag puts a layer lower in this frame');
await selectFrame(page, 1);
check(
  JSON.stringify(await layerNames()) === JSON.stringify(before),
  'and the frame it was copied from keeps its order',
);
await selectFrame(page, 2);

await rows.nth(1).locator('.layer-name').dblclick();
check((await page.locator('.layer-rename').count()) === 1, 'a double-click on a layer renames it');
await page.keyboard.type('Sword');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
check((await layerNames())[1] === 'Sword', 'the new name shows');
await selectFrame(page, 1);
check(!(await layerNames()).includes('Sword'), 'and only in this frame');
await selectFrame(page, 2);

const count = (await layerNames()).length;
await rows.first().click();
const below = await rows.nth(1).locator('.layer-name').textContent();
await page.getByRole('button', { name: `Delete ${await topName()}`, exact: true }).click();
await page.waitForTimeout(200);
check((await layerNames()).length === count - 1, 'the top layer goes');
check(
  (await page.locator('.layer-row[aria-selected="true"] .layer-name').textContent()) === below,
  'the layer under it is picked next',
);

await selectFrame(page, 0);
await page.getByRole('button', { name: 'Delete Art', exact: true }).click();
await page.waitForTimeout(150);
check(await named(['Art']), 'the last layer of art in a frame stays');
check((await frameLabels(page))[0] === '1', 'with its art');
await page.keyboard.press('Meta+z');
await page.waitForTimeout(200);
check(
  !(await page.locator('.toast').allTextContents()).includes('Undone: Delete Art'),
  'a refused delete leaves no step of its own',
);

await page.screenshot({ path: `${shots}/layer-in-frame.png` });
await finish();
