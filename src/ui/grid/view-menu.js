import { changeStructure, currentAnimation, restructure } from '../actions.js';
import { openMenu } from '../menu.js';
import { addDirection, removeDirection } from '../../model/structure.js';
import { missingDirections } from '../../model/directions.js';
import { referenceOf } from '../../model/reference.js';
import { viewName } from '../../model/kinds.js';

export function makeReference(app, direction) {
  const { project } = app.store.state;
  const before = project.referenceDirection;
  project.referenceDirection = direction;
  app.history.recordSetting('Reference view', 'referenceDirection', before, direction);
  changeStructure(app, 'project');
}

// a view's own actions: the reference every other view is matched to, or gone from this animation
export function openViewMenu(app, anchor, direction) {
  const { state } = app.store;
  const name = viewName(state.project, direction);
  const views = Object.keys(currentAnimation(state).directions).length;

  openMenu(anchor, [
    [
      `Make ${name} the view the others match`,
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

export function openAddViewMenu(app, anchor) {
  const { state } = app.store;

  openMenu(
    anchor,
    missingDirections(state.project, currentAnimation(state)).map((direction) => [
      viewName(state.project, direction),
      () =>
        restructure(app, `Add ${viewName(state.project, direction)}`, (draft) => {
          addDirection(draft.project, currentAnimation(draft), direction);

          return { direction };
        }),
    ]),
  );
}
