import { node, icon, replace } from './dom.js';
import { characterColors } from './character-colours.js';
import { colourWell } from './colour-well.js';
import { otherColours, swatchGroup } from './colour-groups.js';
import { drawingSettings } from './drawing-settings.js';
import { openSwapSheet } from './swap-sheet.js';
import { openOutfitsSheet } from './outfits-sheet.js';
import { gameOf } from '../model/presets.js';
import { kindOf } from '../model/kinds.js';

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
  replace(
    el,
    node('h2', { tabindex: '0' }, 'Colours', node('span.mono', {}, `${colors.length}`)),
    colourWell(app, colors),
    colors.length ? swatchGroup(app, { name: "The art's colours", colors }) : null,
    // With the palette locked only the art's own colours are offered: the others stay where
    // they stand, dimmed and out of reach. Taken away, everything under them moved up, the
    // lock's own switch from under the finger that pressed it.
    node(
      `div.other-colours${state.paletteLock ? '.locked' : ''}`,
      { inert: state.paletteLock, title: state.paletteLock ? 'Palette lock is on' : null },
      otherColours(app, colors),
    ),
    colourButtons(app),
  );
}

export function renderDrawingPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);

  replace(el, drawingSettings(app, colors));
}
