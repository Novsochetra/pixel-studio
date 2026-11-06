// Every way art leaves the studio, with what is inside checked: the sheet, its JSON, frames, GIFs,
// the Naga Eleven game pack, a tile's sheet, the prompts, the menu's files and a project file
// opened on a fresh start screen.
import { readFileSync } from 'node:fs';
import { openStudio } from './harness.mjs';
import { createProject, download, openExample } from './studio.mjs';
import { isGif, isPng, readZip } from './files.mjs';

const { page, context, check, finish, shots, url } = await openStudio();
const saved = async (click, name) => {
  const file = await download(page, click);
  const path = `${shots}/${name}`;

  await file?.saveAs(path);

  return { name: file?.suggestedFilename() ?? 'none', path };
};
const button = (name) => () => page.getByRole('button', { name, exact: true }).click();
const menu = async (item) => {
  await page.getByRole('button', { name: 'Download' }).click();
  await page.getByRole('menuitem', { name: item }).click();
};
await openExample(page);

await menu(/Sprite sheet/);
const presets = await page
  .locator('.sheet .segmented[aria-label="Frame size"] button')
  .allTextContents();
check(
  JSON.stringify(presets) === '["Fit the art","Naga Eleven today (64×62)","Custom"]',
  "a Naga Eleven character offers the game's own frame",
);
check(
  (await page.getByLabel('Feet x in frame').count()) === 1,
  'a character is anchored at its feet',
);
await page.getByRole('button', { name: 'Naga Eleven today (64×62)' }).click();
check((await page.inputValue('#frame-width')) === '64', 'the game frame is 64 wide');
check(
  (await page.locator('.sheet pre.report', { hasText: 'SPRITES' }).count()) === 1,
  'with the lines for the game manifest',
);
const sheetPng = await saved(
  () => page.getByRole('button', { name: /^Download idle.png/ }).click(),
  'idle.png',
);
check(isPng(readFileSync(sheetPng.path)), 'the sheet downloads as a PNG');
check(
  (await page.locator('.toast').textContent()).startsWith('Saved'),
  'and the page says it is saved',
);
const json = readZip((await saved(button('Sheets + JSON'), 'sheets.zip')).path);
const meta = JSON.parse(json['idle.json']);
check(
  Object.keys(meta.frames).length === 3 && meta.meta.frameTags.length === 3,
  'Sheets + JSON names every frame and tags every view',
);
const frames = readZip((await saved(button('Separate frames'), 'frames.zip')).path);
check(
  Object.keys(frames).length === 3 && Object.values(frames).every(isPng),
  'Separate frames saves each frame as a PNG',
);
const gifs = readZip((await saved(button('Animated GIFs'), 'gifs.zip')).path);
check(
  Object.values(gifs).length === 3 && Object.values(gifs).every(isGif),
  'Animated GIFs saves a GIF per view',
);
const pack = readZip((await saved(button('Naga Eleven game pack'), 'pack.zip')).path);
check(
  Object.keys(pack).some((name) => name.endsWith('sprites.pixel-clean.js')),
  'the game pack carries the SPRITES manifest',
);
await page.keyboard.press('Escape');

await menu(/Prompt and reference/);
check(
  (await page.inputValue('#prompt-text')).includes('pixels tall'),
  "a character's prompt gives its height",
);
await page.keyboard.press('Escape');
const view = await saved(() => menu(/for editing/), 'front.png');
check(view.name.endsWith('-160.png'), 'the view downloads at its own size');
const views = readZip((await saved(() => menu(/All views/), 'views.zip')).path);
check(Object.keys(views).length === 6, 'All views saves each view at both sizes');
const projectFile = await saved(() => menu(/Save project file/), 'project.json');
const file = JSON.parse(readFileSync(projectFile.path, 'utf8'));
check(
  file.kind === 'pixel-clean-studio' && file.project.kind === 'character',
  'a project file holds the project and its kind',
);

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Tiles', name: 'Wall' });
await menu(/Sprite sheet/);
check(
  (await page.locator('.sheet .segmented button').first().textContent()) === 'The tile',
  'a tile exports as the tile itself',
);
check(
  (await page.inputValue('#frame-width')) === '16' && (await page.inputValue('#anchor-x')) === '0',
  'its frame is the canvas, anchored at the corner',
);
check((await page.getByLabel('Anchor x in frame').count()) === 1, 'anchored, not standing on feet');
check(
  !(await page.getByRole('button', { name: 'Naga Eleven game pack' }).count()),
  'there is no game pack without a game',
);
await page.keyboard.press('Escape');

await page.locator('button.wordmark').click();
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Character', name: 'Compass', width: 32, directions: 'eight' });
await menu(/Sprite sheet/);
check(
  (await page.locator('.sheet p.hint').first().textContent()).includes('× 8 rows'),
  'a character drawn in all eight directions has a row for each',
);
const eight = readZip((await saved(button('Animated GIFs'), 'eight.zip')).path);
check(Object.values(eight).length === 8 && Object.values(eight).every(isGif), 'and a GIF for each');
await page.keyboard.press('Escape');

const fresh = await context.browser().newContext({ viewport: { width: 1280, height: 860 } });
const second = await fresh.newPage();
await second.goto(url);
await second.waitForSelector('.start-screen');
const chooser = second.waitForEvent('filechooser');
await second.getByRole('button', { name: 'Open a project file…' }).click();
await (await chooser).setFiles(projectFile.path);
await second.waitForSelector('.grid-panel');
await second.waitForTimeout(400);
check(
  (await second.locator('button.wordmark small').textContent()).startsWith('Sochetra'),
  'a project file opens from the start screen',
);
check(
  !(await second.locator('#statusbar span').nth(2).textContent()).includes('empty'),
  'with its art',
);
await fresh.close();

await finish();
