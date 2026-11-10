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
    // with the palette locked, only the art's own colours are offered
    state.paletteLock ? null : otherColours(app, colors),
    colourButtons(app),
  );
}

export function renderDrawingPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);

  // "Paint only over" a colour the art no longer has would stop every stroke, while its menu,
  // made of the art's colours, read "Any pixel"
  if (state.paintOver !== null && !colors.includes(state.paintOver)) {
    state.paintOver = null;
  }

  replace(el, drawingSettings(app, colors));
}
