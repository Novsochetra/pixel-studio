import { icon, node } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { chooseFiles } from '../choose-file.js';
import { openBatchSheet } from '../batch-sheet.js';
import { animationTabs } from './tabs.js';
import { setGridAll } from './all-views.js';
import { PIN_NAMES } from '../../model/pins.js';
import { isSingleView, kindOf } from '../../model/kinds.js';

function toggle(app, { key, iconName, label, title }) {
  const on = Boolean(app.store.state[key]);

  return node(
    `button.btn.quiet.icon-toggle${on ? '.on' : ''}`,
    {
      'aria-pressed': String(on),
      'aria-label': label,
      title,
      onclick: () => app.store.set({ [key]: !on }),
    },
    icon(iconName),
  );
}

function viewSwitch(app) {
  const all = app.store.state.gridAll;

  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Rows' },
    [
      [false, 'This view'],
      [true, 'All views'],
    ].map(([value, label]) =>
      node(
        'button',
        { 'aria-pressed': String(all === value), onclick: () => setGridAll(app, value) },
        label,
      ),
    ),
  );
}

function fpsField(app) {
  const animation = currentAnimation(app.store.state);
  const setFps = (event) =>
    restructure(app, 'Frame rate', (draft) => {
      currentAnimation(draft).fps = Math.max(
        1,
        Math.min(30, Math.round(Number(event.target.value)) || 8),
      );
    });

  return node(
    'label.grid-fps',
    { title: 'Frames per second' },
    node('input.input.mono', {
      id: 'fps',
      type: 'number',
      min: '1',
      max: '30',
      value: String(animation.fps),
      onchange: setFps,
    }),
    'fps',
  );
}

function pinControls(app) {
  const { state } = app.store;

  if (kindOf(state.project).place !== 'feet') {
    return null;
  }

  return [
    toggle(app, {
      key: 'showPins',
      iconName: 'pin',
      label: 'Pins',
      title: 'Pins mark the head, hands, hips and feet in each frame (tool P)',
    }),
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
  ];
}

// tabs on the left; how the frames show and play on the right
export function gridBar(app, { playing, onPlay }) {
  const { state } = app.store;

  return node(
    'div.grid-bar',
    {},
    animationTabs(app),
    node('span.spacer'),
    // a character always has more to show: its other views, the mirrored side, a view to add
    isSingleView(state.project) ? null : viewSwitch(app),
    node(
      'button.btn.quiet.icon-toggle',
      {
        'aria-label': 'Clean several images into frames',
        title: 'Clean several AI images into frames',
        onclick: () => chooseFiles((files) => openBatchSheet(app, files)),
      },
      icon('upload'),
    ),
    toggle(app, {
      key: 'onion',
      iconName: 'onion',
      label: 'Onion skin',
      title: 'Show the frames before and after, faded',
    }),
    pinControls(app),
    fpsField(app),
    node(
      'button.btn.primary.grid-play',
      {
        'aria-label': playing ? 'Pause' : 'Play',
        title: playing ? 'Pause' : 'Play on the canvas',
        onclick: onPlay,
      },
      icon(playing ? 'pause' : 'play'),
    ),
  );
}
