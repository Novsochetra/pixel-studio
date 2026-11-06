import { node, icon } from './dom.js';
import { currentAnimation, restructure } from './actions.js';
import { addFrame, frameCount, moveFrame, removeFrame } from '../model/frames.js';
import { copyFrameToViews } from '../model/structure.js';
import { directionLabel } from '../model/project.js';
import { PIN_NAMES } from '../model/pins.js';
import { chooseFile } from './views-panel.js';
import { openImport } from './import-sheet.js';

export function frameStructure(app, label, change) {
  restructure(app, label, (state) => ({ frame: change(state) }));
}

function deleteButton(app, index, count) {
  let confirming = false;

  return node(
    'button.btn.quiet',
    {
      disabled: count < 2,
      title: 'Delete this frame from every view',
      onclick: (event) => {
        if (!confirming) {
          confirming = true;
          event.currentTarget.textContent = `Delete frame ${index + 1}? Click again`;

          return;
        }

        frameStructure(app, 'Delete frame', (draft) => removeFrame(currentAnimation(draft), index));
      },
    },
    'Delete',
  );
}

// what changes the frames themselves: the same for every view
export function frameButtons(app, index) {
  const { state } = app.store;
  const animation = currentAnimation(state);
  const direction = state.at.direction;
  const count = frameCount(animation);
  const views = Object.keys(animation.directions).length;
  const move = (step) =>
    frameStructure(app, 'Move frame', (draft) =>
      moveFrame(currentAnimation(draft), index, index + step),
    );

  return [
    node(
      'button.btn.quiet',
      {
        title: 'A new empty frame after this one, in every view',
        onclick: () =>
          frameStructure(app, 'New frame', (draft) =>
            addFrame(draft.project, currentAnimation(draft), index),
          ),
      },
      icon('plus'),
      'New frame',
    ),
    node(
      'button.btn.quiet',
      {
        title: 'A copy of this frame after it, in every view',
        onclick: () =>
          frameStructure(app, 'Duplicate frame', (draft) =>
            addFrame(draft.project, currentAnimation(draft), index, true),
          ),
      },
      'Duplicate',
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Move this frame earlier (or drag it)',
        'aria-label': 'Move frame earlier',
        disabled: index === 0,
        onclick: () => move(-1),
      },
      '←',
    ),
    node(
      'button.btn.quiet',
      {
        title: 'Move this frame later (or drag it)',
        'aria-label': 'Move frame later',
        disabled: index >= count - 1,
        onclick: () => move(1),
      },
      '→',
    ),
    deleteButton(app, index, count),
    node(
      'button.btn.quiet',
      {
        title: `Clean a ChatGPT image into frame ${index + 1} of the ${directionLabel(direction).toLowerCase()} view`,
        onclick: () => chooseFile((file) => openImport(app, direction, file, index)),
      },
      icon('upload'),
      'Image into this frame…',
    ),
    views > 1
      ? node(
          'button.btn.quiet',
          {
            title: `Copy the ${directionLabel(direction).toLowerCase()} view's frame ${index + 1} into frame ${index + 1} of every other view, as a start for them`,
            onclick: () =>
              frameStructure(app, 'Copy frame to every view', (draft) => {
                copyFrameToViews(draft.project, currentAnimation(draft), direction, index);
                return index;
              }),
          },
          'Copy to other views',
        )
      : null,
  ];
}

// how the frames are shown and played
export function playButtons(app, playing, onPlay) {
  const { state } = app.store;
  const animation = currentAnimation(state);

  return [
    node(
      `button.btn.quiet${state.showPins ? '.on' : ''}`,
      {
        'aria-pressed': String(state.showPins),
        title: 'Pins mark the head, hands, hips and feet in each frame (tool P)',
        onclick: () => app.store.set({ showPins: !state.showPins }),
      },
      'Pins',
    ),
    state.tool === 'pin'
      ? node(
          'select.input',
          {
            id: 'pin-name',
            'aria-label': 'Pin to place',
            onchange: (event) => app.store.set({ pinName: event.target.value }),
          },
          PIN_NAMES.map((name) =>
            node('option', { value: name, selected: state.pinName === name }, name),
          ),
        )
      : null,
    node(
      `button.btn.quiet${state.onion ? '.on' : ''}`,
      {
        'aria-pressed': String(state.onion),
        title: 'Show the frames before and after, faded',
        onclick: () => app.store.set({ onion: !state.onion }),
      },
      'Onion skin',
    ),
    node(
      'label.group',
      { for: 'fps', style: { gap: '4px' } },
      node('input.input.mono', {
        id: 'fps',
        type: 'number',
        min: '1',
        max: '30',
        value: String(animation.fps),
        style: { width: '52px' },
        onchange: (event) =>
          restructure(app, 'Frame rate', (draft) => {
            currentAnimation(draft).fps = Math.max(
              1,
              Math.min(30, Number(event.target.value) || 8),
            );
          }),
      }),
      'fps',
    ),
    node('button.btn', { onclick: onPlay }, playing ? 'Pause' : 'Play'),
  ];
}
