// Saved work on the server first, and a copy in this browser: every change is kept here at once,
// then sent. One the server does not take (no network, a server restarting) waits in `waiting`,
// and is sent when the server answers again. Read, the server's copy is the one, unless this
// browser holds a change not sent yet; with no server, this browser's copy is read.
export function syncedBackend({ owner, kind, server, local, waiting }) {
  const backend = { owner, kind, away: false, onAway: () => {} };
  let sending = false;

  const answered = (yes) => {
    if (backend.away !== !yes) {
      backend.away = !yes;
      backend.onAway(backend.away);
    }
  };

  // a send that fails keeps its documents waiting; one that lands sends what waited before it
  const sent = async (send, keys) => {
    try {
      await send();
      answered(true);
    } catch {
      keys.forEach((key) => waiting.add(key));
      answered(false);

      return;
    }

    backend.sendWaiting();
  };

  backend.sendWaiting = async () => {
    if (sending) {
      return;
    }

    sending = true;

    try {
      await sendEach({ server, local, waiting });
      answered(true);
    } catch {
      answered(false);
    } finally {
      sending = false;
    }
  };

  return Object.assign(backend, readsAndWrites({ server, local, waiting, sent }));
}

// each waiting document as this browser holds it now: gone here is gone there too
async function sendEach({ server, local, waiting }) {
  for (const key of waiting.keys()) {
    const data = await local.read(key);

    await (data === null ? server.remove(key) : server.write(key, data));
    waiting.delete(key);
  }
}

function readsAndWrites({ server, local, waiting, sent }) {
  return {
    async read(key) {
      if (waiting.has(key)) {
        return local.read(key);
      }

      try {
        const data = await server.read(key);

        // kept here too, for a visit with no network
        await (data === null ? local.remove(key) : local.write(key, data)).catch(() => {});

        return data;
      } catch {
        return local.read(key);
      }
    },

    async write(key, data) {
      await local.write(key, data);
      await sent(() => server.write(key, data), [key]);
    },

    // together here as in the browser's own store: all of a save is kept, or none
    async writeAll(entries) {
      await local.writeAll(entries);

      await sent(
        () => server.writeAll(entries),
        entries.map(([key]) => key),
      );
    },

    async remove(key) {
      await local.remove(key);
      await sent(() => server.remove(key), [key]);
    },
  };
}
