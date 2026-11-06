// A game's cast: the next character set up like the last, every project's picture in the list
// (kept across visits, and made for projects saved before pictures were), and the line-up.
import { readFileSync } from 'node:fs';
import { openStudio } from './harness.mjs';
import { download, openExample, showAllViews, waitSaved } from './studio.mjs';
import { isPng } from './files.mjs';

const { page, check, finish, shots } = await openStudio();
const openProjects = async () => {
  await page.locator('button.wordmark').click();
  await page.waitForSelector('.project-row');
  await page.waitForTimeout(600);
};
const pictures = () =>
  page.locator('.project-row').evaluateAll((rows) =>
    rows.map((row) => ({
      name: row.querySelector('input')?.value ?? row.querySelector('.view-name').textContent,
      picture: row.querySelector('img.project-picture') !== null,
    })),
  );
const tabs = () => page.locator('.grid-tabs [role="tab"]').allTextContents();
const views = async () => {
  await showAllViews(page);

  return page.locator('.grid-view').allTextContents();
};

await openExample(page);
const heroViews = await views();
const heroTabs = await tabs();
await openProjects();
check((await pictures())[0].picture, "the open project's row shows its picture");
await page.getByRole('button', { name: 'New character like this' }).click();
await page.waitForTimeout(800);
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('New character'),
  'New character like this opens a new character',
);
check(
  (await page.evaluate(() => document.activeElement?.id)) === 'current-project-name',
  'with its name ready to type',
);
await page.fill('#current-project-name', 'Rival');
await page.press('#current-project-name', 'Enter');
await page.keyboard.press('Escape');
check(
  JSON.stringify(await views()) === JSON.stringify(heroViews),
  'it has the same views as the character it was made like',
);
check(JSON.stringify(await tabs()) === JSON.stringify(heroTabs), 'and the same animations');
check(
  (await page.locator('.grid-row.current .cell[aria-label*="empty"]').count()) ===
    (await page.locator('.grid-row.current .cell').count()),
  'with nothing drawn',
);

const canvas = await page.getByLabel('Pixel canvas').boundingBox();
for (let i = 0; i < 6; i++) {
  await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height * (0.3 + i * 0.05));
}
await page.waitForTimeout(1500);
await waitSaved(page);
await page.reload();
await page.waitForTimeout(1500);
await openProjects();
check(
  JSON.stringify(await pictures()) ===
    JSON.stringify([
      { name: 'Rival', picture: true },
      { name: 'Sochetra', picture: true },
    ]),
  'after a reload every project in the list shows its picture',
);
await page.screenshot({ path: `${shots}/cast-projects.png` });

await page.getByRole('button', { name: 'Line them up…' }).click();
await page.waitForSelector('.line-up-member');
check(
  JSON.stringify(await page.locator('.line-up-name').allTextContents()) === '["Sochetra","Rival"]',
  'the line-up stands every drawn project side by side',
);
const bottoms = await page
  .locator('.line-up-art canvas')
  .evaluateAll((all) => all.map((each) => Math.round(each.getBoundingClientRect().bottom)));
check(new Set(bottoms).size === 1, 'on one line');
await page.screenshot({ path: `${shots}/cast-line-up.png` });
const file = await download(page, () =>
  page.getByRole('button', { name: /^Download the line-up/ }).click(),
);
await file?.saveAs(`${shots}/line-up.png`);
check(
  /^line-up-\dx\.png$/.test(file?.suggestedFilename() ?? '') &&
    isPng(readFileSync(`${shots}/line-up.png`)),
  'the line-up downloads as a PNG',
);
await page.locator('.line-up-member', { hasText: 'Sochetra' }).click();
await page.waitForTimeout(800);
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Sochetra'),
  'clicking one in the line-up opens it',
);

// a project saved before pictures were kept has none stored: it is made from its saved art
await page.evaluate(
  () =>
    new Promise((done) => {
      const open = indexedDB.open('pixel-clean-studio', 1);

      open.onsuccess = () => {
        const store = open.result.transaction('docs', 'readwrite').objectStore('docs');
        const keys = store.getAllKeys();

        keys.onsuccess = () => {
          keys.result.filter((key) => key.endsWith('portrait')).forEach((key) => store.delete(key));
          store.transaction.oncomplete = done;
        };
      };
    }),
);
await page.reload();
await page.waitForTimeout(1500);
await openProjects();
check(
  (await pictures()).every((row) => row.picture),
  'projects saved before pictures were kept still show theirs',
);
await finish();
