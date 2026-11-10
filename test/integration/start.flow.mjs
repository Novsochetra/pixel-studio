// The first visit and every kind of project: the start screen, what each kind sets up, presets,
// and the example.
import { openStudio } from './harness.mjs';
import { createProject, frameLabels, showAllViews, status } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const workspaces = () =>
  page.locator('#toolbar .segmented[aria-label="Workspace"] button').allTextContents();
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.sheet .start-section');
  await page.locator('.sheet .start-section').evaluate((details) => {
    details.open = true;
  });
};

check(await page.locator('.start-screen').isVisible(), 'a first visit opens on the start screen');
check(
  (await page.getByRole('radio').count()) === 6,
  'it offers five kinds and the Naga Eleven preset',
);
await page.screenshot({ path: `${shots}/start.png` });

await page.getByRole('radio', { name: /^Tiles/ }).click();
check((await page.inputValue('#project-width')) === '16', 'Tiles start at 16 by 16');
check(await page.locator('#project-directions').isHidden(), 'only a character chooses directions');
await createProject(page, { kind: 'Tiles', name: 'Grass' });
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Grass'),
  'the new project opens',
);
check(!(await workspaces()).includes('Views board'), 'one-view kinds have no views board');
check(
  (await status(page)).startsWith('Tile · frame 1 of 1'),
  'a tile project names its view "Tile"',
);
check((await page.locator('.grid-label').count()) === 0, 'and its frame grid has no row names');
check(
  (await page.getByRole('button', { name: 'New tile' }).count()) === 1,
  'its + makes a new tile',
);
check(
  !(await page.getByRole('button', { name: /Outfits|Team kits/ }).count()),
  'tiles have no outfits',
);

await openProjects();
await createProject(page, { kind: 'Effect', name: 'Spark' });
check((await status(page)).includes('48×48 canvas'), 'an effect starts on a 48 by 48 canvas');

// a width of 0 quietly made a project of the usual size, where 5 was refused
await openProjects();
await page.getByRole('radio', { name: /^Icon/ }).click();
await page.fill('#project-width', '0');
await page.getByRole('button', { name: 'Create', exact: true }).click();
await page.waitForTimeout(300);
check(
  (await page.locator('.toast').textContent()).includes('from 8 to 512') &&
    (await status(page)).includes('48×48 canvas'),
  'a width of 0 is refused and said, as any size no canvas can have',
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

await openProjects();
await createProject(page, { kind: 'Character', name: 'Runner', width: 32, directions: 'side' });
await showAllViews(page);
check(
  JSON.stringify(await page.locator('.grid-view').allTextContents()) === '["Side","Side, left"]',
  'a side-scroller draws Side and shows its mirrored left',
);
check(
  (await page.locator('.grid-row.mirrored').count()) === 1,
  'the mirrored side is a faded row of its own',
);
check((await page.locator('.grid-numbers').count()) === 1, 'frames are numbered across the top');

await openProjects();
await page.getByRole('radio', { name: /^Naga Eleven/ }).click();
check(
  (await page.inputValue('#project-width')) === '160',
  'the Naga Eleven preset brings its 160 by 160 canvas',
);
await createProject(page, { kind: 'Naga Eleven', name: 'Striker' });
check((await workspaces()).includes('On the pitch'), 'a Naga Eleven project previews on the pitch');
check((await page.getByRole('button', { name: 'Team kits…' }).count()) === 1, 'and has team kits');
check(
  JSON.stringify(await page.locator('.grid-view').allTextContents()) ===
    '["Front","Side","Back","Side, left"]',
  'it starts with the front, side and back, the left side mirrored',
);
check(
  JSON.stringify(await frameLabels(page)) === '["1 · empty"]',
  'its first animation has one empty frame',
);

await page.reload();
await page.waitForSelector('.grid-panel');
check(
  !(await page.locator('.start-screen').count()),
  'once something is saved, the page opens on it',
);
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Striker'),
  'on the project open last',
);

await openProjects();
check((await page.locator('.project-card').count()) === 4, 'every project made is listed');
await page.getByRole('button', { name: 'Save as a preset' }).click();
await page.waitForTimeout(400);
check(
  (await page
    .locator('.sheet')
    .getByRole('radio', { name: /^Striker/ })
    .count()) === 1,
  'a project saved as a preset shows at once in the window still open',
);
await page.keyboard.press('Escape');
await openProjects();
check(
  (await page.getByRole('radio', { name: /^Striker/ }).count()) === 1,
  'a project saved as a preset is offered for new projects',
);
await page.getByRole('button', { name: 'Forget the Striker preset' }).click();
check(
  (await page.getByRole('radio', { name: /^Striker/ }).count()) === 1 &&
    (await page.locator('.toast').textContent()).startsWith('Forget the Striker preset?'),
  'forgetting a preset, which cannot be undone, asks first',
);
await page.getByRole('button', { name: 'Forget the Striker preset' }).click();
await page.waitForTimeout(300);
check(!(await page.getByRole('radio', { name: /^Striker/ }).count()), 'and it can be forgotten');
await page.getByRole('button', { name: 'Try the example character' }).last().click();
await page.waitForSelector('.sheet', { state: 'detached' });
await page.waitForTimeout(500);
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Sochetra'),
  'the example opens from the projects list',
);
check(!(await status(page)).includes('empty'), 'with its art');

await page.emulateMedia({ colorScheme: 'dark' });
const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check(dark === 'rgb(0, 0, 0)', 'the page follows a dark appearance');
await page.screenshot({ path: `${shots}/dark.png` });

await finish();
