import { actionRow, listGroup } from '../list-group.js';
import { firstAnchor, resizeCanvas } from '../canvas-size-sheet.js';
import { canvasToKeep } from '../../model/canvas-room.js';
import { placementOf } from '../../model/kinds.js';

// the canvas every picture cleaned on its own keeps its pixels on, or null if none was shrunk
export function batchCanvas(project, items) {
  const sizes = items
    .filter((item) => item.alone && item.report)
    .map((item) => canvasToKeep(item.report, project.canvas, placementOf(project)))
    .filter(Boolean);

  if (!sizes.length) {
    return null;
  }

  return {
    width: Math.max(...sizes.map(({ width }) => width)),
    height: Math.max(...sizes.map(({ height }) => height)),
  };
}

// As one picture cleaned does, several made smaller to fit say so, and offer the canvas they
// need: the batch shrank them to a few dozen pixels with only "scaled 0.48×" in each row.
export function batchGrowOffer(app, items, { outcome, cleanAgain }) {
  const size = batchCanvas(app.store.state.project, items);

  if (!size) {
    return null;
  }

  const grow = async () => {
    if (await resizeCanvas(app, { size, anchor: firstAnchor(app.store.state.project) })) {
      // the window may yet be cancelled, and the canvas with it (cancelGrowth)
      outcome.grew = true;
      cleanAgain();
    }
  };

  return listGroup(
    {
      title: 'Made smaller to fit',
      note: 'The pictures were made smaller to fit this canvas. A larger canvas keeps every pixel.',
    },
    actionRow(`Make the canvas ${size.width}×${size.height}`, grow, { id: 'batch-grow' }),
  );
}
