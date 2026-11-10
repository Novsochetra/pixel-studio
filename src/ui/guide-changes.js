import { changeStructure } from './actions.js';

// A change to the guide lines, as an undo step of its own: a guide removed could not be brought
// back, and undo took back a stroke of the art instead.
export function changeGuides(app, label, change) {
  const { project } = app.store.state;
  const before = structuredClone(project.guides);

  change(project.guides);
  app.history.recordSetting(label, 'guides', before, structuredClone(project.guides));
  changeStructure(app, 'guides');
}
