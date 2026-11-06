// Work saved by earlier versions opens intact: version 4 left one project with plain document
// names and no list; version 5 a list of projects, each view with its own number of frames.
import { openStudio } from './harness.mjs';
import { frameLabels, selectView, showAllViews, waitSaved } from './studio.mjs';

const { page, context, check, finish, url } = await openStudio();

// writes documents straight into the page's storage, as an earlier version left them
async function seed(target, docs) {
  await target.evaluate(
    (entries) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('pixel-clean-studio', 1);

        request.onerror = reject;
        request.onsuccess = () => {
          const tx = request.result.transaction('docs', 'readwrite');

          entries.forEach(([key, value]) => tx.objectStore('docs').put(value, key));
          tx.oncomplete = resolve;
        };
      }),
    Object.entries(docs),
  );
}

// a layer's pixels as the studio stores them: a red block on a clear canvas
const png = (target, width) =>
  target.evaluate((size) => {
    const canvas = document.createElement('canvas');

    canvas.width = size;
    canvas.height = size;
    const context2d = canvas.getContext('2d');
    context2d.fillStyle = 'rgb(200, 30, 30)';
    context2d.fillRect(size / 4, size / 4, size / 2, size / 2);

    return canvas.toDataURL();
  }, width);

const frame = (id) => ({ id: `f${id}`, layers: [{ id: `l${id}`, name: 'Art' }] });
const project = (extra, directions) => ({
  canvas: { width: 32, height: 32, scale: 4 },
  referenceDirection: 'south',
  guides: [],
  palettes: [],
  mappings: [],
  animations: [{ id: 'a1', name: 'Pose', fps: 8, directions }],
  ...extra,
});

await page.waitForSelector('.start-screen');
const art = await png(page, 32);
const v4 = project(
  { name: 'Old hero', kitParts: { shirt: [4278190335], shorts: [], socks: [], trim: [] } },
  { south: { frames: [frame(1)] }, east: { frames: [frame(2)] } },
);
await seed(page, {
  project: { json: JSON.stringify(v4) },
  'layer-l1': { png: art },
  'layer-l2': { png: art },
});
await page.reload();
await page.waitForSelector('.grid-panel');
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Old hero'),
  'a version 4 project opens',
);
check(
  (await page.getByRole('button', { name: 'Team kits…' }).count()) === 1,
  'as a Naga Eleven character, team kits and all',
);
check(
  (await page.getByRole('button', { name: 'On the pitch', exact: true }).count()) === 1,
  'previewed on the pitch',
);
check(
  (await page.locator('#statusbar span').nth(2).textContent()).startsWith('sprite 16×16'),
  'with its pixels',
);
await page.mouse.click(10, 300);
await waitSaved(page);
await page.reload();
await page.waitForSelector('.grid-panel');
check(
  (await page.locator('button.wordmark small').textContent()).startsWith('Old hero'),
  'and opens again after a reload',
);

const other = await (
  await context.browser().newContext({ viewport: { width: 1440, height: 960 } })
).newPage();
await other.goto(url);
await other.waitForSelector('.start-screen');
const art5 = await png(other, 32);
const v5 = project(
  {
    id: 'p1',
    name: 'Knight',
    profile: 'generic',
    directionSet: 'four',
    version: 2,
    parts: [],
    outfits: [],
  },
  { south: { frames: [frame(1), frame(2), frame(3)] }, east: { frames: [frame(4)] } },
);
const layers = Object.fromEntries([1, 2, 3, 4].map((id) => [`p-p1-layer-l${id}`, { png: art5 }]));
await seed(other, {
  projects: {
    list: [{ id: 'p1', name: 'Knight', profile: 'generic', prefix: 'p-p1-', updatedAt: 1 }],
    current: 'p1',
  },
  'p-p1-project': { json: JSON.stringify(v5) },
  ...layers,
});
await other.reload();
await other.waitForSelector('.grid-panel');
check(
  (await other.getByRole('button', { name: 'Preview', exact: true }).count()) === 1,
  'a version 5 project for any game opens with a plain preview',
);
await selectView(other, 'Side');
check(
  JSON.stringify(await frameLabels(other)) === '["1","2","3"]',
  'a view with fewer frames gets copies of its last one',
);
await waitSaved(other);
await other.reload();
await other.waitForSelector('.grid-panel');
await showAllViews(other);
await selectView(other, 'Side');
check(
  JSON.stringify(await frameLabels(other)) === '["1","2","3"]',
  'and they are saved with their pixels',
);

await finish();
