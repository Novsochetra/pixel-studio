import { changeStructure } from '../actions.js';

export const markupOf = (project) => project.markup ?? { strokes: [], notes: [] };

// A change to the board's marks and notes, as an undo step of its own: without one, undo on the
// board took back an edit to the art that the board does not even show.
export function changeMarkup(app, label, change) {
  const { project } = app.store.state;
  const before = markupOf(project);
  const after = structuredClone(before);

  change(after);
  project.markup = after;
  app.history.recordSetting(label, 'markup', before, structuredClone(after));
  changeStructure(app, 'markup');
}
