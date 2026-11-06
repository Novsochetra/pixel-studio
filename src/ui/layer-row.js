import { node, icon, toast } from './dom.js';
import { currentAnimation, restructure } from './actions.js';
import { layerStack, moveLayer, removeLayer, updateLayer } from '../model/structure.js';

const quiet = (event) => event.stopPropagation();

function changeLayer(app, entry, label, patch) {
  restructure(app, label, (draft) => {
    updateLayer(currentAnimation(draft), entry.key, patch);
  });
}

function eyeButton(app, entry) {
  const shown = entry.visible;

  return node(
    `button.btn.quiet.eye${shown ? '' : '.off'}`,
    {
      'aria-pressed': String(shown),
      'aria-label': `${shown ? 'Hide' : 'Show'} ${entry.name}`,
      title: shown
        ? 'Shown. Click to hide (hidden layers stay out of downloads)'
        : 'Hidden. Click to show',
      onclick: (event) => {
        quiet(event);
        changeLayer(app, entry, shown ? 'Hide layer' : 'Show layer', { visible: !shown });
      },
    },
    icon(shown ? 'eye' : 'eye-off'),
  );
}

function stepButton(app, entry, step) {
  const way = step > 0 ? 'up' : 'down';
  const move = (event) => {
    quiet(event);
    restructure(app, 'Move layer', (draft) => {
      moveLayer(currentAnimation(draft), entry.key, step);
    });
  };

  return node(
    'button.btn.quiet',
    { title: `Move ${way}`, 'aria-label': `Move ${entry.name} ${way}`, onclick: move },
    step > 0 ? '↑' : '↓',
  );
}

// the last art layer stays: a frame with nothing to draw on is no frame
function deleteButton(app, entry) {
  const remove = (event) => {
    quiet(event);
    const animation = currentAnimation(app.store.state);
    const arts = layerStack(animation).filter((layer) => layer.kind !== 'reference');

    if (entry.kind !== 'reference' && arts.length <= 1) {
      toast('Keep at least one art layer.');

      return;
    }

    restructure(app, `Delete ${entry.name}`, (draft) => {
      removeLayer(currentAnimation(draft), entry.key);
    });
  };

  return node(
    'button.btn.quiet',
    { title: 'Delete layer', 'aria-label': `Delete ${entry.name}`, onclick: remove },
    '×',
  );
}

// one layer of the stack: shown or hidden, its name, its place, and a way to delete it
export function layerRow(app, entry, active) {
  const { state } = app.store;
  const rename = (event) =>
    changeLayer(app, entry, 'Rename layer', { name: event.target.value.trim() || entry.name });

  return node(
    'div.layer-row',
    {
      'aria-current': String(active),
      'data-hidden': String(!entry.visible),
      onclick: () => app.store.set({ at: { ...state.at, layer: entry.key }, selection: null }),
    },
    eyeButton(app, entry),
    node('input.input', {
      value: entry.name,
      'aria-label': 'Layer name',
      onclick: quiet,
      onchange: rename,
    }),
    entry.kind === 'reference' ? node('span.badge', {}, 'Trace') : null,
    entry.visible ? null : node('span.badge', {}, 'Hidden'),
    stepButton(app, entry, 1),
    stepButton(app, entry, -1),
    deleteButton(app, entry),
  );
}
