import { actionRow, listGroup } from '../list-group.js';
import { firstAnchor, resizeCanvas } from '../canvas-size-sheet.js';
import { canvasToKeep } from '../../model/canvas-room.js';
import { placementOf } from '../../model/kinds.js';

// A picture too large for the canvas was made smaller without a word, and its detail went with
// it: the window says so, and offers the canvas it needs. Not when a height was typed: that was
// asked for.
export function keepSizeOffer(job, report, cleanAgain) {
  const { app } = job;
  const { project } = app.store.state;
  const size =
    job.alone && !job.asked?.height
      ? canvasToKeep(report, project.canvas, placementOf(project))
      : null;

  if (!size) {
    return null;
  }

  const grow = async () => {
    const anchor = firstAnchor(app.store.state.project);

    if (await resizeCanvas(app, { size, anchor })) {
      cleanAgain();
    }
  };

  return listGroup(
    {
      title: 'Made smaller to fit',
      note: `The art is ${report.scaled.drawnHeight} px tall, drawn here ${report.size[1]}. A larger canvas keeps every pixel.`,
    },
    actionRow(`Make the canvas ${size.width}×${size.height}`, grow, { id: 'import-grow' }),
  );
}
