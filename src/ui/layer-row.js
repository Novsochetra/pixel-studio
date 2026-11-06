import { node, icon } from './dom.js';
import { currentAnimation, goTo, restructure } from './actions.js';
import { renameInPlace } from './rename-field.js';
import { updateLayer } from '../model/structure.js';
import { frameAt, matchingLayer } from '../model/project.js';
import { drawThumbnail } from './thumbnail.js';
import { isBody } from '../model/body/body-kind.js';

function changeLayer(app, entry, label, patch) {
  restructure(app, label, (draft) => {
    updateLayer(currentAnimation(draft), entry.key, patch);
  });
}

function eyeButton(app, entry) {
  const shown = entry.visible;
  const toggle = (event) => {
    event.stopPropagation();
    changeLayer(app, entry, shown ? 'Hide layer' : 'Show layer', { visible: !shown });
  };

  return node(
    `button.btn.quiet.eye${shown ? '' : '.off'}`,
    {
      'aria-pressed': String(shown),
      'aria-label': `${shown ? 'Hide' : 'Show'} ${entry.name}`,
      title: shown ? 'Shown. Click to hide (a hidden layer stays out of downloads)' : 'Hidden',
      onclick: toggle,
    },
    icon(shown ? 'eye' : 'eye-off'),
  );
}

// what is on the layer in the frame being edited, small, so a layer is known by its art
function thumbnail(state, entry) {
  const canvas = node('canvas.layer-thumb', { 'aria-hidden': 'true' });
  const layer = matchingLayer(frameAt(state.project, state.at), entry);

  if (layer?.sprite) {
    drawThumbnail(canvas, layer.sprite, 28);
  }

  return canvas;
}

export function startRename(app, entry, label) {
  renameInPlace(label, {
    value: entry.name,
    label: 'Layer name',
    className: 'layer-rename',
    onDone: (name) =>
      name ? changeLayer(app, entry, 'Rename layer', { name }) : app.store.touch('layers'),
  });
}

// one layer, as an image editor lists it: shown or not, its art, its name; a click draws on it,
// a double-click on the name renames it
export function layerRow(app, entry, active) {
  const select = () => goTo(app, { layer: entry.key });
  const label = node(
    'span.layer-name',
    { title: 'Double-click to rename', ondblclick: () => startRename(app, entry, label) },
    entry.name,
  );

  return node(
    'div.layer-row',
    {
      role: 'option',
      tabindex: active ? '0' : '-1',
      'aria-selected': String(active),
      'aria-current': String(active),
      'data-hidden': String(!entry.visible),
      'data-key': entry.key,
      onclick: select,
      onkeydown: (event) => event.key === 'F2' && startRename(app, entry, label),
    },
    eyeButton(app, entry),
    thumbnail(app.store.state, entry),
    label,
    entry.kind === 'reference' ? node('span.badge', { title: 'Never downloaded' }, 'Trace') : null,
    isBody(entry)
      ? node(
          'span.badge',
          { title: 'Drawn from the parts: pose it with the Pose tool (O)' },
          'Parts',
        )
      : null,
    entry.visible ? null : node('span.badge', {}, 'Hidden'),
  );
}
