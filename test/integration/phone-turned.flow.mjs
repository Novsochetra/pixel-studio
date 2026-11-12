// A phone held on its side, and what a first visit with fingers met there: a window's buttons
// under the screen's foot, the selection's bar over the art, and advice for fingers hidden.
import { openStudio } from './harness.mjs';
import { dropImage, cleanReport, createProject, openDock, openExample } from './studio.mjs';

const { page, check, finish, images, shots } = await openStudio({ device: 'Pixel 7' });
const upright = page.viewportSize();
const onItsSide = { width: upright.height, height: upright.width };
const box = (selector) => page.locator(selector).first().boundingBox();

await openExample(page);

// a line of advice is hidden on a phone, to save its panel's room: this one says what fingers
// must do to move a layer, and nothing else says it
await openDock(page, 'Layers');
await page.getByRole('button', { name: 'New layer' }).tap();
await page.waitForTimeout(300);
check(
  await page.locator('.section .for-fingers').isVisible(),
  'the Layers panel says a layer is held before it is dragged',
);

await page.setViewportSize(onItsSide);
await page.waitForTimeout(500);
check(
  await page.locator('#rail [aria-pressed="true"]').isVisible(),
  'turned on its side, the phone still shows the tool in hand',
);

// The buttons scrolled with the rest of the window, and it opened with a sliver of them in sight.
await openDock(page, 'Frames');
await page.locator('.grid-tab-add:visible').first().tap();
await page.waitForTimeout(500);
const foot = await box('.sheet .sheet-actions');

check(
  foot.y + foot.height <= onItsSide.height + 1,
  `a window's buttons stay at the screen's foot on a phone held on its side (${Math.round(foot.y + foot.height)} of ${onItsSide.height})`,
);
await page.screenshot({ path: `${shots}/phone-turned-window.png` });
await page.getByRole('button', { name: 'Cancel' }).tap();
await page.waitForTimeout(400);
await page.locator('.dock-tab[aria-pressed="true"]').tap();
await page.waitForTimeout(300);

// At the canvas's end the bar lay over the art's last rows. With room beside the canvas it is a
// card in the stage's corner.
await page.locator('#rail [aria-label^="Select and move"]').evaluate((tool) => tool.click());
const art = await box('.canvas-holder canvas');

await page.mouse.move(art.x + art.width * 0.3, art.y + art.height * 0.2);
await page.mouse.down();
await page.mouse.move(art.x + art.width * 0.6, art.y + art.height * 0.4, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(400);
const bar = await box('.selection-bar');

check(
  bar.x + bar.width <= art.x || bar.y + bar.height <= art.y || bar.y >= art.y + art.height,
  `the selection’s bar stands clear of the art (${await page.locator('.selection-bar').getAttribute('data-side')}: bar ${Math.round(bar.x)} to ${Math.round(bar.x + bar.width)}, art from ${Math.round(art.x)})`,
);
await page.screenshot({ path: `${shots}/phone-turned-selection.png` });
await page.locator('.selection-done').tap();

// The canvas made larger for a picture stayed larger when the window was cancelled.
await page.setViewportSize(upright);
await page.waitForTimeout(400);
await page.locator('button.wordmark').tap();
await page.waitForTimeout(300);
await page.locator('.sheet .projects-nav button', { hasText: 'New project' }).tap();
await createProject(page, { kind: 'Character', name: 'Small', width: 32 });
await dropImage(page, `${images}/front.png`, 'front.png');
await cleanReport(page);
await page.locator('#import-grow').tap();
await page
  .waitForFunction(
    () => document.querySelector('pre.report')?.textContent.includes('pixel size'),
    null,
    { timeout: 25000 },
  )
  .catch(() => null);
await page.getByRole('button', { name: 'Cancel' }).tap();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /^More/ }).first().tap();
check(
  (await page.getByRole('menuitem', { name: /Canvas size/ }).count()) === 1,
  'the More menu opens',
);
await page.getByRole('menuitem', { name: /Canvas size/ }).tap();
await page.waitForTimeout(400);
check(
  (await page.inputValue('#canvas-width')) === '32',
  'a window cancelled after making the canvas larger puts the canvas back',
);

// The on-screen keyboard lies over the screen's foot, where a window on a phone stands: its
// field was typed into unseen. No test can raise real keys, so the part of the page in sight
// is made as short as they leave it, as the browser tells it.
const keys = (height) =>
  page.evaluate((shown) => {
    const viewport = window.visualViewport;

    Object.defineProperty(viewport, 'height', { get: () => shown, configurable: true });
    viewport.dispatchEvent(new window.Event('resize'));
  }, height);
const screen = page.viewportSize().height;

await page.locator('#canvas-width').focus();
await keys(screen - 320);
await page.waitForTimeout(300);
const lifted = await box('.sheet');
const field = await box('#canvas-width');

check(
  lifted.y + lifted.height <= screen - 320 + 1 && field.y + field.height <= screen - 320,
  `with the keys up, a window and the field typed in stand above them (${Math.round(lifted.y + lifted.height)} of ${screen - 320})`,
);
await page.screenshot({ path: `${shots}/phone-keys-up.png` });
await keys(screen);
await page.waitForTimeout(300);
const back = await box('.sheet');

check(back.y + back.height >= screen - 1, 'and it goes back to the screen’s foot as they go');

await finish();
