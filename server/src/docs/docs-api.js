import { currentUser } from '../accounts/current-user.js';
import { readJson } from '../http/read-json.js';
import { sendError, sendJson } from '../http/responses.js';
import { route } from '../router.js';
import { isDocKey } from './doc-keys.js';

const NOT_A_KEY = { status: 400, message: 'That is not the name of a document.' };

// the signed-in account, or null with the refusal sent: saved work is its owner's alone
async function owner(request, response, accounts) {
  const user = await currentUser(request, accounts);

  if (!user) {
    sendError(response, { status: 401, message: 'Sign in to reach your saved work.' });
  }

  return user;
}

const isEntry = (entry) => Array.isArray(entry) && entry.length === 2 && isDocKey(entry[0]);

async function oneDoc(request, response, { accounts, docs, key }) {
  const user = await owner(request, response, accounts);

  if (!user) {
    return;
  }

  if (request.method === 'DELETE') {
    await docs.remove(user.id, key);

    return sendJson(response, { json: {} });
  }

  if (request.method !== 'PUT') {
    // nothing saved under the name yet is an answer too ({ data: null }), as it is in a browser
    return sendJson(response, { json: { data: await docs.read(user.id, key) } });
  }

  const body = await readJson(request);

  return body.ok
    ? docs
        .writeAll(user.id, [[key, body.value?.data ?? null]])
        .then(() => sendJson(response, { json: {} }))
    : sendError(response, body);
}

// a save's documents together, as the browser's own store keeps them: all of them, or none
async function manyDocs(request, response, { accounts, docs }) {
  const user = await owner(request, response, accounts);
  const body = user && (await readJson(request));

  if (!body) {
    return;
  }

  if (!body.ok || !Array.isArray(body.value?.entries) || !body.value.entries.every(isEntry)) {
    return sendError(response, body.ok ? NOT_A_KEY : body);
  }

  await docs.writeAll(user.id, body.value.entries);
  sendJson(response, { json: {} });
}

// deps: { accounts, docs }
export function docsRoutes(deps) {
  const one = (request, response, params) => {
    const key = decodeURIComponent(params.rest);

    return isDocKey(key)
      ? oneDoc(request, response, { ...deps, key })
      : sendError(response, NOT_A_KEY);
  };

  return [
    route('/api/docs', { POST: (request, response) => manyDocs(request, response, deps) }),
    route('/api/docs/', { GET: one, PUT: one, DELETE: one }),
  ];
}
