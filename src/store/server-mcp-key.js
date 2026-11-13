import { refusalOf } from './server-account.js';

const WAIT_MS = 8000;

async function call(method) {
  const answer = await fetch('/api/account/mcp-key', {
    method,
    credentials: 'same-origin',
    signal: AbortSignal.timeout(WAIT_MS),
    headers: { accept: 'application/json' },
  }).catch(() => null);

  if (!answer?.ok) {
    throw answer ? await refusalOf(answer) : new Error('The server could not be reached.');
  }

  return (await answer.json()).key;
}

// The account's key for Claude Code: { createdAt, lastUsedAt }, or null with none. A key made
// has its `secret` too, which the server gives only then.
export const mcpKey = () => call('GET');
export const makeMcpKey = () => call('POST');
export const removeMcpKey = () => call('DELETE');

// what Claude Code is told to add: the studio's /mcp, in every folder (user scope)
export const addCommand = (secret, origin = location.origin) =>
  `claude mcp add --transport http --scope user pixel-studio ${origin}/mcp --header "Authorization: Bearer ${secret}"`;
