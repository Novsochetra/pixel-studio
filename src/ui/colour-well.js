import { node, toast } from './dom.js';
import { fromHex, toHex } from '../model/sprite.js';
import { FIRST_PENCIL_COLOUR } from '../art/editor-colours.js';

// what the colour in hand is to the art, said under its hex code
const noteFor = (color, colors) =>
  colors.includes(color) ? "One of the art's colours" : "Not one of the art's colours yet";

// The colour in hand: its swatch opens the browser's colour picker, its hex code can be typed.
function hexField(app) {
  const { state } = app.store;

  return node('input.input.mono', {
    value: toHex(state.color),
    'aria-label': 'Colour hex code',
    id: 'colour-hex',
    disabled: state.paletteLock,
    onchange: (event) => {
      const color = fromHex(event.target.value);

      if (color === null) {
        event.target.value = toHex(state.color);
        toast(
          `That is not a colour code: three or six letters and digits, like ${FIRST_PENCIL_COLOUR}.`,
        );
      } else {
        app.store.set({ color });
      }
    },
  });
}

// the swatches of the panel the well is in: the one of this colour is the pressed one
function markPicked(well, hex) {
  for (const button of well.closest('.section')?.querySelectorAll('.swatches .swatch') ?? []) {
    button.setAttribute('aria-pressed', String(button.title === hex));
  }
}

// The picker sets the colour in place, at every step and when it closes: some browsers say
// "changed" at each colour chosen, and drawing the panel again then would shut the picker.
function pickInPlace(app, color) {
  const { state } = app.store;

  state.color = color;
  state.tool = state.tool === 'eraser' ? 'pencil' : state.tool;
  app.store.touch('colourPick');
}

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
    const color = fromHex(event.target.value);

    pickInPlace(app, color);
    hex.value = toHex(color);
    well.style.background = toHex(color);
    note.textContent = noteFor(color, colors);
    markPicked(well, toHex(color));
  };

  well.append(
    node('input', {
      type: 'color',
      id: 'colour-pick',
      'aria-label': 'Pick any colour',
      value: toHex(state.color),
      disabled: state.paletteLock,
      oninput: pick,
      onchange: pick,
    }),
  );

  return node('div.current-colour', {}, well, node('div.field', {}, hex, note));
}
