import { changeStructure } from './actions.js';
import { actionRow } from './list-group.js';

const withItem = (list, { item, index }) => [...list.slice(0, index), item, ...list.slice(index)];

// One of the project's named things (a part, an outfit) taken off in a window. It is a step, so
// it goes without a question, as a palette does; the keys' undo is the editor's, behind the
// window, so the window remembers what went in `taken` and offers it back itself.
export function takeOff(app, { key, item, taken }) {
  const { project } = app.store.state;
  const before = structuredClone(project[key]);

  taken[key] = { item, index: project[key].indexOf(item) };
  project[key] = project[key].filter((other) => other !== item);
  app.history.recordSetting(`Remove ${item.name}`, key, before, structuredClone(project[key]));
  changeStructure(app, 'parts');
}

export function putBackRow(app, { key, taken }, redraw) {
  const last = taken[key];

  if (!last) {
    return null;
  }

  const putBack = () => {
    const { project } = app.store.state;
    const before = structuredClone(project[key]);

    project[key] = withItem(project[key], last);
    app.history.recordSetting(
      `Put back ${last.item.name}`,
      key,
      before,
      structuredClone(project[key]),
    );
    taken[key] = null;
    changeStructure(app, 'parts');
    redraw();
  };
  const row = actionRow(`Put back ${last.item.name}`, putBack);

  row.classList.add('put-back');

  return row;
}
