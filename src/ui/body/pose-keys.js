import { partPose, pieceById } from '../../model/body/rig.js';
import { tidyAngle } from '../../model/body/handle.js';
import { poseTarget, setPart, setPose } from './pose-actions.js';
import { movedBy } from './pose-tool.js';

// With a part picked: the arrows move it (Shift: 10 pixels), [ and ] turn it 5° (Shift: 1°), Esc
// lets go of it.

const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
const TURNS = { '[': -1, ']': 1, '{': -1, '}': 1 };

function nudge(app, piece, [dx, dy]) {
  const { rig, body } = poseTarget(app.store.state);

  setPose(app, `Move ${piece.name}`, movedBy(rig, body.pose, piece, [dx, dy]));
}

function turn(app, piece, { step, fine }) {
  const { body } = poseTarget(app.store.state);
  const angle = partPose(body.pose, piece.id).angle + step * (fine ? 1 : 5);

  setPart(app, piece, { angle: tidyAngle(angle) });
}

function pickedPart(state) {
  const target = poseTarget(state);

  return state.tool === 'pose' && target.body?.pose ? pieceById(target.rig, state.piece) : null;
}

export function handlePoseKey(app, event, key) {
  const piece = pickedPart(app.store.state);

  if (!piece || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  if (ARROWS[key]) {
    const size = event.shiftKey ? 10 : 1;

    nudge(
      app,
      piece,
      ARROWS[key].map((step) => step * size),
    );
  } else if (TURNS[key]) {
    turn(app, piece, { step: TURNS[key], fine: event.shiftKey });
  } else if (key === 'escape') {
    app.store.set({ piece: null });
  } else {
    return false;
  }

  event.preventDefault();

  return true;
}
