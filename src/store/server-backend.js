import { refusalOf } from './server-account.js';

const WAIT_MS = 30000;

async function call(method, path, body) {
  const answer = await fetch(`/api/docs${path}`, {
    method,
    credentials: 'same-origin',
    signal: AbortSignal.timeout(WAIT_MS),
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body && JSON.stringify(body),
  });

  if (!answer.ok) {
    throw await refusalOf(answer);
  }

  return answer.json();
}

const named = (key) => `/${encodeURIComponent(key)}`;

// The signed-in account's saved work on the studio's server, a document a key, as the browser's
// own store keeps it (backends.js).
export function serverBackend() {
  return {
    read: async (key) => (await call('GET', named(key)))?.data ?? null,
    write: (key, data) => call('PUT', named(key), { data }),
    writeAll: (entries) => call('POST', '', { entries }),
    remove: (key) => call('DELETE', named(key)),
  };
}
