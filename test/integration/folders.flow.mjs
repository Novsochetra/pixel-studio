// Folders in Projects: made and named, projects moved into them, new projects joining the open
// one's folder, all of it kept across a visit; a folder's line-up; renaming and removing a folder,
// whose projects stay.
import { openStudio } from './harness.mjs';
import { createProject, openExample } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.project-row');
  await page.waitForTimeout(400);
};
const newFolder = async (name) => {
  await page.getByRole('button', { name: 'New folder' }).click();
  await page.locator('.folder-name-field').fill(name);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
};
const groups = () =>
  page
    .locator('.folder-group')
    .evaluateAll((all) =>
      all.map((group) => [
        group.querySelector('.folder-name').textContent,
        [...group.querySelectorAll('.project-row .view-name')].map((name) => name.textContent),
      ]),
    );
const moveTo = async (project, folder) => {
  await page.getByLabel(`Folder of ${project}`).last().selectOption({ label: folder });
  await page.waitForTimeout(200);
};

await openExample(page);
await openProjects();
check((await page.locator('.folder-picker').count()) === 0, 'with no folders there is no picker');
await newFolder('Naga Eleven');
check(
  JSON.stringify(await groups()) === '[["Naga Eleven",[]],["Not in a folder",["Sochetra"]]]',
  'a new folder is named in place, and the projects in none are listed apart',
);
await moveTo('Sochetra', 'Naga Eleven');
check(
  JSON.stringify(await groups()) === '[["Naga Eleven",["Sochetra"]]]',
  'a project moves into a folder from its row',
);
await page.getByRole('button', { name: 'New character like this' }).click();
await page.waitForTimeout(800);
await page.fill('#current-project-name', 'Rival');
await page.press('#current-project-name', 'Enter');
await page.waitForTimeout(200);
check(
  JSON.stringify(await groups()) === '[["Naga Eleven",["Sochetra","Rival"]]]',
  'a new character made like the open one joins its folder',
);

await newFolder('Pitch');
await page.locator('.start-section').evaluate((details) => {
  details.open = true;
});
await createProject(page, { kind: 'Tiles', name: 'Grass' });
await openProjects();
await moveTo('Grass', 'Pitch');
await page.waitForTimeout(1500);
await page.reload();
await page.waitForTimeout(1500);
await openProjects();
check(
  JSON.stringify(await groups()) === '[["Naga Eleven",["Sochetra","Rival"]],["Pitch",["Grass"]]]',
  'folders and what is in them are kept for the next visit',
);
await page.screenshot({ path: `${shots}/folders.png` });

await page
  .getByRole('region', { name: 'Naga Eleven' })
  .getByRole('button', { name: 'Line up' })
  .click();
await page.waitForSelector('.line-up');
await page.waitForTimeout(400);
check(
  JSON.stringify(await page.locator('.line-up-name').allTextContents()) === '["Sochetra"]' &&
    (await page.getByText('Nothing drawn yet: Rival.').count()) === 1,
  "a folder's line-up holds only its projects",
);
await page.keyboard.press('Escape');

await openProjects();
const naga = page.getByRole('region', { name: 'Naga Eleven' });
await naga.getByRole('button', { name: 'Rename' }).click();
await page.locator('.folder-name-field').fill('Naga Eleven cast');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
const pitch = page.getByRole('region', { name: 'Pitch' });
await pitch.getByRole('button', { name: 'Delete folder' }).click();
await pitch.getByRole('button', { name: /Click again/ }).click();
await page.waitForTimeout(300);
check(
  JSON.stringify(await groups()) ===
    '[["Naga Eleven cast",["Sochetra","Rival"]],["Not in a folder",["Grass"]]]',
  'a folder renames in place, and deleting one keeps its projects, in none',
);
await finish();
