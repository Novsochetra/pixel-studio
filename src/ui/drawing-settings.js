import { node } from './dom.js';
import { directionSprite } from './actions.js';
import { bounds, toHex } from '../model/sprite.js';
import { brushField } from './brush-settings.js';
import { slider } from './slider.js';

// What "Paint only over" can be set to: any pixel, or one of the art's colours. The colour it is
// set to stays in the list when the art no longer has it, and says so: dropped to "Any pixel"
// without a word, the next strokes painted everywhere, and undo did not bring the setting back.
export function paintOverChoices(colors, paintOver) {
  const gone = paintOver !== null && !colors.includes(paintOver);

  return [
    { value: '', label: 'Any pixel' },
    ...colors.map((color) => ({ value: String(color), label: toHex(color) })),
    ...(gone
      ? [{ value: String(paintOver), label: `${toHex(paintOver)} · none in the art now` }]
      : []),
  ];
}

function paintOverField(app, colors) {
  const { state } = app.store;
  const options = paintOverChoices(colors, state.paintOver).map(({ value, label }) =>
    node('option', { value, selected: String(state.paintOver ?? '') === value }, label),
  );

  return node(
    'label.field',
    {},
    node('span', {}, 'Paint only over'),
    node(
      'select.input',
      {
        id: 'paint-over',
        onchange: (event) =>
          app.store.set({ paintOver: event.target.value ? Number(event.target.value) : null }),
      },
      options,
    ),
  );
}

function toggle({ id, label, hint }, checked, onChange) {
  return node(
    'label.toggle-row',
    { for: id },
    node('span', {}, node('div', {}, label), node('div.hint', {}, hint)),
    node('input.switch', {
      type: 'checkbox',
      id,
      role: 'switch',
      checked,
      onchange: (event) => onChange(event.target.checked),
    }),
  );
}

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
];

export function drawingSettings(app, colors) {
  const { state } = app.store;
  const lock = (on) =>
    app.store.set({
      paletteLock: on,
      // art with no colours yet has none to lock to: the colour in hand stays
      color: on && colors.length && !colors.includes(state.color) ? colors[0] : state.color,
    });

  return [
    node('h2', { tabindex: '0' }, 'Drawing'),
    brushField(app),
    SWITCHES.map((item) =>
      toggle(item, state[item.key], (on) => app.store.set({ [item.key]: on })),
    ),
    toggle(
      { id: 'palette-lock', label: 'Palette lock', hint: "Draw only with the art's colours" },
      state.paletteLock,
      lock,
    ),
    paintOverField(app, colors),
    toggle(
      { id: 'symmetry', label: 'Symmetry', hint: 'Draw one half, the other side mirrors' },
      state.symmetry.on,
      (on) => app.store.set({ symmetry: { ...state.symmetry, on } }),
    ),
    state.symmetry.on ? mirrorField(app) : null,
  ];
}
