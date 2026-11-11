import { icon, node } from '../dom.js';
import { directionsInUse, selectDirection } from '../actions.js';
import { openMenu } from '../menu.js';
import { setGridAll } from './all-views.js';
import { viewName } from '../../model/kinds.js';

// an animation with one view has nothing to choose between: every row it has is in sight
export const showsEveryView = (state) => state.gridAll || directionsInUse(state).length < 2;

const onlyName = (state, direction) => `${viewName(state.project, direction)} only`;

function entries(app) {
  const { state } = app.store;
  const all = showsEveryView(state);
  // the view already being edited is not gone to again: going to it stopped what was playing
  const only = (direction) => {
    setGridAll(app, false);

    if (direction !== state.at.direction) {
      selectDirection(app, direction);
    }
  };

  return [
    ['All views', () => setGridAll(app, true), { checked: all }],
    null,
    ...directionsInUse(state).map((direction) => [
      onlyName(state, direction),
      () => only(direction),
      { checked: !all && state.at.direction === direction },
    ]),
  ];
}

// "This view" and "All views" named no view, and stood there with one view to show. The button
// says which views have their frames in sight, and its menu names the views there are.
export function viewsMenu(app) {
  const { state } = app.store;

  if (directionsInUse(state).length < 2) {
    return null;
  }

  const shown = showsEveryView(state) ? 'All views' : onlyName(state, state.at.direction);

  return node(
    'button.btn.views-pick',
    {
      'aria-haspopup': 'menu',
      'aria-label': `Views shown: ${shown}`,
      title: 'The views whose frames show here, and play together',
      onclick: (event) => openMenu(event.currentTarget, entries(app), { align: 'right' }),
    },
    node('span', {}, shown),
    icon('chevron-down'),
  );
}
