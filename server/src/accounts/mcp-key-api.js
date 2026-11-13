import { randomBytes } from 'node:crypto';
import { sendError, sendJson } from '../http/responses.js';
import { route } from '../router.js';
import { currentUser } from './current-user.js';
import { tokenHash } from './sessions.js';

export const newMcpKey = () => `psk_${randomBytes(32).toString('base64url')}`;

// The key is shown once, as it is made: only its hash is kept, so it cannot be shown again.
async function keyRoute(request, response, { accounts, keys }) {
  const user = await currentUser(request, accounts);

  if (!user) {
    return sendError(response, { status: 401, message: 'Sign in to give Claude Code a key.' });
  }

  if (request.method === 'DELETE') {
    await keys.remove(user.id);

    return sendJson(response, { json: { key: null } });
  }

  if (request.method === 'POST') {
    const key = newMcpKey();

    await keys.replace(user.id, tokenHash(key));

    return sendJson(response, { json: { key: { secret: key, ...(await keys.about(user.id)) } } });
  }

  return sendJson(response, { json: { key: await keys.about(user.id) } });
}

// deps: { accounts, keys }
export function mcpKeyRoutes(deps) {
  const handle = (request, response) => keyRoute(request, response, deps);

  return [route('/api/account/mcp-key', { GET: handle, POST: handle, DELETE: handle })];
}
