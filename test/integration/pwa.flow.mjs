// The studio as an app: its manifest and icons, the service worker, opening with no network with
// the saved work there, the Install button, and a host where service workers are not allowed.
import { openStudio } from './harness.mjs';
import { openExample } from './studio.mjs';

const { browser, context, page, check, finish, url, shots } = await openStudio();
const base = new URL('.', url).href;
const picture = () => page.locator('.canvas-holder canvas').evaluate((el) => el.toDataURL());

const manifest = await page.evaluate(
  async (address) => (await fetch(address)).json(),
  `${base}manifest.webmanifest`,
);
check(manifest.display === 'standalone', 'the manifest opens the app in its own window');
check(manifest.name === 'Pixel Clean Studio', 'and names it');

for (const { src, sizes } of manifest.icons) {
  const width = await page.evaluate(async (address) => {
    const image = new Image();

    image.src = address;
    await image.decode();

    return image.naturalWidth;
  }, `${base}${src}`);

  check(`${width}x${width}` === sizes, `${src} is ${sizes}`);
}

check((await page.locator('link[rel="manifest"]').count()) === 1, 'the page links the manifest');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => navigator.serviceWorker.controller);
check(true, 'the service worker takes the page');

const browserTools = await context.newCDPSession(page);
const { installabilityErrors } = await browserTools.send('Page.getInstallabilityErrors');
// the test's browser profile is a private window, where nothing can be installed
const blocking = installabilityErrors.filter(({ errorId }) => errorId !== 'in-incognito');
check(
  blocking.length === 0,
  `the browser finds nothing that stops an install (${blocking.map(({ errorId }) => errorId)})`,
);

await openExample(page);
await page.keyboard.press('b');
const box = await page.locator('.canvas-holder canvas').boundingBox();
await page.mouse.click(box.x + 20, box.y + 20);
await page.waitForSelector('[data-state="saved"]');
const saved = await picture();
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(400);

await context.setOffline(true);
await page.reload();
await page.waitForSelector('.grid-panel');
await page.waitForTimeout(400);
check(true, 'with no network the app still opens');
check((await picture()) === saved, 'and the saved work is there');
await page.goto(base);
await page.waitForSelector('.grid-panel');
check(true, 'from its start address too');
await context.setOffline(false);

const install = page.getByRole('button', { name: 'Install app' });
check((await install.count()) === 0, 'there is no Install button until the browser allows it');
await page.evaluate(() => {
  const event = new window.Event('beforeinstallprompt', { cancelable: true });

  event.prompt = async () => {
    window.installAsked = true;
  };
  window.dispatchEvent(event);
});
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/pwa-install.png` });
await install.click();
check(await page.evaluate(() => window.installAsked), 'Install app asks the browser to install');
await page.waitForTimeout(150);
check((await install.count()) === 0, 'and the button goes');

const sandboxed = await browser.newContext();
const plainPage = await sandboxed.newPage();
const problems = [];

plainPage.on('pageerror', (error) => problems.push(error.message));
await plainPage.addInitScript(() => {
  localStorage.setItem('pixel-clean-quick-start', '1');
  Object.defineProperty(window.Navigator.prototype, 'serviceWorker', {
    get() {
      throw new window.DOMException('The document is sandboxed', 'SecurityError');
    },
  });
});
await plainPage.goto(url);
await plainPage.getByRole('button', { name: 'Try the example character' }).waitFor();
check(problems.length === 0, 'where service workers are not allowed the page still works');
check(
  (await plainPage.locator('link[rel="manifest"]').count()) === 0,
  'and links no manifest it may not have',
);

await finish();
