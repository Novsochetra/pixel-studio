// A choice of what a colour becomes is kept with the project, so it is a step: undo passed over
// it to the palette before, and redo brought the palette back with the choice in it.
export function changeMapping(job, label, change) {
  const { app, paletteId } = job;
  const { project } = app.store.state;
  const before = structuredClone(project.mappings);

  change(project.mappings, paletteId);
  app.history.recordSetting(label, 'mappings', before, structuredClone(project.mappings));
  app.saver.markStructure();
  job.draw();
}

export function setTarget(mapping, color, target) {
  if (target === undefined) {
    delete mapping[color];
  } else {
    mapping[color] = target;
  }
}
