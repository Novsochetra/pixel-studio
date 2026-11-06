import { node } from './dom.js';

// claude.ai can take a while to share saved work, longest when it first asks to allow it
const SLOW_MS = 6000;

const SLOW_NOTE =
  'Still waiting for claude.ai to share your saved work. If it asks to let this page use your data, allow it.';

function failure(error) {
  return node(
    'div.start-fields',
    { role: 'alert' },
    node('p.start-warning', {}, 'Pixel Clean could not open your work.'),
    node('p.hint', {}, error?.message ?? String(error)),
    node(
      'div.group',
      {},
      node('button.btn.primary', { onclick: () => location.reload() }, 'Reload the page'),
    ),
  );
}

// Shown from the first moment until the work is open, so the page is never blank while it
// waits, and says what went wrong if opening fails.
export function showOpening() {
  const note = node('p.hint', {}, 'Opening your work…');
  const screen = node(
    'div.start-screen',
    { role: 'status' },
    node('div.start-panel', {}, node('h1.wordmark-big', {}, 'PIXEL CLEAN'), note),
  );
  const timer = setTimeout(() => {
    note.textContent = SLOW_NOTE;
  }, SLOW_MS);

  document.body.append(screen);

  return {
    close() {
      clearTimeout(timer);
      screen.remove();
    },

    fail(error) {
      clearTimeout(timer);
      note.replaceWith(failure(error));
    },
  };
}
