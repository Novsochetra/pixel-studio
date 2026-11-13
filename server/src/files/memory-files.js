// files kept in the server's memory: for the tests, and a server with no bucket set
export function createMemoryFiles() {
  const files = new Map();

  return {
    put: async (key, bytes) => files.set(key, Buffer.from(bytes)),
    get: async (key) => {
      if (!files.has(key)) {
        throw new Error(`No file ${key}`);
      }

      return files.get(key);
    },
    remove: async (key) => files.delete(key),
    keys: () => [...files.keys()],
  };
}
