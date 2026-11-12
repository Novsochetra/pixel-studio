import { changeStructure } from './actions.js';
import { actionRow } from './list-group.js';

const withItem = (list, { item, index }) => [...list.slice(0, index), item, ...list.slice(index)];

// whether a button was pressed with the keys: asked before its list is drawn again, as a
// button taken off the page answers no. A click's own count of presses is 0 for the keys in
// one browser and not in another.
export const byKeys = (click) => Boolean(click.currentTarget?.matches(':focus-visible'));

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

// A name changed in the window is a step too, as its removal is: undo passed over it.
export function rename(app, { key, item, name }) {
  const { project } = app.store.state;

  if (!name || name === item.name) {
    return;
  }

  const before = structuredClone(project[key]);

  item.name = name;
  app.history.recordSetting(`Rename ${name}`, key, before, structuredClone(project[key]));
}

// With the keys in use they go to the row that takes the removal back. Left to the list as it
// was drawn again, they stood on the next thing's Remove, and a second Enter removed that too.
export const keysToPutBack = (key) =>
  document.querySelector(`.sheet [data-put-back="${key}"]`)?.focus();

export function putBackRow(app, { key, taken }, redraw) {
  const last = taken[key];

  if (!last) {
    return null;
  }

  const putBack = (click) => {
    const { project } = app.store.state;
    const before = structuredClone(project[key]);
    const keys = byKeys(click);

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

    // the keys go to what came back, at the button that took it off: in the name of the thing
    // next to it, the next key typed renamed that
    if (keys) {
      document
        .querySelector(`.sheet [aria-label="${CSS.escape(`Remove ${last.item.name}`)}"]`)
        ?.focus();
    }
  };
  const row = actionRow(`Put back ${last.item.name}`, putBack);

  row.classList.add('put-back');
  row.dataset.putBack = key;

  return row;
}
