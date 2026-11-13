import { changeStructure } from './actions.js';
import { freeName } from '../model/free-name.js';

// A palette added to the project is a step, as one taken off is: undo passed over it to the
// stroke before, and left the palette.
// It takes a name no other palette has: a kit kept twice was two palettes of one name, which the
// list of palettes could not tell apart.
export function addPaletteStep(app, palette) {
  const { project } = app.store.state;
  const before = structuredClone(project.palettes);

  palette.name = freeName(
    palette.name,
    before.map(({ name }) => name),
  );
  project.palettes.push(palette);
  app.history.recordSetting(
    `Add ${palette.name}`,
    'palettes',
    before,
    structuredClone(project.palettes),
  );
  changeStructure(app, 'palettes');
}
