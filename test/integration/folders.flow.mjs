// Folders in Projects: a column of folders beside a grid of projects. Folders are made and named in
// place, projects dragged onto one or moved from their ⋯ menu, a new project joins the folder that
// is open, and all of it is kept across a visit; a search looks through every folder; a folder's
// line-up; renaming and removing a folder, whose projects stay.
import { openStudio } from './harness.mjs';
import { createProject, openExample, projectsPage } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.project-row');
  await page.waitForTimeout(400);
};
const place = (name) =>
  page.locator('.place').filter({
    has: page.locator('.place-name', { hasText: new RegExp(`^${name}$`) }),
  });
const goTo = async (name) => {
  await place(name).click();
  await page.waitForTimeout(150);
};
const shown = () => page.locator('.project-row .row-name').allTextContents();
const contents = async (name) => {
  await goTo(name);

  return JSON.stringify((await shown()).sort());
};
const folders = () => page.locator('.folder-list .place-name').allTextContents();
const newFolder = async (name) => {
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await page.locator('.folder-name-field').fill(name);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
};
const row = (name) =>
  page.locator('.project-row').filter({
    has: page.locator('.row-name', { hasText: new RegExp(`^${name}$`) }),
  });
const moveWithMenu = async (project, folder) => {
  await page.getByRole('button', { name: `More for ${project}` }).click();
  await page.getByRole('menuitem', { name: 'Move to folder…' }).click();
  await page.getByRole('menuitem', { name: folder, exact: true }).click();
  await page.waitForTimeout(200);
};

await openExample(page);
await openProjects();
// One sheet held the open project's buttons, the search, the folders, the rows and the new
// project's form: more than could be taken in. It is three pages, one in sight at a time.
check(
  (await page.locator('.projects-nav button').count()) === 3 &&
    (await page.locator('.project-row').first().isVisible()) &&
    !(await page.locator('#current-project-name').isVisible()) &&
    !(await page.locator('.start-chooser').isVisible()),
  'the Projects window opens on every project, the open one and a new one on pages of their own',
);
await projectsPage(page, 'This project');
check(
  (await page.locator('#current-project-name').isVisible()) &&
    !(await page.locator('.project-row').first().isVisible()),
  'This project is the open one’s name and what can be done with it',
);
await projectsPage(page, 'All projects');
check(
  JSON.stringify(await folders()) === '["All projects"]',
  'with no folders the column holds every project only',
);
await newFolder('Naga Eleven');
check(
  JSON.stringify(await folders()) === '["All projects","Not in a folder","Naga Eleven"]',
  'a new folder is named in place, and the projects in none have a place of their own',
);
check(
  (await page.locator('.place[aria-current="true"]').textContent()).startsWith('Naga Eleven') &&
    (await page.getByText('Nothing in this folder yet').count()) === 1,
  'the new folder opens, saying how to put projects in it',
);
await goTo('All projects');
await row('Sochetra').dragTo(place('Naga Eleven'));
await page.waitForTimeout(200);
check(
  (await contents('Naga Eleven')) === '["Sochetra"]',
  'a project dragged onto a folder goes in',
);
await projectsPage(page, 'This project');
await page.getByRole('button', { name: 'New character like this' }).click();
await page.waitForTimeout(800);
await page.fill('#current-project-name', 'Rival');
await page.press('#current-project-name', 'Enter');
await projectsPage(page, 'All projects');
await page.waitForTimeout(200);
check(
  (await contents('Naga Eleven')) === '["Rival","Sochetra"]',
  'a new character made like the open one joins its folder',
);

// As cards the projects were a wall of pictures. They are a list, as a phone's are: one row
// under another, the open one ticked.
const rowBoxes = await page
  .locator('.project-row')
  .evaluateAll((rows) => rows.map((each) => each.getBoundingClientRect().toJSON()));

check(
  rowBoxes.length === 2 &&
    rowBoxes[1].top >= rowBoxes[0].bottom - 1 &&
    rowBoxes[1].left === rowBoxes[0].left &&
    rowBoxes[0].height < 90,
  'the projects are a list, one row under another',
);
check(
  (await page.locator('.project-row[aria-current="true"] .row-now').count()) === 1 &&
    (await page.locator('.row-now').count()) === 1,
  'and the open one is ticked',
);
await projectsPage(page, 'This project');
check(
  (await page.locator('.current-project .list-row').count()) >= 8 &&
    (await page.getByRole('button', { name: /^Canvas/ }).textContent()).includes('160×160'),
  'This project is a list too: what it is, then what can be done with it',
);
await projectsPage(page, 'All projects');

