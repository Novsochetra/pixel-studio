import { openStudio } from './harness.mjs';
import { studioServer } from './studio-server.mjs';

// Saved work in an account: made in one browser, it opens in another signed in to the same one.
const server = await studioServer();
const { browser, page, check, finish, errors } = await openStudio({
  viewport: { width: 1280, height: 800 },
  address: server.address,
});
const ACCOUNT = { email: 'artist@example.com', password: 'pixels-forever' };

async function signIn(where, { password = ACCOUNT.password, making = false } = {}) {
  await where.waitForSelector('#sign-in-email', { timeout: 15000 });

  if (making) {
    await where.locator('.segmented').getByRole('button', { name: 'Create account' }).click();
  }

  await where.fill('#sign-in-email', ACCOUNT.email);
  await where.fill('#sign-in-password', password);
  await where.keyboard.press('Enter');
}

const saveStatus = (where) => where.locator('.save-status').textContent();

check(await page.locator('#sign-in-email').isVisible(), 'the studio asks who is drawing');

await page.locator('.segmented').getByRole('button', { name: 'Create account' }).click();
await page.fill('#sign-in-email', ACCOUNT.email);
await page.fill('#sign-in-password', 'short');
await page.keyboard.press('Enter');
check(
  await page.locator('#sign-in-password').evaluate((field) => !field.checkValidity()),
  'a password under 8 characters is not sent',
);

await signIn(page, { making: true });
await page.getByRole('button', { name: 'Try the example character' }).click({ timeout: 15000 });
await page.waitForTimeout(2500);
check(/your account/.test(await saveStatus(page)), 'the project is saved to the account');

const canvas = page.getByLabel('Pixel canvas');
const box = await canvas.boundingBox();

await page.keyboard.press('b');
await page.mouse.move(box.x + 20, box.y + 20);
await page.mouse.down();
await page.mouse.move(box.x + 80, box.y + 20, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(3000);
check(/Saved to your account/.test(await saveStatus(page)), 'a stroke is saved to the account');

const elsewhere = await (
  await browser.newContext({ viewport: { width: 1280, height: 800 } })
).newPage();

elsewhere.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
await elsewhere.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));
await elsewhere.goto(server.address);
await signIn(elsewhere, { password: 'not-the-password' });
await elsewhere.waitForTimeout(500);
check(
  /do not match/.test(await elsewhere.locator('.sign-in .start-warning').textContent()),
  'a wrong password is told so',
);

await signIn(elsewhere);
await elsewhere.waitForSelector('.save-status', { timeout: 15000 });
await elsewhere.waitForTimeout(2000);

const here = await canvas.screenshot();
const there = await elsewhere.getByLabel('Pixel canvas').screenshot();

check(Buffer.compare(here, there) === 0, 'another browser opens the same project, stroke and all');

await elsewhere.locator('button.wordmark').click();
await elsewhere.waitForTimeout(500);
check(
  (await elsewhere.locator('.sheet').textContent()).includes(ACCOUNT.email),
  'Projects says whose work it is',
);
await elsewhere.locator('#sign-out').click();
await elsewhere.waitForSelector('#sign-in-email', { timeout: 15000 });
check(true, 'signing out goes back to sign in');

server.stop();
await page.waitForTimeout(500);
await page.mouse.move(box.x + 20, box.y + 40);
await page.mouse.down();
await page.mouse.move(box.x + 80, box.y + 40, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(3000);
check(
  /on this device/.test(await saveStatus(page)),
  'with the server gone, a stroke is kept on this device, and the toolbar says so',
);

// the failed requests of a server gone are the point of the check above, not the page's errors
errors.splice(
  0,
  errors.length,
  ...errors.filter((error) => !/Failed to (load|fetch)|ERR_CONNECTION/.test(error)),
);
await finish();
