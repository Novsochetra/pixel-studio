import { node } from './dom.js';
import { fromHex, toHex } from '../model/sprite.js';

// what the colour in hand is to the art, said under its hex code
const noteFor = (color, colors) =>
  colors.includes(color) ? "One of the art's colours" : "Not one of the art's colours yet";

// The colour in hand: its swatch opens the browser's colour picker, its hex code can be typed.
// While the picker is open the panel is not drawn again, as that would shut the picker: the
// colour is set in place, and the panel catches up when the picker closes.
function hexField(app) {
  const { state } = app.store;

  return node('input.input.mono', {
    value: toHex(state.color),
    'aria-label': 'Colour hex code',
    id: 'colour-hex',
    disabled: state.paletteLock,
    onchange: (event) => {
      const color = fromHex(event.target.value);

      if (color !== null) {
        app.store.set({ color });
      }
    },
  });
}

const picked = (state) => ({
  color: state.color,
  tool: state.tool === 'eraser' ? 'pencil' : state.tool,
});

export function colourWell(app, colors) {
  const { state } = app.store;
  const note = node('span', {}, noteFor(state.color, colors));
  const hex = hexField(app);
  const well = node('label.swatch.colour-well', {
    style: { background: toHex(state.color) },
    title: state.paletteLock
      ? "Palette lock is on: pick one of the art's colours"
      : 'Pick any colour',
  });
  const pick = (event) => {
    state.color = fromHex(event.target.value);
    hex.value = toHex(state.color);
    well.style.background = toHex(state.color);
    note.textContent = noteFor(state.color, colors);
    app.store.touch('colourPick');
  };

  well.append(
    node('input', {
      type: 'color',
      id: 'colour-pick',
      'aria-label': 'Pick any colour',
      value: toHex(state.color),
      disabled: state.paletteLock,
      oninput: pick,
      onchange: () => app.store.set(picked(state)),
    }),
  );

  return node('div.current-colour', {}, well, node('div.field', {}, hex, note));
}
