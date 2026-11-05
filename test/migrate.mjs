import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await page.goto(process.argv[2]); await page.waitForTimeout(1200);
// make an edit so the sample is saved, then wait for the save
const canvas = page.getByLabel('Pixel canvas'); const box = await canvas.boundingBox(); const z = box.width / 160;
await page.mouse.click(box.x + 10 * z, box.y + 10 * z);
await page.waitForTimeout(2500);
const docs = await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('pixel-clean-studio', 1); r.onsuccess = () => { const s = r.result.transaction('docs').objectStore('docs').getAllKeys(); s.onsuccess = () => res(s.result); }; }));
console.log('stored keys', docs.filter((k) => !k.startsWith('layer-')), docs.filter((k) => k.startsWith('layer-')).length, 'layers');
// remove the projects list and the new fields, as version 4 left storage
await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('pixel-clean-studio', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const store = tx.objectStore('docs'); store.delete('projects'); const g = store.get('project'); g.onsuccess = () => { const p = JSON.parse(g.result.json); delete p.id; delete p.profile; delete p.directionSet; delete p.parts; delete p.outfits; delete p.version; p.kitParts = { shirt: [1], shorts: [], socks: [], trim: [] }; store.put({ json: JSON.stringify(p) }, 'project'); }; tx.oncomplete = res; }; }));
await page.reload(); await page.waitForTimeout(1500);
console.log('opened', await page.locator('button.wordmark small').textContent());
console.log('pixel kept', await page.evaluate(() => document.querySelector('#statusbar').textContent.includes('16 colours') || document.querySelector('#statusbar').textContent));
await page.locator('button.wordmark').click();
console.log('projects listed', await page.locator('.version-row').count(), await page.locator('#current-project-name').inputValue());
await page.keyboard.press('Escape');
console.log('errors', JSON.stringify(errors));
await browser.close();
