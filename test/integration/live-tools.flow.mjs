import { openStudio } from './harness.mjs';
import { createProject, waitSaved } from './studio.mjs';
import { studioServer } from './studio-server.mjs';

// An AI tool drawing through /mcp on the project open in the studio: the page shows each change
// as it lands, with no reload, keeps the person's own work beside it, never saves its older copy
// over it, and takes it back as one step of Undo.
const server = await studioServer();
const { page, check, finish, shots } = await openStudio({
  viewport: { width: 1280, height: 800 },
  address: server.address,
});
const canvas = page.getByLabel('Pixel canvas');

async function callTool(secret, name, args) {
  const answer = await fetch(new URL('mcp', server.address), {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });

  const { content } = (await answer.json()).result;

  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// the art's pixels of one colour, read from the middle of each so the grid lines stay out of it
const pixels = (hex) =>
  canvas.evaluate((element, colour) => {
    const size = 16;
    const scale = element.width / size;
    const context = element.getContext('2d');
    const wanted = [1, 3, 5].map((start) => parseInt(colour.slice(start, start + 2), 16));
    const found = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const middle = [(x + 0.5) * scale, (y + 0.5) * scale].map(Math.floor);
        const { data } = context.getImageData(...middle, 1, 1);

        if (wanted.every((value, i) => data[i] === value)) {
          found.push(`${x},${y}`);
        }
      }
    }

    return found;
  }, hex);

async function savedCount(secret, hex) {
  const said = await callTool(secret, 'read_frame', { project: 'Gem', as: 'text' });
  const mark = said.match(new RegExp(`(\\w)=${hex}`, 'i'))?.[1];
  const rows = said.slice(said.indexOf('.=clear')).split('\n').slice(1).join('');

  return mark ? rows.split(mark).length - 1 : 0;
}

async function waitFor(what, ms = 8000) {
  const until = Date.now() + ms;

  while (Date.now() < until) {
    if (await what()) {
      return true;
    }

    await page.waitForTimeout(150);
  }

  return false;
}

async function makeKey() {
  await page.locator('button.wordmark').click();
  await page.locator('#claude-code').click();
  await page.locator('#make-mcp-key').click();
  await page.waitForSelector('#mcp-command');

  const command = await page.locator('#mcp-command').inputValue();

  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  return command.match(/Bearer (psk_[\w-]+)/)[1];
}

async function drawOwnPixel() {
  const art = await canvas.boundingBox();
  const zoom = art.width / 16;

  await page
    .locator('#rail')
    .getByRole('button', { name: /^Pencil/ })
    .click();
  await page.mouse.click(art.x + 12.5 * zoom, art.y + 12.5 * zoom);
  await page.mouse.move(2, 2);
}

await page.waitForSelector('#sign-in-email', { timeout: 15000 });
await page.locator('.segmented').getByRole('button', { name: 'Create account' }).click();
await page.fill('#sign-in-email', 'watcher@example.com');
await page.fill('#sign-in-password', 'pixels-forever');
await page.keyboard.press('Enter');
await page.getByRole('radio', { name: /^Icon/ }).waitFor({ timeout: 15000 });
await createProject(page, { kind: 'Icon', name: 'Gem', width: 16 });
await waitSaved(page);

const secret = await makeKey();
const ownColour = await page.inputValue('#colour-hex');

await drawOwnPixel();
await waitSaved(page);
check((await pixels(ownColour)).includes('12,12'), 'the person draws a pixel of their own');

await callTool(secret, 'set_pixels', {
  project: 'Gem',
  rows: ['aaaa'],
  palette: { a: '#3366ff' },
  at: { x: 2, y: 2 },
});
check(
  await waitFor(async () => (await pixels('#3366ff')).length === 4),
  'what the tool draws shows on the open page, with no reload',
);
check((await pixels(ownColour)).includes('12,12'), 'and the person’s own pixel is still there');
await page.screenshot({ path: `${shots}/live-tools-drawn.png` });

await callTool(secret, 'set_pixels', {
  project: 'Gem',
  rows: ['a', 'a'],
  palette: { a: '#3366ff' },
  at: { x: 2, y: 3 },
});
check(
  await waitFor(async () => (await pixels('#3366ff')).length === 6),
  'each next change shows as it lands',
);

// longer than the page waits before it saves: an older copy saved now would rub the tool's out
await page.waitForTimeout(2000);
check(
  (await savedCount(secret, '#3366ff')) === 6,
  'the page never saves its older copy over what the tool drew',
);

await page.getByRole('button', { name: 'Undo', exact: true }).click();
check(
  await waitFor(async () => (await pixels('#3366ff')).length === 4),
  'Undo takes back the tool’s last change as one step',
);
await waitSaved(page);
check(
  (await savedCount(secret, '#3366ff')) === 4,
  'and what Undo put back is saved for the tool to read',
);

server.stop();
await finish();
