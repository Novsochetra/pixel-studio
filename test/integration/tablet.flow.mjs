// A tablet held wide: the desk's layout under fingers. It has no keys, so what the desk leaves
// to a shortcut needs a control there too.
import { fingers, openStudio } from './harness.mjs';
import { createProject } from './studio.mjs';

const { page, context, check, finish, shots } = await openStudio({
  device: 'iPad (gen 7) landscape',
});
await createProject(page, { kind: 'Icon', name: 'Gem', width: 32 });
const canvas = page.getByLabel('Pixel canvas');
const touch = await fingers(context, page);
const at = async (x, y) => {
  const art = await canvas.boundingBox();
  const scale = art.width / 32;

  return [art.x + (x + 0.5) * scale, art.y + (y + 0.5) * scale];
};
const stroke = async (from, to) => {
  const [startX, startY] = await at(...from);
  const [endX, endY] = await at(...to);

  await touch('touchStart', [[startX, startY]]);

  for (let i = 1; i <= 10; i++) {
    await touch('touchMove', [
      [startX + ((endX - startX) * i) / 10, startY + ((endY - startY) * i) / 10],
    ]);
  }

  await touch('touchEnd', []);
  await page.waitForTimeout(250);
};
// the emulated tablet has no fine pointer in Chromium; other engines keep the desk's mouse
const fingersOnly = await page.evaluate(() => !matchMedia('(any-pointer: fine)').matches);

check(
  (await page.evaluate(() => document.documentElement.dataset.layout)) !== 'compact',
  'a tablet held wide has the desk’s layout',
);
await stroke([4, 4], [12, 4]);
await page.locator('#rail [aria-label^="Select and move"]').tap();
await stroke([2, 2], [14, 8]);
await page.locator('.selection-bar').getByRole('button', { name: 'Copy' }).tap();
await page.waitForTimeout(200);

if (fingersOnly) {
  const said = await page.locator('.toast').textContent();

  // Paste was nowhere on the desk's bar, while Copy said to look in the More menu
  await page.locator('.selection-bar').getByRole('button', { name: 'Done' }).tap();
  await page.getByRole('button', { name: 'More', exact: true }).tap();
  await page.waitForTimeout(300);
  const paste = page.getByRole('menuitem', { name: 'Paste' });

  check(
    said.includes('More menu') && (await paste.count()) === 1 && (await paste.isEnabled()),
    'what was copied can be pasted without keys, where Copy said it could',
  );
  await paste.tap();
  await page.waitForTimeout(300);
  check(
    (await page.locator('.selection-bar:not([hidden])').count()) === 1,
    'and Paste puts it on the canvas, selected',
  );
  check(
    !(await page.locator('#statusbar').textContent()).includes('Press ?'),
    'the status bar names no key where there are none',
  );
}

// Two fingers scrolled the canvas and sized it in whole zooms, drawing it again at every move:
// it lagged behind them and jumped. Held, it is moved as a picture and drawn once they let go.
const held = () =>
  canvas.evaluate((art) => ({
    moved: art.parentElement.style.transform,
    drawn: art.style.width,
    shown: art.getBoundingClientRect().width,
  }));
const [midX, midY] = await at(16, 16);
const before = await held();

await touch('touchStart', [
  [midX - 40, midY],
  [midX + 40, midY],
]);

for (let i = 1; i <= 8; i++) {
  await touch('touchMove', [
    [midX - 40 - i * 3, midY + i * 2],
    [midX + 40 + i * 3, midY + i * 2],
  ]);
  await page.waitForTimeout(20);
}

const during = await held();

check(
  during.moved.includes('scale') &&
    during.drawn === before.drawn &&
    during.shown > before.shown * 1.4,
  'two fingers size the canvas as they spread, between whole zooms, without drawing it again',
);
await touch('touchEnd', []);
await page.waitForTimeout(500);
const after = await held();

check(
  after.moved === '' && parseFloat(after.drawn) === Math.round(after.shown),
  'and let go, it is drawn once at the whole zoom nearest',
);

await page.screenshot({ path: `${shots}/tablet-wide.png` });
await finish();
