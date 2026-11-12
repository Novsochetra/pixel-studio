import { node } from './dom.js';
import { directionSprite } from './actions.js';
import { bounds } from '../model/sprite.js';
import { brushField } from './brush-settings.js';
import { slider } from './slider.js';
import { forHands } from './platform-keys.js';
import { listGroup, switchRow } from './list-group.js';
import { lockGroup } from './palette-lock.js';

function mirrorField(app) {
  const { state } = app.store;
  const centre = () => {
    const sprite = directionSprite(state, state.at.direction);
    const box = sprite && bounds(sprite);

    if (box) {
      app.store.set({ symmetry: { ...state.symmetry, axisSum: box.left + box.right - 1 } });
    }
  };

  const caption = (axisSum) => `Mirror line at x ${((axisSum + 1) / 2).toFixed(1)}`;
  const label = node('span', {}, caption(state.symmetry.axisSum));

  // the slider updates the line in place, so re-rendering the panel does not end the drag
  const slide = (event) => {
    state.symmetry = { ...state.symmetry, axisSum: Number(event.target.value) };
    label.textContent = caption(state.symmetry.axisSum);
    app.store.touch('mirror');
  };

  return node(
    'div.field',
    {},
    label,
    node(
      'div.group',
      {},
      slider({
        min: '0',
        max: String(2 * state.project.canvas.width - 2),
        value: String(state.symmetry.axisSum),
        'aria-label': 'Mirror line position',
        id: 'mirror-line',
        style: { flex: '1' },
        oninput: slide,
      }),
      node('button.btn', { onclick: centre }, 'Centre on sprite'),
    ),
  );
}

// settings that are one switch each, named by the state they turn on
const SWITCHES = [
  {
    key: 'cleanLines',
    id: 'clean-lines',
    label: 'Clean lines',
    hint: 'Removes doubled corners while you draw with a 1 px brush',
  },
  {
    key: 'shapeFilled',
    id: 'shape-filled',
    label: 'Filled shapes',
    hint: 'Rectangles and ellipses are drawn solid, not as outlines',
  },
  {
    key: 'shapeEven',
    id: 'shape-even',
    label: 'Even shapes',
    hint: 'Squares, circles and straight or diagonal lines',
    keys: ', as holding Shift draws them',
  },
  {
    key: 'shadeDarker',
    id: 'shade-darker',
    label: 'Darker shades',
    hint: 'The light and dark brush darkens',
    keys: ', as holding Shift makes it',
  },
];

export function drawingSettings(app, colors) {
  const { state } = app.store;
  const switched = ({ key, id, label, hint, keys = '' }) =>
    // the key a switch stands in for is named only where there are keys
    switchRow(label, { id, checked: state[key], hint: hint + forHands(keys, '') }, (on) =>
      app.store.set({ [key]: on }),
    );

  return [
    node('h2', { tabindex: '0' }, 'Brush'),
    brushField(app),
    listGroup({}, SWITCHES.map(switched)),
    lockGroup(app, colors),
    listGroup(
      {},
      switchRow(
        'Symmetry',
        {
          id: 'symmetry',
          checked: state.symmetry.on,
          hint: 'Draw one half, the other side mirrors',
        },
        (on) => app.store.set({ symmetry: { ...state.symmetry, on } }),
      ),
    ),
    state.symmetry.on ? mirrorField(app) : null,
  ];
}
