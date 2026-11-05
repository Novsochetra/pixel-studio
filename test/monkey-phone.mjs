import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const url = process.argv[2];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}`));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('filechooser', () => {});
page.on('download', () => {});
await page.addInitScript(() => { localStorage.setItem('pixel-clean-quick-start', '1'); localStorage.setItem('pixel-clean-folded', '[]'); });
await page.goto(url); await page.waitForTimeout(1200);
let clicks = 0;
const closeSheets = async () => { for (let i = 0; i < 3; i++) { if (await page.locator('.sheet-backdrop').count()) await page.keyboard.press('Escape'); } await page.locator('.menu').evaluateAll((m) => m.forEach((x) => x.remove())); };

async function clickAll(scope, label, skip = /Delete|Clear marks|Go back|Wear it|Apply to|Use them all|Use for/) {
  const n = await page.locator(`${scope} button:visible`).count();
  for (let i = 0; i < n; i++) {
    const button = page.locator(`${scope} button:visible`).nth(i);
    if (!(await button.count())) break;
    const name = ((await button.getAttribute('aria-label')) || (await button.textContent()) || '').trim();
    if (skip.test(name) || (await button.isDisabled())) continue;
    const before = errors.length;
    await button.click({ timeout: 2000 }).catch(() => {});
    clicks++;
    await page.waitForTimeout(60);
    if (errors.length > before) console.log(`ERROR after ${label} → "${name}":`, errors.slice(before));
    if (label !== 'sheet') await closeSheets();
  }
}

for (const mode of ['Edit', 'Views board', 'On the pitch']) {
  await page.getByRole('button', { name: mode, exact: true }).click();
  await page.waitForTimeout(300);
  await clickAll('#toolbar', `${mode} toolbar`, /Download|History|Delete|^\?$/);
  await clickAll('#rail', `${mode} rail`);
  await clickAll('#stage', `${mode} stage`);
  await clickAll('#inspector', `${mode} inspector`);
}

// every dialog, and every button inside it
const dialogs = [
  ['Swap colours…', null], ['Team kits…', null], ['History', null], ['Keyboard shortcuts', null],
  ['Download', /Sprite sheet/], ['Download', /ChatGPT/],
];
for (const [opener, item] of dialogs) {
  await page.getByRole('button', { name: opener }).first().click().catch(() => {});
  if (item) await page.getByRole('menuitem', { name: item }).click().catch(() => {});
  await page.waitForTimeout(300);
  await clickAll('.sheet', 'sheet', /Delete|Go back|Wear it|Apply to|Close|Cancel|Done|OK/);
  await closeSheets();
}

// every option of every select in the inspector
const selects = await page.locator('#inspector select:visible').count();
for (let i = 0; i < selects; i++) {
  const select = page.locator('#inspector select:visible').nth(i);
  const values = await select.locator('option').evaluateAll((o) => o.map((x) => x.value).filter(Boolean)).catch(() => []);
  for (const value of values.slice(0, 6)) { await select.selectOption(value).catch(() => {}); clicks++; await page.waitForTimeout(40); }
}
await page.keyboard.press('Meta+z'); await page.keyboard.press('Meta+z'); await page.keyboard.press('Meta+Shift+z');
console.log('clicks', clicks, 'errors', JSON.stringify(errors));
await browser.close();
