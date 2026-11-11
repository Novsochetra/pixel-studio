// The largest canvas follows the hand: what is drawn at every move of the pointer is counted,
// not timed, so the flow says the same on a slow machine.
import { openStudio } from './harness.mjs';
import { createProject, openPanel } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
await createProject(page, { kind: 'Character', name: 'Big', width: 512 });
const canvas = page.getByLabel('Pixel canvas');
const art = await canvas.boundingBox();
const middle = [art.x + art.width / 2, art.y + art.height / 2];
const section = page.locator('.section[data-name="outline"]');

await page.evaluate(() => {
  const pen = window.CanvasRenderingContext2D.prototype;
  const fill = pen.fillRect;

  window.rectsFilled = 0;
  pen.fillRect = function counted(...box) {
    window.rectsFilled += 1;

    return fill.apply(this, box);
  };
});

const filledBy = async (act) => {
  await page.evaluate(() => {
    window.rectsFilled = 0;
  });
  await act();

  return page.evaluate(() => window.rectsFilled);
};
const MOVES = 20;

// The checkerboard was filled a square at a time, twice at every move: 65,000 rectangles each
// time on this canvas, and a stroke came a long way behind the pointer.
const stroke = await filledBy(async () => {
  await page.mouse.move(middle[0] - 80, middle[1] - 40);
  await page.mouse.down();

  for (let i = 1; i <= MOVES; i++) {
    await page.mouse.move(middle[0] - 80 + i * 8, middle[1] - 40 + i * 3);
  }

  await page.mouse.up();
});

check(
  stroke / MOVES < 50,
  `a move of the pencil on a 512×512 canvas fills a few rectangles, not one for every square of the checkerboard (${Math.round(stroke / MOVES)} a move)`,
);
check(
  (await page.locator('#statusbar').textContent()).includes('sprite 161×61'),
  'and the stroke is drawn where the pointer went',
);
await page.screenshot({ path: `${shots}/big-canvas.png` });

// The Outline section counted the pixels each of its rows would change at every stroke, folded
// shut or not: most of what the end of a stroke waited for.
check(
  (await section.getAttribute('data-collapsed')) === 'true' &&
    (await section.locator('.list-row').count()) === 0,
  'folded shut, the Outline section draws its title alone',
);
await openPanel(page, 'Outline');
check(
  (await section.locator('.list-row').count()) === 5 &&
    /^\d+$/.test(await section.locator('.list-action .list-value').first().textContent()),
  'opened, it has its rows, each with its count',
);
await page.keyboard.press('Tab');
await section.locator('h2').focus();
await page.keyboard.press('Enter');
check(
  (await section.getAttribute('data-collapsed')) === 'true' &&
    (await page.evaluate(() => document.activeElement?.textContent)) === 'Outline',
  'folded from the keys, its title keeps them',
);
await page.keyboard.press('Enter');
check(
  (await section.locator('.list-row').count()) === 5 &&
    (await page.evaluate(() => document.activeElement?.textContent)) === 'Outline',
  'and opened from the keys it has its rows again',
);

await finish();
