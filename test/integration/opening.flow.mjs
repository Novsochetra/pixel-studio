// Opening on claude.ai, where the saved work can take a while to come, or never come: the page
// says so instead of staying blank, and still opens.
import { openStudio } from './harness.mjs';

// a viewer that never answers for the saved work, as when a permission prompt waits unseen
const silentClaude = () => {
  window.claude = { use: () => new Promise(() => {}) };
};

const { page, check, finish } = await openStudio({ initScript: silentClaude });
const text = () => page.locator('body').innerText();
check((await text()).includes('Opening your work…'), 'while it waits, the page says it is opening');
await page.waitForTimeout(6500);
check(
  (await text()).includes('Still waiting for claude.ai'),
  'after a while it says what it is waiting for',
);
await page.waitForSelector('.start-screen .start-card', { timeout: 15000 });
check(
  (await page.locator('[role="status"].start-screen').count()) === 0,
  'and once claude.ai gives up, the start screen opens in its place',
);
await finish();
