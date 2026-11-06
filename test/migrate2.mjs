import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(process.argv[2]);
await page.waitForTimeout(1200);
const canvas = page.getByLabel('Pixel canvas');
const box = await canvas.boundingBox();
const zoom = box.width / 160;
await page.mouse.click(box.x + 10 * zoom, box.y + 10 * zoom);
await page.waitForTimeout(2500);
// back to version 4's layout: no list, no id
await page.evaluate(
  () =>
    new Promise((res) => {
      const request = indexedDB.open('pixel-clean-studio', 1);
      request.onsuccess = () => {
        const tx = request.result.transaction('docs', 'readwrite');
        const store = tx.objectStore('docs');
        store.delete('projects');
        const getAll = store.get('project');
        getAll.onsuccess = () => {
          const put = JSON.parse(getAll.result.json);
          delete put.id;
          delete put.profile;
          store.put({ json: JSON.stringify(put) }, 'project');
        };
        tx.oncomplete = res;
      };
    }),
);
await page.reload();
await page.waitForTimeout(1500);
// straight away, without editing, make a new project
await page.locator('button.wordmark').click();
await page.fill('#project-name', 'Knight');
await page.getByRole('button', { name: 'Create project' }).click();
await page.waitForTimeout(2500);
await page.reload();
await page.waitForTimeout(1500);
await page.locator('button.wordmark').click();
console.log(
  'open',
  await page.locator('#current-project-name').inputValue(),
  '| listed',
  await page.locator('.version-row .view-name').allTextContents(),
);
await page
  .locator('.version-row', { hasText: 'Sochetra' })
  .getByRole('button', { name: 'Open' })
  .click();
await page.waitForTimeout(1000);
console.log(
  'reopened',
  await page.locator('button.wordmark small').textContent(),
  '| front',
  await page.locator('.view-row .view-meta').first().textContent(),
);
await page.reload();
await page.waitForTimeout(1500);
await page.locator('button.wordmark').click();
console.log('after reload listed', await page.locator('.version-row').count());
console.log('errors', JSON.stringify(errors));
await browser.close();
