import { changeStructure, currentAnimation, restructure } from '../actions.js';
import { openMenu } from '../menu.js';
import { addDirection, removeDirection } from '../../model/structure.js';
import { drawableDirections } from '../../model/directions.js';
import { referenceOf } from '../../model/reference.js';
import { viewName } from '../../model/kinds.js';

function makeReference(app, direction) {
  app.store.state.project.referenceDirection = direction;
  changeStructure(app, 'project');
}

// a view's own actions: the reference every other view is matched to, or gone from this animation
export function openViewMenu(app, anchor, direction) {
  const { state } = app.store;
  const name = viewName(state.project, direction);
  const views = Object.keys(currentAnimation(state).directions).length;

  openMenu(anchor, [
    [
      `Match the other views to ${name}`,
      () => makeReference(app, direction),
      {
        disabled: referenceOf(state.project) === direction,
        title: 'Cleaning sizes and colours every view like this one',
      },
    ],
    null,
    [
      `Remove ${name} from this animation`,
      () =>
        restructure(app, `Remove ${name}`, (draft) => {
          removeDirection(currentAnimation(draft), direction);
        }),
      { danger: true, disabled: views < 2 },
    ],
  ]);
}

// the directions this project can draw that the animation does not have yet
export function missingViews(state) {
  const drawn = Object.keys(currentAnimation(state).directions);

  return drawableDirections(state.project).filter((direction) => !drawn.includes(direction));
}

export function openAddViewMenu(app, anchor) {
  const { state } = app.store;

  openMenu(
    anchor,
    missingViews(state).map((direction) => [
      viewName(state.project, direction),
      () =>
        restructure(app, `Add ${viewName(state.project, direction)}`, (draft) => {
          addDirection(draft.project, currentAnimation(draft), direction);

          return { direction };
        }),
    ]),
  );
}
