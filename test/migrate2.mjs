import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 960 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('pixel-clean-quick-start', '1'); localStorage.setItem('pixel-clean-folded', '[]'); });
await page.goto(process.argv[2]); await page.waitForTimeout(1200);
const canvas = page.getByLabel('Pixel canvas'); const box = await canvas.boundingBox(); const z = box.width / 160;
await page.mouse.click(box.x + 10 * z, box.y + 10 * z); await page.waitForTimeout(2500);
// back to version 4's layout: no list, no id
await page.evaluate(() => new Promise((res) => { const r = indexedDB.open('pixel-clean-studio', 1); r.onsuccess = () => { const tx = r.result.transaction('docs', 'readwrite'); const s = tx.objectStore('docs'); s.delete('projects'); const g = s.get('project'); g.onsuccess = () => { const p = JSON.parse(g.result.json); delete p.id; delete p.profile; s.put({ json: JSON.stringify(p) }, 'project'); }; tx.oncomplete = res; }; }));
await page.reload(); await page.waitForTimeout(1500);
// straight away, without editing, make a new project
await page.locator('button.wordmark').click();
await page.fill('#project-name', 'Knight');
await page.getByRole('button', { name: 'Create project' }).click(); await page.waitForTimeout(2500);
await page.reload(); await page.waitForTimeout(1500);
await page.locator('button.wordmark').click();
console.log('open', await page.locator('#current-project-name').inputValue(), '| listed', await page.locator('.version-row .view-name').allTextContents());
await page.locator('.version-row', { hasText: 'Sochetra' }).getByRole('button', { name: 'Open' }).click(); await page.waitForTimeout(1000);
console.log('reopened', await page.locator('button.wordmark small').textContent(), '| front', await page.locator('.view-row .view-meta').first().textContent());
await page.reload(); await page.waitForTimeout(1500);
await page.locator('button.wordmark').click();
console.log('after reload listed', await page.locator('.version-row').count());
console.log('errors', JSON.stringify(errors));
await browser.close();
