import { node, icon } from './dom.js';
import { restructure } from './actions.js';
import { pickLayer } from './layer-move.js';
import { renameInPlace } from './rename-field.js';
import { setLayerShown, updateLayer } from '../model/structure.js';
import { frameAt } from '../model/project.js';
import { drawThumbnail } from './thumbnail.js';
import { isBody } from '../model/body/body-kind.js';

// `at` is where the layer was when the change began: a rename is kept after a click elsewhere
function changeLayer(app, { entry, at = app.store.state.at }, label, patch) {
  restructure(app, label, (draft) => {
    updateLayer(frameAt(draft.project, at), entry.key, patch);
  });
}

function eyeButton(app, entry, shown) {
  const toggle = (event) => {
    event.stopPropagation();
    restructure(app, shown ? 'Hide layer' : 'Show layer', (draft) => {
      setLayerShown(frameAt(draft.project, draft.at), entry.key, !shown);
    });
  };

  return node(
    `button.btn.quiet.eye${shown ? '' : '.off'}`,
    {
      'aria-pressed': String(shown),
      'aria-label': `${shown ? 'Hide' : 'Show'} ${entry.name}`,
      title: shown
        ? 'Shown in this frame. Click to hide it here (a hidden layer stays out of downloads)'
        : 'Hidden in this frame. Click to show it here',
      onclick: toggle,
    },
    icon(shown ? 'eye' : 'eye-off'),
  );
}

// what is on the layer in the frame being edited, small, so a layer is known by its art
function thumbnail(layer) {
  const canvas = node('canvas.layer-thumb', { 'aria-hidden': 'true' });

  if (layer.sprite) {
    drawThumbnail(canvas, layer.sprite, 28);
  }

  return canvas;
}

export function startRename(app, entry, label) {
  const { at } = app.store.state;

  renameInPlace(label, {
    value: entry.name,
    label: 'Layer name',
    className: 'layer-rename',
    onDone: (name) =>
      name ? changeLayer(app, { entry, at }, 'Rename layer', { name }) : app.store.touch('layers'),
  });
}

export function renameRow(app, entry) {
  const label = document.querySelector(`.layer-row[data-key="${entry.key}"] .layer-name`);

  if (label) {
    startRename(app, entry, label);
  }
}

const DOUBLE_CLICK_MS = 400;
let lastNameClick = { key: null, time: 0 };

// A click redraws the list, so the row is gone before the browser could see a double-click on it.
function secondClickOnName(entry, event) {
  if (!event.target.closest('.layer-name')) {
    return false;
  }

  const second =
    lastNameClick.key === entry.key && event.timeStamp - lastNameClick.time < DOUBLE_CLICK_MS;

  lastNameClick = second ? { key: null, time: 0 } : { key: entry.key, time: event.timeStamp };

  return second;
}

export function layerRow(app, entry, active) {
  const shown = entry.visible;
  const select = (event) => {
    const rename = secondClickOnName(entry, event);

    pickLayer(app, entry.key);

    if (rename) {
      renameRow(app, entry);
    }
  };
  const label = node('span.layer-name', { title: 'Double-click to rename (F2)' }, entry.name);

  return node(
    'div.layer-row',
    {
      role: 'option',
      tabindex: active ? '0' : '-1',
      'aria-selected': String(active),
      'aria-current': String(active),
      'data-hidden': String(!shown),
      'data-key': entry.key,
      onclick: select,
      onkeydown: (event) => event.key === 'F2' && startRename(app, entry, label),
    },
    eyeButton(app, entry, shown),
    thumbnail(entry),
    label,
    entry.kind === 'reference' ? node('span.badge', { title: 'Never downloaded' }, 'Trace') : null,
    isBody(entry)
      ? node(
          'span.badge',
          { title: 'Drawn from the parts: pose it with the Pose tool (O)' },
          'Parts',
        )
      : null,
    shown ? null : node('span.badge', {}, 'Hidden'),
  );
}
