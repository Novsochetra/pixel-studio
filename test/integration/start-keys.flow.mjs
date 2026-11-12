// The start screen in a short window: Create stays at the form's foot, and a field the keys
// move to is never under it.
import { openStudio } from './harness.mjs';

const { page, check, finish, shots } = await openStudio({ viewport: { width: 1280, height: 640 } });
const hidden = [];

await page.locator('.start-card[aria-checked="true"]').focus();

for (let stop = 0; stop < 14; stop++) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(80);
  const under = await page.evaluate(() => {
    const field = document.activeElement;
    const foot = document.querySelector('.start-chooser .sheet-actions');

    if (!field?.closest('.start-chooser') || foot.contains(field)) {
      return null;
    }

    const over = field.getBoundingClientRect().bottom - foot.getBoundingClientRect().top;

    return over > 0
      ? `${field.id || field.getAttribute('aria-label') || field.tagName} by ${Math.round(over)}px`
      : null;
  });

  if (under) {
    hidden.push(under);
  }
}

check(
  hidden.length === 0,
  `every field the keys move to is clear of Create at the foot (${hidden.join('; ') || 'all clear'})`,
);
await page.screenshot({ path: `${shots}/start-keys.png` });

await finish();
