import { cssVar } from '../draw.js';
import { lassoOwners } from '../../model/body/lasso.js';

// the loop being drawn, over the art
export function drawLasso(context, job) {
  const loop = job.lasso;

  if (!loop?.length) {
    return;
  }

  const { scale } = job.view;

  context.save();
  context.beginPath();
  loop.forEach(([x, y]) => context.lineTo(x * scale, y * scale));
  context.closePath();
  context.lineWidth = 2;
  context.strokeStyle = cssVar('--ink');
  context.stroke();
  context.setLineDash([5, 4]);
  context.strokeStyle = cssVar('--tint');
  context.stroke();
  context.restore();
}

// a drag that draws a loop; let go, the art inside goes to the part picked, or to none
export function lassoDrag(job, start) {
  job.lasso = [start];

  return {
    move(point) {
      job.lasso.push(point);
    },
    end() {
      const index = job.erase ? -1 : job.selected;

      lassoOwners(job.plan, { source: job.source, loop: job.lasso, index });
      job.lasso = null;
    },
  };
}
