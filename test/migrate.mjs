import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(process.argv[2]);
await page.waitForTimeout(1200);
// make an edit so the sample is saved, then wait for the save
const canvas = page.getByLabel('Pixel canvas');
const box = await canvas.boundingBox();
const zoom = box.width / 160;
await page.mouse.click(box.x + 10 * zoom, box.y + 10 * zoom);
await page.waitForTimeout(2500);
const docs = await page.evaluate(
  () =>
    new Promise((res) => {
      const request = indexedDB.open('pixel-clean-studio', 1);
      request.onsuccess = () => {
        const store = request.result.transaction('docs').objectStore('docs').getAllKeys();
        store.onsuccess = () => res(store.result);
      };
    }),
);
console.log(
  'stored keys',
  docs.filter((key) => !key.startsWith('layer-')),
  docs.filter((key) => key.startsWith('layer-')).length,
  'layers',
);
// remove the projects list and the new fields, as version 4 left storage
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
          const part = JSON.parse(getAll.result.json);
          delete part.id;
          delete part.profile;
          delete part.directionSet;
          delete part.parts;
          delete part.outfits;
          delete part.version;
          part.kitParts = { shirt: [1], shorts: [], socks: [], trim: [] };
          store.put({ json: JSON.stringify(part) }, 'project');
        };
        tx.oncomplete = res;
      };
    }),
);
await page.reload();
await page.waitForTimeout(1500);
console.log('opened', await page.locator('button.wordmark small').textContent());
console.log(
  'pixel kept',
  await page.evaluate(
    () =>
      document.querySelector('#statusbar').textContent.includes('16 colours') ||
      document.querySelector('#statusbar').textContent,
  ),
);
await page.locator('button.wordmark').click();
console.log(
  'projects listed',
  await page.locator('.version-row').count(),
  await page.locator('#current-project-name').inputValue(),
);
await page.keyboard.press('Escape');
console.log('errors', JSON.stringify(errors));
await browser.close();
