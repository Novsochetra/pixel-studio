import { toast } from '../dom.js';
import { currentAnimation, restructure } from '../actions.js';
import { frameAt } from '../../model/project.js';
import { bounds } from '../../model/sprite.js';
import { cutIntoParts, leftOver } from '../../model/body/cut.js';
import { applyCut, bodyKey, leftoverLayer } from '../../model/body/body.js';
import { corrected } from './cut-leave.js';

// what was made, and where the pixels no part holds went: unsaid, a part removed from a cut
// looked simply deleted
function cutSaid(job, { parts, frames, left }) {
  const { state } = job.app.store;
  const frame = frameAt(state.project, state.at);
  const made = `${job.recut ? 'The cut now has' : 'Cut into'} ${parts} parts${frames > 1 ? `, in ${frames} frames` : ''}.`;

  return job.recut && left
    ? `${made} What no part holds is back on ${leftoverLayer(frame)?.name ?? 'the art'}, in every frame it was in.`
    : `${made} Drag a part to pose it; its handle turns it.`;
}

export function makeCut(job) {
  const { app } = job;

  job.done = true;

  // a cut looked at and left as it was is no step, and nothing to tell of
  if (job.recut && !corrected(job)) {
    job.close();

    return;
  }

  const parts = job.plan.parts.map(({ id, name, parent, pivot }) => ({ id, name, parent, pivot }));
  const rig = cutIntoParts(job.source, job.plan.owners, parts);
  const leftover = leftOver(job.source, job.plan.owners);
  let frames = 0;

  app.store.together(() => {
    restructure(app, job.recut ? 'Edit the cut' : 'Cut into parts', (draft) => {
      const animation = currentAnimation(draft);
      const cutOf = { direction: job.direction, frame: job.frame, rig, source: job.source };

      frames = applyCut(draft.project, animation, {
        ...cutOf,
        layerKey: job.layer?.key,
        art: job.layer?.sprite,
        leftover,
      });

      return { layer: bodyKey(animation) };
    });
    app.store.set({ tool: 'pose', piece: null });
  });
  job.close();
  toast(cutSaid(job, { parts: rig.pieces.length, frames, left: Boolean(bounds(leftover)) }));
}
