import { openStudio } from './harness.mjs';
import { studioServer } from './studio-server.mjs';

// Claude Code given a key in Projects: what it makes through /mcp opens in the studio, and the key
// turned off reaches nothing.
const server = await studioServer();
const { page, check, finish, shots } = await openStudio({
  viewport: { width: 1280, height: 800 },
  address: server.address,
});

async function toClaudeCode() {
  await page.locator('button.wordmark').click();
  await page.locator('#claude-code').click();
  await page.waitForSelector('#make-mcp-key', { timeout: 15000 });
}

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

  return { status: answer.status, json: await answer.json().catch(() => null) };
}

await page.waitForSelector('#sign-in-email', { timeout: 15000 });
await page.locator('.segmented').getByRole('button', { name: 'Create account' }).click();
await page.fill('#sign-in-email', 'claude@example.com');
await page.fill('#sign-in-password', 'pixels-forever');
await page.keyboard.press('Enter');
await page.getByRole('button', { name: 'Try the example character' }).click({ timeout: 15000 });
await page.waitForTimeout(2500);

await toClaudeCode();
check(
  /No key yet/.test(await page.locator('.sheet .claude-code').textContent()),
  'an account starts with no key',
);
await page.locator('#make-mcp-key').click();
await page.waitForSelector('#mcp-command');

const command = await page.locator('#mcp-command').inputValue();
const secret = command.match(/Bearer (psk_[\w-]+)/)?.[1];

await page.screenshot({ path: `${shots}/claude-code-key.png` });
check(
  command.includes(`${new URL(server.address).origin}/mcp`) && secret,
  'the window gives the command that adds the studio to Claude Code',
);

const made = await callTool(secret, 'new_project', {
  name: 'Robot',
  kind: 'icon',
  width: 16,
  height: 16,
});

await callTool(secret, 'set_pixels', {
  project: 'Robot',
  rows: ['aaaa', 'a..a', 'aaaa'],
  palette: { a: '#3366ff' },
  at: { x: 6, y: 6 },
});
check(
  /Made Robot/.test(made.json?.result?.content?.[0]?.text),
  'Claude Code makes a project with the key',
);

await page.reload();
await page.waitForSelector('.save-status', { timeout: 15000 });
await page.locator('button.wordmark').click();
await page.locator('.row-open', { hasText: 'Robot' }).click({ timeout: 15000 });
await page.waitForTimeout(1500);
check(
  /Robot/.test(
    await page.locator('.save-status').evaluate(() => document.title + document.body.innerText),
  ),
  'the studio opens what Claude Code made',
);
await page.screenshot({ path: `${shots}/claude-code-robot.png` });

await toClaudeCode();
check(
  /Last used/.test(await page.locator('.sheet .claude-code').textContent()),
  'the window says when the key was used',
);
await page.locator('#remove-mcp-key').click();
await page.locator('.sheet .btn.danger', { hasText: 'Turn off' }).click();
await page.waitForTimeout(500);
check(
  /No key yet/.test(await page.locator('.sheet .claude-code').textContent()),
  'the key turned off is gone',
);
check((await callTool(secret, 'list_projects', {})).status === 401, 'and reaches nothing');

server.stop();
await finish();
