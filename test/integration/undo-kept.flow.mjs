// A project keeps its undo steps while another is looked at: opened again it had none, and what
// was drawn before could not be taken back.
import { openStudio } from './harness.mjs';
import { createProject, paintedPixels, projectsPage } from './studio.mjs';

const { page, check, finish } = await openStudio();
await createProject(page, { kind: 'Icon', name: 'Gem', width: 16 });
const canvas = page.getByLabel('Pixel canvas');
const painted = async () => (await paintedPixels(canvas, 16)).length;
const stroke = async (row) => {
  const art = await canvas.boundingBox();
  const at = (pixel) => (pixel + 0.5) * (art.width / 16);

  await page.mouse.move(art.x + at(2), art.y + at(row));
  await page.mouse.down();
  await page.mouse.move(art.x + at(9), art.y + at(row), { steps: 8 });
  await page.mouse.up();
  await page.mouse.move(2, 2);
};
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.sheet .project-row');
};
const undo = () => page.getByRole('button', { name: 'Undo', exact: true });

await stroke(3);
await stroke(6);
await page.keyboard.press('ControlOrMeta+z');
const drawn = await painted();

check(drawn === 8, 'two strokes are drawn and one is undone');

await openProjects();
await projectsPage(page, 'New project');
await createProject(page, { kind: 'Icon', name: 'Key', width: 16 });
check(await undo().isDisabled(), 'a new project has nothing to undo');
await stroke(4);

await openProjects();
await page
  .locator('.sheet .project-row', { hasText: 'Gem' })
  .locator('.row-open, .row-name')
  .first()
  .click();
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(400);
check(
  (await painted()) === drawn && !(await undo().isDisabled()),
  'opened again, the first project still has its steps to undo',
);
await page.keyboard.press('ControlOrMeta+Shift+z');
check((await painted()) === 16, 'the stroke undone before is redone');
await page.keyboard.press('ControlOrMeta+z');
await page.keyboard.press('ControlOrMeta+z');
check((await painted()) === 0, 'and both strokes are taken back');
check(await undo().isDisabled(), 'with nothing left to undo');

await openProjects();
await page
  .locator('.sheet .project-row', { hasText: 'Key' })
  .locator('.row-open, .row-name')
  .first()
  .click();
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(400);
await page.keyboard.press('ControlOrMeta+z');
check((await painted()) === 0, 'the other project kept its own step, not the first one’s');

// Undo went no further back than a canvas size once another project had been looked at, though
// the size's own message says undo puts it back.
const size = async () =>
  (await page.locator('#statusbar').textContent()).match(/(\d+)×\d+ canvas/)?.[1];

await stroke(4);
await page.locator('.status-link').click();
await page.fill('#canvas-width', '24');
await page.fill('#canvas-height', '24');
await page.locator('#canvas-height').press('Enter');
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(400);
check((await size()) === '24', 'the canvas is made larger');

await openProjects();
await page.locator('.sheet .project-row', { hasText: 'Gem' }).locator('.row-open').click();
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(400);
await openProjects();
await page.locator('.sheet .project-row', { hasText: 'Key' }).locator('.row-open').click();
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(400);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(400);
check((await size()) === '16', 'looked away from and opened again, undo still takes the size back');
await page.keyboard.press('ControlOrMeta+z');
check((await painted()) === 0, 'and the stroke before it');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.keyboard.press('ControlOrMeta+Shift+z');
await page.waitForTimeout(400);
check((await size()) === '24', 'and redo makes it larger again');

await finish();
