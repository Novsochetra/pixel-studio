// A window keeps its top where it opened as what it shows grows: centred, the sprite sheet's
// window moved up as its picture grew with a frame size typed, and the second click of a
// double-click on the next field landed on the one above it.
import { openStudio } from './harness.mjs';
import { createProject } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();

await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const art = await page.getByLabel('Pixel canvas').boundingBox();

await page.mouse.click(art.x + art.width / 2, art.y + art.height / 2);
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Sprite sheet/ }).click();
await page.waitForTimeout(800);

const top = async () => Math.round((await page.locator('.sheet').boundingBox()).y);
const opened = await top();

await page.locator('#frame-height').dblclick();
await page.keyboard.type('60');
await page.locator('#frame-width').dblclick();
await page.keyboard.type('44');
await page.keyboard.press('Tab');
await page.waitForTimeout(400);

check(
  (await page.inputValue('#frame-width')) === '44' &&
    (await page.inputValue('#frame-height')) === '60',
  `a size typed after another lands in its own field (${await page.inputValue('#frame-width')}×${await page.inputValue('#frame-height')})`,
);
check(
  (await top()) === opened,
  `the window’s top stays where it opened (${opened}, ${await top()})`,
);
await page.screenshot({ path: `${shots}/sheet-steady.png` });

await finish();
