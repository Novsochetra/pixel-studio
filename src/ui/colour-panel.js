import { node, icon, replace } from './dom.js';
import { characterColors } from './character-colours.js';
import { CLEAR, fromHex, toHex } from '../model/sprite.js';
import { colourWell } from './colour-well.js';
import { BASIC_COLOURS } from '../art/drawing-palette.js';
import { drawingSettings } from './drawing-settings.js';
import { openSwapSheet } from './swap-sheet.js';
import { openOutfitsSheet } from './outfits-sheet.js';
import { gameOf } from '../model/presets.js';
import { kindOf } from '../model/kinds.js';

function swatch(color, pressed, onclick, title) {
  return node(`button.swatch${color === CLEAR ? '.clear' : ''}`, {
    style: color === CLEAR ? null : { background: toHex(color) },
    title,
    'aria-label': title,
    'aria-pressed': String(pressed),
    onclick,
  });
}

// colours to draw with that the art does not have yet: the project's own palettes, else a basic set
function paletteGroups(state) {
  const palettes = state.project.palettes ?? [];

  return palettes.length
    ? palettes.map(({ name, colors }) => ({ name, colors }))
    : [{ name: 'Basic colours', colors: BASIC_COLOURS.map(fromHex) }];
}

function swatchGroup(app, { name, colors }) {
  const { state } = app.store;
  const pickColor = (color) =>
    app.store.set({ color, tool: state.tool === 'eraser' ? 'pencil' : state.tool });

  return node(
    'div.swatches',
    { role: 'group', 'aria-label': name },
    colors.map((color) =>
      swatch(color, state.color === color, () => pickColor(color), toHex(color)),
    ),
  );
}

function colourButtons(app) {
  const { project } = app.store.state;

  return node(
    'div.group',
    { style: { gap: '6px' } },
    node(
      'button.btn',
      { style: { flex: '1' }, onclick: () => openSwapSheet(app) },
      icon('swap'),
      'Swap colours…',
    ),
    // outfits recolour a character's or an object's parts; tiles, effects and icons have none
    kindOf(project).place === 'feet'
      ? node(
          'button.btn',
          { style: { flex: '1' }, onclick: () => openOutfitsSheet(app) },
          gameOf(project).teamKits ? 'Team kits…' : 'Outfits…',
        )
      : null,
  );
}

export function renderColourPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);
  // with the palette locked, only the art's own colours are offered
  const groups = state.paletteLock ? [] : paletteGroups(state);

  replace(
    el,
    node('h2', { tabindex: '0' }, 'Colours', node('span.mono', {}, `${colors.length}`)),
    colourWell(app, colors),
    colors.length ? swatchGroup(app, { name: "The art's colours", colors }) : null,
    groups.map((group) => [node('div.hint', {}, group.name), swatchGroup(app, group)]),
    colourButtons(app),
  );
}

export function renderDrawingPanel(el, app) {
  replace(el, drawingSettings(app, characterColors(app.store.state)));
}
