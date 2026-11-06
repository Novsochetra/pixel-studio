import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const { chromium, devices } = createRequire(`${process.cwd()}/`)('playwright');

// The page on a fresh browser profile, with its errors collected and a list of checks that fail
// the flow. args: [url, images, shots].
export async function openStudio({
  device = null,
  viewport = { width: 1440, height: 960 },
  initScript = null,
} = {}) {
  const [url, images, shots] = process.argv.slice(2);

  mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const options = device ? { ...devices[device] } : { viewport, deviceScaleFactor: 1 };
  const context = await browser.newContext({ ...options, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const failures = [];
  let checks = 0;
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
  page.on(
    'console',
    (message) => message.type() === 'error' && errors.push(`console: ${message.text()}`),
  );
  await page.addInitScript(() => localStorage.setItem('pixel-clean-quick-start', '1'));

  if (initScript) {
    await page.addInitScript(initScript);
  }

  await page.goto(url);
  await page.waitForTimeout(800);

  const check = (ok, what) => {
    checks += 1;

    if (!ok) {
      failures.push(what);
    }

    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  };

  const finish = async () => {
    await browser.close();
    const problems = [...failures.map((what) => `failed: ${what}`), ...errors];
    console.log(
      `RESULT ${checks} checks, ${problems.length ? `${problems.length} problems` : 'all passed'}`,
    );
    problems.forEach((problem) => console.log(`  ${problem}`));
    process.exit(problems.length ? 1 : 0);
  };

  return { browser, context, page, errors, check, finish, url, images, shots };
}
