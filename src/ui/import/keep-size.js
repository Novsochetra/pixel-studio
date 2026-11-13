import { actionRow, listGroup } from '../list-group.js';
import { firstAnchor, resizeCanvas } from '../canvas-size-sheet.js';
import { canvasToKeep } from '../../model/canvas-room.js';
import { placementOf } from '../../model/kinds.js';
import { undo } from '../undo.js';

// A picture too large for the canvas was made smaller without a word, and its detail went with
// it: the window says so, and offers the canvas it needs. So does a height typed that the canvas
// has no room for.
export function keepSizeOffer(job, report, cleanAgain) {
  const { app } = job;
  const { project } = app.store.state;
  const size = job.alone ? canvasToKeep(report, project.canvas, placementOf(project)) : null;
  const { wantedHeight, drawnHeight } = report.scaled ?? {};
  const wanted = wantedHeight ?? drawnHeight;

  if (!size) {
    return null;
  }

  const grow = async () => {
    const anchor = firstAnchor(app.store.state.project);

    if (await resizeCanvas(app, { size, anchor })) {
      // the window may yet be cancelled, and the canvas with it (import-sheet.js)
      job.outcome.grew = true;
      cleanAgain();
    }
  };

  return listGroup(
    {
      title: 'Made smaller to fit',
      note:
        wanted === drawnHeight
          ? `The art is ${wanted} px tall, drawn here ${report.size[1]}. A larger canvas keeps every pixel.`
          : `Asked for ${wanted} px tall, it is drawn ${report.size[1]} here. A larger canvas has room for it.`,
    },
    actionRow(`Make the canvas ${size.width}×${size.height}`, grow, { id: 'import-grow' }),
  );
}

// The canvas made larger for a picture goes back as the window is cancelled: Cancel left it
// at the new size, with nothing put on it. Not once something else has been done since.
export function cancelGrowth(app, { grew, used }) {
  if (grew && !used && app.history.nextUndo === 'Canvas size') {
    undo(app);
  }
}
