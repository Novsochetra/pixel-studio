import { node } from '../dom.js';
import { newProjectChooser } from './chooser.js';
import { chooseFile } from '../choose-file.js';

const FAILED =
  'Your saved work could not be read just now. Nothing was changed: reload the page to try again.';

function moreWays(handlers) {
  return node(
    'div.start-more',
    {},
    node('button.btn.quiet', { onclick: handlers.onExample }, 'Try the example character'),
    node(
      'button.btn.quiet',
      { onclick: () => chooseFile(handlers.onOpenFile, '.json,application/json') },
      'Open a project file…',
    ),
  );
}

// handlers: { onCreate(project), onExample(), onOpenFile(file), onDeletePreset(preset) }
export function showStartScreen({ presets, failed, handlers }) {
  const chooser = newProjectChooser({
    presets,
    onCreate: handlers.onCreate,
    onDeletePreset: handlers.onDeletePreset,
  });
  const screen = node(
    'div.start-screen',
    { role: 'main' },
    node(
      'div.start-panel',
      {},
      node('h1.wordmark-big', {}, 'PIXEL CLEAN'),
      node(
        'p.hint',
        {},
        'Turn AI pixel art into true pixel art, then edit, animate and export it for your game.',
      ),
      failed ? node('p.start-warning', { role: 'alert' }, FAILED) : null,
      chooser,
      moreWays(handlers),
    ),
  );
  document.body.append(screen);

  return { close: () => screen.remove() };
}
