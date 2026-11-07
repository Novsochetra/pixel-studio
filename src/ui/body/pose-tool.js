import { cloneSprite } from '../../model/sprite.js';
import { invert } from '../../model/body/affine.js';
import { angleOf, handleOf, tidyAngle } from '../../model/body/handle.js';
import { parentMatrix, partPose, pieceAt, pieceById, pivotInPose } from '../../model/body/rig.js';
import { poseBody } from '../../model/body/body.js';
import { toast } from '../dom.js';
import { keepDrag, poseTarget, withPart } from './pose-actions.js';

// The Pose tool: a press on a part picks it and drags it; a press on the picked part's handle, or
// with Shift held, turns it about its pivot (Shift while turning keeps to steps of 15°).

const HANDLE_GAP = 14;
const HANDLE_REACH = 10;
const SNAP = 15;

const hundredths = (value) => Math.round(value * 100) / 100;

export function handleGap(zoom) {
  return HANDLE_GAP / zoom;
}

function onHandle(target, piece, point, zoom) {
  const { knob } = handleOf(target.rig, target.body.pose, piece, handleGap(zoom));
  const reach = Math.max(1.5, HANDLE_REACH / zoom);

  return Math.hypot(point[0] + 0.5 - knob[0], point[1] + 0.5 - knob[1]) <= reach;
}

function poseDrag(app, label, poseAt) {
  const { rig, body, canvas } = poseTarget(app.store.state);
  const before = { sprite: cloneSprite(body.sprite), pose: body.pose };

  return {
    move(point, event) {
      poseBody(body, { rig, pose: poseAt(point, event), canvas });
      app.store.touch('stroke');
    },
    cancel() {
      Object.assign(body, { sprite: before.sprite, pose: before.pose });
      app.store.touch('stroke');
    },
    end: () => keepDrag(app, { label, body, before }),
  };
}

// A move on the canvas is a move as the part's parents see it: a forearm on a turned upper arm
// still goes where it is dragged.
export function movedBy(rig, pose, piece, [dx, dy]) {
  const own = partPose(pose, piece.id);
  const back = invert(parentMatrix(rig, pose, piece));

  return withPart(pose, piece.id, {
    x: hundredths(own.x + back.a * dx + back.c * dy),
    y: hundredths(own.y + back.b * dx + back.d * dy),
  });
}

function moveDrag(app, piece, start) {
  const { rig, body } = poseTarget(app.store.state);
  const pose = body.pose;

  return poseDrag(app, `Move ${piece.name}`, ([x, y]) =>
    movedBy(rig, pose, piece, [x - start[0], y - start[1]]),
  );
}

function turnDrag(app, piece, start) {
  const { rig, body } = poseTarget(app.store.state);
  const pose = body.pose;
  const own = partPose(pose, piece.id);
  const { point: centre } = pivotInPose(rig, pose, piece);
  const towards = ([x, y]) => angleOf(centre, [x + 0.5, y + 0.5]);
  const from = towards(start);

  return poseDrag(app, `Turn ${piece.name}`, (point, event) => {
    const angle = own.angle + towards(point) - from;

    return withPart(pose, piece.id, { angle: tidyAngle(angle, event?.shiftKey ? SNAP : 1) });
  });
}

function cannotPose(target) {
  if (!target.rig) {
    toast('This view is not cut into parts yet: Cut into parts… is in the bar above the canvas.');
  } else if (!target.body?.pose) {
    toast('This frame is plain pixels: Pose the parts here is in the bar above the canvas.');
  } else if (!target.body.visible) {
    toast('Body is hidden, so you would not see the pose. Show it in Layers first.');
  } else {
    return false;
  }

  return true;
}

export function poseTool(app, point, event) {
  const { state } = app.store;
  const target = poseTarget(state);

  if (cannotPose(target)) {
    return null;
  }

  const picked = pieceById(target.rig, state.piece);

  if (picked && onHandle(target, picked, point, state.zoom)) {
    return turnDrag(app, picked, point);
  }

  const piece = pieceAt(target.rig, target.body.pose, point);

  app.store.set({ piece: piece?.id ?? null, at: { ...state.at, layer: target.body.key } });

  if (!piece) {
    return null;
  }

  return event.shiftKey ? turnDrag(app, piece, point) : moveDrag(app, piece, point);
}
