import { browserStorage } from './left-unsaved.js';
import { serverBackend } from './server-backend.js';
import { syncedBackend } from './synced-backend.js';
import { waitingKeys } from './waiting-keys.js';

// Where the project is kept: the viewer's private space in the artifact's store when the page
// runs on claude.ai signed in, otherwise this browser's IndexedDB, otherwise nowhere.

const TIMEOUT_MS = 10000;

function withTimeout(promise, message) {
  let timer;

  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), TIMEOUT_MS);
    }),
  ]);
}

// claude.ai hands documents back frozen, and opening a project changes what it reads in place
// (the projects list, an older project brought up to date), so the page works on its own copy
const ownCopy = (data) => structuredClone(data);

async function accountBackend() {
  const claude = window.claude;

  if (!claude?.use) {
    return null;
  }

  const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
  const id = db && user ? await user.id() : null;

  if (!id) {
    return null;
  }

  const collection = db.collection(`data/users/${id}`);

  return {
    kind: 'account',
    async readAll() {
      const snapshot = await withTimeout(collection.get(), 'Your saved work could not be reached.');

      return new Map(
        snapshot.docs.filter((doc) => doc.exists).map((doc) => [doc.id, ownCopy(doc.data())]),
      );
    },
    async read(key) {
      const doc = await withTimeout(
        collection.doc(key).get(),
        'Your saved work could not be reached.',
      );

      return doc.exists ? ownCopy(doc.data()) : null;
    },
    write: (key, data) => collection.doc(key).set(data),
    remove: (key) => collection.doc(key).delete(),
  };
}

function request(operation) {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () => reject(operation.error);
  });
}

// A change to the saved documents, committed as it is asked for. Left to the browser, a write is
// committed once the page has heard it was done: a page being left (a tab closed, a reload a
// moment after a stroke) never hears, and the write was thrown away with the stroke in it.
function committed(database, change) {
  const transaction = database.transaction('docs', 'readwrite');
  const done = new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  change(transaction.objectStore('docs'));
  // Safari before 15 has no commit of its own: there the browser's is waited for, as before
  transaction.commit?.();

  return done;
}

// `name`: the store's own, one for each account signed in on the studio's server
async function browserBackend(name = 'pixel-clean-studio') {
  try {
    const open = indexedDB.open(name, 1);

    open.onupgradeneeded = () => open.result.createObjectStore('docs');
    const database = await request(open);
    const store = (mode) => database.transaction('docs', mode).objectStore('docs');

    return {
      kind: 'browser',
      async readAll() {
        const keys = await request(store('readonly').getAllKeys());
        const values = await request(store('readonly').getAll());

        return new Map(keys.map((key, i) => [key, values[i]]));
      },
      read: async (key) => (await request(store('readonly').get(key))) ?? null,
      write: (key, data) => committed(database, (docs) => docs.put(data, key)),
      // a save's documents together: all of them are kept, or none
      writeAll: (entries) =>
        committed(database, (docs) => entries.forEach(([key, data]) => docs.put(data, key))),
      remove: (key) => committed(database, (docs) => docs.delete(key)),
    };
  } catch {
    return null;
  }
}

// nothing survives a reload, but versions still work for this visit
function memoryBackend() {
  const docs = new Map();

  return {
    kind: 'none',
    readAll: async () => new Map(),
    read: async (key) => docs.get(key) ?? null,
    write: async (key, data) => docs.set(key, data),
    remove: async (key) => docs.delete(key),
  };
}

// An account on the studio's own server: its work there, and a copy in this browser of its own,
// so two accounts signed in here in turn never see each other's.
async function serverWork(owner) {
  const local = (await browserBackend(`pixel-clean-studio-u-${owner.id}`)) ?? memoryBackend();
  const backend = syncedBackend({
    owner,
    kind: `server:${owner.id}`,
    server: serverBackend(),
    local: { ...local, writeAll: local.writeAll ?? writeEach(local) },
    waiting: waitingKeys(browserStorage(), owner.id),
  });

  // what the last visit could not send, and what waits as the network comes back
  backend.sendWaiting();
  addEventListener('online', () => backend.sendWaiting());

  return backend;
}

const writeEach = (local) => async (entries) => {
  for (const [key, data] of entries) {
    await local.write(key, data);
  }
};

// `owner`: the account signed in on the studio's server, or null where the page has none
export async function openBackend(owner = null) {
  if (owner) {
    return serverWork(owner);
  }

  let account = null;

  try {
    account = await withTimeout(accountBackend(), 'claude.ai storage did not answer.');
  } catch {
    account = null;
  }

  return account ?? (await browserBackend()) ?? memoryBackend();
}
