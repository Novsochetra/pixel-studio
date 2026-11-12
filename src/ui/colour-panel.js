import { node, replace } from './dom.js';
import { characterColors } from './character-colours.js';
import { colourWell } from './colour-well.js';
import { otherColours, projectPalettes, swatchGroup } from './colour-groups.js';
import { drawingSettings } from './drawing-settings.js';
import { actionRow, listGroup } from './list-group.js';
import { openSwapSheet } from './swap-sheet.js';
import { openOutfitsSheet } from './outfits-sheet.js';
import { gameOf } from '../model/presets.js';
import { kindOf } from '../model/kinds.js';

// each leads to a window of its own, as its row's chevron says
function colourWindows(app) {
  const { project } = app.store.state;
  const outfits = gameOf(project).teamKits ? 'Team kits' : 'Outfits';
  const leadsTo = (name, open) =>
    actionRow(name, () => open(app), { leads: true, 'aria-label': `${name}…` });

  return listGroup(
    {},
    leadsTo('Swap colours', openSwapSheet),
    // outfits recolour a character's or an object's parts; tiles, effects and icons have none
    kindOf(project).place === 'feet' ? leadsTo(outfits, openOutfitsSheet) : null,
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
    // the palettes added to the project are the art's own choice: the lock keeps them in reach
    projectPalettes(app),
    // With the palette locked only the art's colours and its palettes are offered: the others
    // stay where they stand, dimmed and out of reach. Taken away, everything under them moved
    // up, the lock's own switch from under the finger that pressed it.
    node(
      `div.other-colours${state.paletteLock ? '.locked' : ''}`,
      { inert: state.paletteLock, title: state.paletteLock ? 'Palette lock is on' : null },
      otherColours(app, colors),
    ),
    colourWindows(app),
  );
}

export function renderDrawingPanel(el, app) {
  const { state } = app.store;
  const colors = characterColors(state);

  replace(el, drawingSettings(app, colors));
}
