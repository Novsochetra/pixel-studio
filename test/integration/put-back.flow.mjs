// A part or an outfit removed without a question, as a palette is: put back in the window, and
// by the editor's undo. A project copied twice and a version named twice told apart by name.
import { openStudio } from './harness.mjs';
import { openExample, projectsPage, waitSaved } from './studio.mjs';

const { page, check, finish, shots } = await openStudio();
const sheet = page.locator('.sheet');
const partNames = () =>
  page
    .locator('.part-row input[aria-label="Part name"]')
    .evaluateAll((fields) => fields.map((field) => field.value));
const openParts = async () => {
  await page.getByRole('button', { name: 'Team kits…' }).click();
  await page.waitForTimeout(300);
  await sheet.locator('details', { hasText: 'Which colours are which part' }).evaluate((fold) => {
    fold.open = true;
  });
};

await openExample(page);
await openParts();
const parts = await partNames();
const first = parts[0];

check(parts.length > 1, `the example has parts to take off (${parts.length})`);
await sheet.getByRole('button', { name: `Remove ${first}`, exact: true }).click();
await page.waitForTimeout(200);
check((await sheet.locator('.ask-question').count()) === 0, 'removing a part asks nothing');
check(!(await partNames()).includes(first), 'the part is off the list');

const putBack = sheet.getByRole('button', { name: `Put back ${first}`, exact: true });

check((await putBack.count()) === 1, 'and the window offers it back');
await page.screenshot({ path: `${shots}/put-back.png` });
await putBack.click();
await page.waitForTimeout(200);
check(
  JSON.stringify(await partNames()) === JSON.stringify(parts),
  'Put back returns it to the place it had',
);
check((await sheet.locator('.put-back').count()) === 0, 'and offers nothing more');

await sheet.getByRole('button', { name: `Remove ${first}`, exact: true }).click();
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.keyboard.press('ControlOrMeta+z');
await page.waitForTimeout(200);
check(
  (await page.locator('.toast').textContent()).includes(`Remove ${first}`),
  'the removal is a step of the editor’s too',
);
await openParts();
check(
  JSON.stringify(await partNames()) === JSON.stringify(parts),
  'which undo takes back once the window is closed',
);
check((await sheet.locator('.put-back').count()) === 0, 'a window opened again offers nothing');

// a part's name typed, then a press on a button: the list was drawn again under the press, and
// the press did nothing
await sheet.locator('.part-row input[aria-label="Part name"]').first().click();
await page.keyboard.type('x');
await sheet.getByRole('button', { name: 'Close', exact: true }).click();
await page.waitForTimeout(600);
check(
  (await page.locator('.sheet').count()) === 0,
  'a button pressed straight after a part is named acts at that press',
);
await openParts();
check((await partNames())[0] === `${first}x`, 'and the name is kept');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// two versions of one name were two rows that could not be told apart
await page.getByRole('button', { name: 'History' }).click();

for (let saved = 0; saved < 2; saved++) {
  await page.fill('#version-name', 'Before the kit');
  await page.getByRole('button', { name: 'Save a version' }).click();
  await page.waitForTimeout(600);
}

const versions = await page.locator('.version-row .view-name').allTextContents();

check(
  versions.includes('Before the kit') && versions.includes('Before the kit 2'),
  `a version named as an earlier one is numbered (${versions.join(', ')})`,
);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// a project copied twice was two rows named "… copy"
const wordmark = async () => (await page.locator('.wordmark small').textContent()).trim();
const name = await wordmark();
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.sheet .project-row');
  await page.waitForTimeout(600);
};
const copied = async () => {
  await page.waitForTimeout(1500);

  // Escape in the name's field gives the keys back first, and closes the window at the next
  for (let press = 0; press < 3 && (await page.locator('.sheet').count()); press++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  return wordmark();
};

await waitSaved(page);
await openProjects();
await projectsPage(page, 'This project');
await sheet.getByRole('button', { name: 'Duplicate', exact: true }).click();
check((await copied()) === `${name} copy`, 'a copy is named after its project');
await openProjects();
await page
  .locator('.sheet .project-row', { has: page.getByText(name, { exact: true }) })
  .locator('.row-more')
  .click();
await page.getByRole('menuitem', { name: 'Duplicate', exact: true }).click();
check((await copied()) === `${name} copy 2`, 'and a second copy of it is numbered');

await finish();
