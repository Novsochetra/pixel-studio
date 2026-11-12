import { changeStructure } from './actions.js';

// A palette added to the project is a step, as one taken off is: undo passed over it to the
// stroke before, and left the palette.
export function addPaletteStep(app, palette) {
  const { project } = app.store.state;
  const before = structuredClone(project.palettes);

  project.palettes.push(palette);
  app.history.recordSetting(
    `Add ${palette.name}`,
    'palettes',
    before,
    structuredClone(project.palettes),
  );
  changeStructure(app, 'palettes');
}
