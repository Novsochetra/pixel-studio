import { icon, node } from './dom.js';
import { CLEAR, fromHex, toHex } from '../model/sprite.js';
import { BASIC_COLOURS } from '../art/drawing-palette.js';

// art with this many colours of its own no longer needs the basic ones in the way
const ENOUGH_OF_ITS_OWN = 8;

function swatch(color, pressed, onclick) {
  const title = toHex(color);

  return node(`button.swatch${color === CLEAR ? '.clear' : ''}`, {
    style: color === CLEAR ? null : { background: title },
    title,
    'aria-label': title,
    'aria-pressed': String(pressed),
    onclick,
  });
}

// a row of colours to pick from; picking one puts the pencil back in hand after the eraser
export function swatchGroup(app, { name, colors }) {
  const { state } = app.store;
  const pick = (color) =>
    app.store.set({ color, tool: state.tool === 'eraser' ? 'pencil' : state.tool });

  return node(
    'div.swatches',
    { role: 'group', 'aria-label': name },
    colors.map((color) => swatch(color, state.color === color, () => pick(color))),
  );
}

// shown until the art has colours enough of its own, or whenever asked for
function basicColours(app, colors) {
  const { state } = app.store;
  const shown = state.basicColours ?? colors.length < ENOUGH_OF_ITS_OWN;

  return [
    node(
      'button.btn.swatches-toggle',
      { 'aria-expanded': String(shown), onclick: () => app.store.set({ basicColours: !shown }) },
      'Basic colours',
      icon(shown ? 'chevron-down' : 'chevron-right'),
    ),
    shown ? swatchGroup(app, { name: 'Basic colours', colors: BASIC_COLOURS.map(fromHex) }) : null,
  ];
}

// Colours to draw with that the art does not have yet: the palettes added to the project, each
// under its name, and the basic ones.
// the palettes added to the project, each under its name
export function projectPalettes(app) {
  const palettes = app.store.state.project.palettes ?? [];

  return palettes.map((palette) => [node('div.hint', {}, palette.name), swatchGroup(app, palette)]);
}

export const otherColours = (app, colors) => basicColours(app, colors);
