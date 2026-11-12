// What a first-time walk through making a character met on a desk: Enter in the clean window
// threw the result away, the animation had no keys, a pose typed in the prompt was forgotten.
import { openStudio } from './harness.mjs';
import { cleanReport, dropImage, openExample, selectView } from './studio.mjs';

const { page, check, finish } = await openStudio();
const [, images] = process.argv.slice(2);
const cells = () => page.locator('.grid-row.current .cell').count();

await openExample(page);
await selectView(page, 'Side');
await dropImage(page, `${images}/side.webp`, 'side.webp');
await cleanReport(page);
await page.waitForTimeout(300);
check(
  (await page.evaluate(() => document.activeElement?.textContent)).startsWith('Use for'),
  'the cleaned result ready, the keys are on Use',
);
check(
  (await page.locator('pre.report').textContent()).includes('Colours: drawn in the front'),
  'and the report says the picture takes the Front’s colours',
);
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
check(
  (await page.locator('.sheet').count()) === 0 &&
    (await page.locator('.toast').textContent()).length > 0,
  'Enter uses the clean, where it closed the window and threw it away',
);

// the animation's own steps had no keys
await page.mouse.move(2, 2);
await page.evaluate(() => document.activeElement?.blur());
const before = await cells();

await page.keyboard.press('Alt+KeyN');
await page.waitForTimeout(200);
check((await cells()) === before + 1, 'Alt N adds a frame');
await page.keyboard.press('Alt+KeyD');
await page.waitForTimeout(200);
check((await cells()) === before + 2, 'Alt D duplicates the frame');
await page.keyboard.press('Alt+KeyO');
await page.waitForTimeout(200);
check(
  (await page.locator('.grid-bar [aria-pressed="true"][aria-label*="nion"]').count()) === 1,
  'Alt O turns on onion skin',
);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(
  (await page.getByRole('button', { name: 'Pause', exact: true }).count()) === 1,
  'Enter plays',
);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check(
  (await page.getByRole('button', { name: 'Play', exact: true }).count()) === 1,
  'and Enter again pauses',
);
await page.keyboard.press('ControlOrMeta+s');
await page.waitForTimeout(600);
check((await page.locator('.toast').textContent()) === 'Saved', '⌘S saves at once, and says so');

// a pose typed as the last thing before closing came back empty
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Prompt and reference/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'An animation frame' }).click();
await page.waitForTimeout(200);
const field = page.getByLabel('Pose of this frame');

await field.fill('mid-stride, left foot forward');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Prompt and reference/ }).click();
await page.waitForTimeout(400);
check(
  (await page.getByLabel('Pose of this frame').inputValue()) === 'mid-stride, left foot forward',
  'the pose typed last is asked again',
);

await finish();
