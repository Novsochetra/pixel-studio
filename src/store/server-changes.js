import { keysFor } from './keys.js';

// whether the documents a change names hold the project kept under `prefix`; the first project
// has no prefix, and every later one's keys start "p-", so none of theirs is taken for its own
export function touchesProject(change, prefix) {
  const keys = keysFor(prefix);
  const firstLayer = keys.layer('');

  return (change?.keys ?? []).some((key) => key === keys.project || key.startsWith(firstLayer));
}

// changes heard while a run is under way are taken by one more run after it: a tool drawing a
// part at a time sends several, and a run for each read the whole project again and again
export function oneAtATime(work) {
  let running = null;
  let again = false;

  const loop = async () => {
    do {
      again = false;
      await work();
    } while (again);
  };

  return () => {
    if (running) {
      again = true;

      return running;
    }

    running = loop().finally(() => {
      running = null;
    });

    return running;
  };
}

const RETRY_MS = 3000;

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

export function readEvents(heard) {
  const blocks = heard.split('\n\n');
  const rest = blocks.pop();
  const texts = blocks.flatMap((block) =>
    block
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice('data: '.length)),
  );

  return { changes: texts.flatMap(parsed), rest };
}

function parsed(text) {
  try {
    return [JSON.parse(text)];
  } catch {
    return [];
  }
}

async function listen(onChange, signal) {
  const answer = await fetch('/api/changes', {
    method: 'POST',
    credentials: 'same-origin',
    signal,
  });

  if (answer.status === 401) {
    return 'signed out';
  }

  const reader = answer.body.pipeThrough(new globalThis.TextDecoderStream()).getReader();
  let heard = '';
  let next = await reader.read();

  while (!next.done) {
    const read = readEvents(heard + next.value);

    heard = read.rest;
    read.changes.forEach(onChange);
    next = await reader.read();
  }

  return null;
}

// Fetched with POST, not as an EventSource: the offline worker of an earlier build keeps a copy
// of every GET, waits for the whole answer to keep it, and a stream never ends. Asked again a
// moment after it drops, as the server restarts or a phone sleeps.
export function followServerChanges(onChange) {
  const stop = new globalThis.AbortController();

  const loop = async () => {
    while (!stop.signal.aborted) {
      const said = await listen(onChange, stop.signal).catch(() => null);

      if (said === 'signed out') {
        return;
      }

      await pause(RETRY_MS);
    }
  };

  loop();

  return () => stop.abort();
}
