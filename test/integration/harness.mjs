import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const playwright = createRequire(`${process.cwd()}/`)('playwright');
const { devices } = playwright;
// Chromium unless told otherwise: STUDIO_BROWSER=webkit runs a flow on Safari's engine
const engineName = process.env.STUDIO_BROWSER ?? 'chromium';
const engine = playwright[engineName];

// What only Chromium's own tools can say or do (what stops an install, opening with the network
// off) is left out on another browser, and said to be.
export const onChromium = engineName === 'chromium';

// The pointer events a finger makes, made by hand in the page: down on what lies under the
// finger, then on to whatever took hold of that pointer, as a browser does with a touch.
function handMadeTouches() {
  const held = new Map();
  const places = new Map();
  const capture = window.Element.prototype.setPointerCapture;
  const send = (kind, id, [x, y]) => {
    const target = held.get(id) ?? document.elementFromPoint(x, y) ?? document.body;

    held.set(id, target);
    target.dispatchEvent(
      new window.PointerEvent(kind, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: id,
        pointerType: 'touch',
        isPrimary: [...places.keys()][0] === id,
        clientX: x,
        clientY: y,
        button: kind === 'pointermove' ? -1 : 0,
        buttons: kind === 'pointerup' ? 0 : 1,
      }),
    );
  };

  // a hand-made pointer is no pointer the browser knows: the hold on it is kept here instead
  window.Element.prototype.setPointerCapture = function hold(id) {
    return held.has(id) ? held.set(id, this) : capture.call(this, id);
  };

  window.handMadeTouch = (type, points) => {
    const ids = points.map((point, i) => 1000 + i);

    for (const id of [...places.keys()].filter((known) => !ids.includes(known))) {
      send('pointerup', id, places.get(id));
      places.delete(id);
      held.delete(id);
    }

    points.forEach((point, i) => {
      const fresh = !places.has(ids[i]);

      places.set(ids[i], point);
      send(fresh ? 'pointerdown' : 'pointermove', ids[i], point);
    });
  };
}

// A finger's touches, as touch(type, points) with type touchStart, touchMove or touchEnd and
// every finger now down in points. Chromium sends real touches through its own tools; no other
// browser's driver can drag a finger, so there the pointer events of a touch are made by hand.
export async function fingers(context, page) {
  if (onChromium) {
    const tools = await context.newCDPSession(page);

    return (type, points) =>
      tools.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: points.map(([x, y], id) => ({ x, y, id })),
      });
  }

  await page.addInitScript(handMadeTouches);
  await page.evaluate(handMadeTouches);

  return (type, points) =>
    page.evaluate(([kind, where]) => window.handMadeTouch(kind, where), [type, points]);
}

// The page on a fresh browser profile, with its errors collected and a list of checks that fail
// the flow. args: [url, images, shots]; a flow with a server of its own gives its `address`.
export async function openStudio({
  device = null,
  viewport = { width: 1440, height: 960 },
  initScript = null,
  address = null,
} = {}) {
  const [given, images, shots] = process.argv.slice(2);
  const url = address ?? given;

  mkdirSync(shots, { recursive: true });
  const browser = await engine.launch();
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
