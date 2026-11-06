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

async function browserBackend() {
  try {
    const open = indexedDB.open('pixel-clean-studio', 1);

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
      write: (key, data) => request(store('readwrite').put(data, key)),
      remove: (key) => request(store('readwrite').delete(key)),
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

export async function openBackend() {
  let account = null;

  try {
    account = await withTimeout(accountBackend(), 'claude.ai storage did not answer.');
  } catch {
    account = null;
  }

  return account ?? (await browserBackend()) ?? memoryBackend();
}