await newFolder('Pitch');
await page.getByRole('button', { name: 'New project', exact: true }).click();
check(
  (await page.locator('.start-section summary').textContent()) === 'New project in Pitch',
  'New project says which folder the project will go in',
);
await createProject(page, { kind: 'Tiles', name: 'Grass' });
await openProjects();
check(
  (await contents('Pitch')) === '["Grass"]',
  'a project made while a folder is open goes in it',
);
await page.waitForTimeout(1500);
await page.reload();
await page.waitForTimeout(1500);
await openProjects();
check(
  (await page.locator('.place[aria-current="true"] .place-name').textContent()) === 'Pitch',
  'Projects opens on the folder of the open project',
);
check(
  (await contents('Naga Eleven')) === '["Rival","Sochetra"]' &&
    (await contents('Pitch')) === '["Grass"]',
  'folders and what is in them are kept for the next visit',
);

await newFolder('Enemies');
await goTo('All projects');
await moveWithMenu('Rival', 'Enemies');
check(
  (await contents('Enemies')) === '["Rival"]' && (await contents('Naga Eleven')) === '["Sochetra"]',
  'a project moves to another folder from its ⋯ menu',
);
check(
  JSON.stringify(await folders()) ===
    '["All projects","Not in a folder","Enemies","Naga Eleven","Pitch"]',
  'folders are listed by name',
);
await page.screenshot({ path: `${shots}/folders.png` });

await page.locator('.projects-search').fill('riv');
await page.waitForTimeout(200);
check(
  JSON.stringify(await shown()) === '["Rival"]' &&
    (await row('Rival').locator('.row-folder').textContent()) === 'Enemies' &&
    JSON.stringify(await folders()) === '["All projects","Not in a folder","Enemies"]',
  'a search from any folder finds a project in another, and names its folder',
);
await page.locator('.projects-search').fill('pitch');
await page.waitForTimeout(200);
check(JSON.stringify(await shown()) === '["Grass"]', "a folder's name finds its projects");
await page.locator('.projects-search').press('Escape');
await page.waitForTimeout(200);
check(
  (await page.locator('.sheet').count()) === 1 &&
    (await page.locator('.projects-search').inputValue()) === '',
  'Escape empties the search before it closes the window',
);
await goTo('All projects');
await page.getByRole('button', { name: 'A–Z' }).click();
await page.waitForTimeout(150);
check(JSON.stringify(await shown()) === '["Grass","Rival","Sochetra"]', 'projects sort by name');

await goTo('Naga Eleven');
await page.locator('.place-head').getByRole('button', { name: 'Line up' }).click();
await page.waitForSelector('.line-up');
await page.waitForTimeout(400);
check(
  JSON.stringify(await page.locator('.line-up-name').allTextContents()) === '["Sochetra"]',
  "a folder's line-up holds only its projects",
);
await page.keyboard.press('Escape');

await openProjects();
await goTo('Naga Eleven');
await place('Naga Eleven').dblclick();
await page.locator('.folder-name-field').fill('Naga Eleven cast');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await goTo('Pitch');
await page.getByRole('button', { name: 'Delete folder' }).click();
check(
  (await page.locator('.ask-question').textContent()).startsWith('Delete the folder?') &&
    (await page.getByRole('button', { name: 'Keep', exact: true }).count()) === 1,
  'deleting a folder asks first, with Delete and Keep, as every delete that cannot be undone',
);
await page.locator('.ask-answers').getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForTimeout(300);
check(
  JSON.stringify(await folders()) ===
    '["All projects","Not in a folder","Enemies","Naga Eleven cast"]' &&
    (await page.locator('.place[aria-current="true"] .place-name').textContent()) ===
      'All projects',
  'a folder renames in place, and deleting the open one goes back to every project',
);
check(
  (await contents('Naga Eleven cast')) === '["Sochetra"]' &&
    (await contents('Not in a folder')) === '["Grass"]',
  "the deleted folder's projects stay, in none",
);
await finish();
