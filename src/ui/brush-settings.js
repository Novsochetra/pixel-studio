import { node } from './dom.js';
import { BRUSH_SIZES } from '../editor/brush.js';
import { slider } from './slider.js';

const SHAPES = [
  ['round', 'Round'],
  ['square', 'Square'],
];

const caption = (size) => `Brush ${size} px`;

function shapeButtons(app) {
  const { brush } = app.store.state;

  return node(
    'div.segmented',
    { role: 'group', 'aria-label': 'Brush shape' },
    SHAPES.map(([shape, label]) =>
      node(
        'button',
        {
          'aria-pressed': String(brush.shape === shape),
          onclick: () => app.store.set({ brush: { ...app.store.state.brush, shape } }),
        },
        label,
      ),
    ),
  );
}

// The slider changes the size in place: drawing the panel again would end a drag, or take the
// focus from the arrow keys.
export function brushField(app) {
  const { state } = app.store;
  const label = node('span', {}, caption(state.brush.size));
  const slide = (event) => {
    state.brush = { ...state.brush, size: Number(event.target.value) };
    label.textContent = caption(state.brush.size);
    app.store.touch('brushSize');
  };

  return node(
    'div.field',
    {},
    label,
    node(
      'div.group',
      {},
      slider({
        min: String(BRUSH_SIZES.smallest),
        max: String(BRUSH_SIZES.biggest),
        value: String(state.brush.size),
        'aria-label': 'Brush size',
        id: 'brush-size',
        style: { flex: '1' },
        oninput: slide,
      }),
      shapeButtons(app),
    ),
  );
}
