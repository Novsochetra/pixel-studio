// The keyboard and focus: the frame grid and the tabs walked with the arrows, menus and sheets
// that hold the keys and give focus back, Play that leaves the bar usable, and what each kind
// shows.
import { openStudio } from './harness.mjs';
import { createProject, openExample, showAllViews } from './studio.mjs';

const { page, check, finish } = await openStudio();
const focused = () =>
  page.evaluate(() => {
    const element = document.activeElement;

    return element.getAttribute('aria-label') || element.textContent.trim();
  });
const tool = () => page.locator('#rail [aria-pressed="true"]').first().getAttribute('aria-label');
await openExample(page);
await page.locator('.cell-add').click();
await page.locator('.cell-add').click();
await page.waitForTimeout(300);

await page.locator('.grid-row.current .cell.selected').focus();
await page.keyboard.press('Home');
check((await focused()) === 'Front, frame 1', 'Home goes to the first frame, with focus on it');
await page.keyboard.press('ArrowRight');
check((await focused()) === 'Front, frame 2, empty', '→ goes to the next frame');
await page.keyboard.press('End');
check((await focused()) === 'Front, frame 3, empty', 'End to the last');
await showAllViews(page);
await page.locator('.grid-row.current .cell.selected').focus();
await page.keyboard.press('ArrowDown');
check((await focused()) === 'Side, frame 3, empty', '↓ goes to the same frame of the next view');
await page.keyboard.press('ArrowUp');
check((await focused()) === 'Front, frame 3, empty', '↑ comes back');

await page.keyboard.press('Enter');
await page.waitForTimeout(150);
check((await page.locator('.menu').count()) === 1, 'Enter opens the frame menu');
await page.keyboard.press('ArrowDown');
const second = await focused();
check(second !== (await page.locator('.menu button').first().textContent()), '↓ walks the menu');
await page.keyboard.press('e');
check((await tool()) === 'Pencil', 'a tool key does nothing behind an open menu');
await page.keyboard.press('Escape');
check((await page.locator('.menu').count()) === 0, 'Escape closes the menu');
check((await focused()) === 'Front, frame 3, empty', 'and focus goes back to the frame');

await page.getByRole('button', { name: 'New animation' }).click();
await page.waitForTimeout(100);

for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Tab');
}

check(
  await page.evaluate(() => Boolean(document.activeElement.closest('.sheet'))),
  'Tab goes round inside a sheet, never out to the page behind',
);
await page.getByRole('button', { name: 'Close window' }).click();
check((await page.locator('.sheet').count()) === 0, '× closes the sheet');
check((await focused()) === 'New animation', 'and focus goes back to what opened it');
await page.getByRole('button', { name: 'New animation' }).click();
await page.fill('#new-animation-name', 'Walk');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);

await page.locator('.grid-tab[aria-selected="true"]').focus();
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(200);
check(
  (await focused()) === 'Idle' &&
    (await page.locator('.grid-tab[aria-selected="true"]').textContent()) === 'Idle',
  '← opens the tab before, with focus on it',
);
await page.keyboard.press('Shift+F10');
check(
  (await page.getByRole('menuitem', { name: 'Rename' }).count()) === 1,
  'Shift+F10 opens its menu',
);
await page.keyboard.press('Escape');
await page.getByRole('tab', { name: 'Walk' }).click({ button: 'right' });
check(
  (await page.getByRole('menuitem', { name: /^Delete Walk/ }).count()) === 1,
  'a right-click on a tab opens its menu',
);
await page.keyboard.press('Escape');
check(
  await page.evaluate(() =>
    [...document.querySelectorAll('[role="tablist"] > *')].every(
      (child) => child.getAttribute('role') === 'tab',
    ),
  ),
  'the tab list holds tabs only',
);
check(
  await page.evaluate(() =>
    [...document.querySelectorAll('[role="row"]')].every((row) =>
      [...row.querySelectorAll('button, [role="gridcell"], [role="rowheader"]')].every((part) =>
        part.closest('[role="gridcell"], [role="rowheader"]'),
      ),
    ),
  ),
  'each row of the grid holds cells and its view name only',
);

await page.getByRole('tab', { name: 'Idle' }).click();
await page.getByRole('button', { name: 'Play' }).click();
await page.waitForTimeout(300);
const onion = page.getByRole('button', { name: /onion/i }).first();
const onionBefore = await onion.getAttribute('aria-pressed');
await onion.click();
check(
  (await onion.getAttribute('aria-pressed')) !== onionBefore,
  'a click on the bar lands while the animation plays',
);
await page.fill('#fps', '12');
await page.locator('#fps').press('Enter');
await page.waitForTimeout(300);
check(
  (await page.getByRole('button', { name: 'Pause' }).count()) === 1,
  'the frame rate changes while it plays, without stopping it',
);
await page.getByRole('button', { name: 'Pause' }).click();

await page.locator('.section[data-name="guides"] > h2').click();
check(
  (await page.locator('.guide-checks').first().textContent()) === 'All views: On the line',
  'a guide every view agrees on says so once',
);
await page.getByRole('button', { name: 'Download' }).click();
await page.getByRole('menuitem', { name: /Prompt and reference/ }).click();
await page.getByRole('button', { name: 'An animation frame' }).click();
await page.fill('#prompt-pose', 'left knee up');
check(
  (await page.inputValue('#prompt-text')).endsWith('Pose: left knee up'),
  'the pose of a frame goes into the prompt as it is typed',
);
check(
  (await page.evaluate(() => document.activeElement.id)) === 'prompt-pose',
  'and the field keeps its focus',
);
await page.keyboard.press('Escape');

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await page.locator('.start-card[aria-checked="true"]').focus();
await page.keyboard.press('ArrowRight');
check(
  (await page.locator('.start-card[aria-checked="true"]').textContent()).startsWith('Object') &&
    (await page.evaluate(() => document.activeElement.getAttribute('aria-checked'))) === 'true',
  'the arrows pick the next kind, with focus on it',
);
check(
  (await page.locator('.start-card[tabindex="0"]').count()) === 1,
  'and only the picked card is a Tab stop',
);
await createProject(page, { kind: 'Tiles' });
check(
  (await page.getByLabel('Pixel canvas').boundingBox()).width > 200,
  'a new tiles project opens fitted to the window, not at the last zoom',
);
check(
  (await page.getByRole('button', { name: /Pin a body part/ }).count()) === 0,
  'tiles have no pin tool',
);
check(
  (await page.locator('#inspector').textContent()).includes("the art's colours") &&
    !(await page.locator('#inspector').textContent()).includes('character colours'),
  'and their panels speak of the art, not a character',
);
await page.keyboard.press('p');
check((await tool()) !== 'Pin a body part (Alt-click removes it)', 'nor does P pick one');
await finish();
