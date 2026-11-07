import { commitPose, currentAnimation, currentFrames, restructure } from '../actions.js';
import { frameAt } from '../../model/project.js';
import { bodyOf } from '../../model/body/body-kind.js';
import { poseBody, restoreBody, rigOf } from '../../model/body/body.js';
import { partPose, restPose } from '../../model/body/rig.js';

// What posing works on: the view's cut, the Body of the frame being edited and its canvas.
export function poseTarget(state) {
  return {
    rig: rigOf(currentAnimation(state), state.at.direction),
    body: bodyOf(frameAt(state.project, state.at)),
    canvas: state.project.canvas,
  };
}

// one part's pose changed: change is part of { x, y, angle }, or null to put it back at rest
export function withPart(pose, id, change) {
  const parts = { ...pose.parts, [id]: { ...partPose(pose, id), ...change } };

  if (!change) {
    delete parts[id];
  }

  return { ...pose, parts };
}

export function setPose(app, label, pose) {
  const { rig, body, canvas } = poseTarget(app.store.state);

  commitPose(app, { label, layers: [body] }, () => poseBody(body, { rig, pose, canvas }));
}

export function setPart(app, piece, change) {
  const { body } = poseTarget(app.store.state);
  const label = change ? `Pose ${piece.name}` : `Reset ${piece.name}`;

  setPose(app, label, withPart(body.pose, piece.id, change));
}

// every part back at rest, the body staying where it stands
export function resetPose(app) {
  const { body } = poseTarget(app.store.state);

  setPose(app, 'Reset pose', { ...restPose(), x: body.pose.x, y: body.pose.y });
}

// the pose of the nearest frame before this one that has one, or the rest pose
function poseBefore(state) {
  const frames = currentFrames(state).slice(0, state.at.frame).reverse();

  return frames.map(bodyOf).find((body) => body?.pose)?.pose ?? restPose();
}

export function poseHere(app) {
  const { state } = app.store;
  const { rig, body, canvas } = poseTarget(state);
  const pose = poseBefore(state);

  if (body) {
    setPose(app, 'Pose the parts', pose);

    return;
  }

  restructure(app, 'Pose the parts', (draft) => {
    const animation = currentAnimation(draft);
    const restored = restoreBody(draft.project, animation, frameAt(draft.project, draft.at));

    poseBody(restored, { rig, pose, canvas });
  });
}

// this frame's Body becomes plain pixels, to touch up by hand
export function turnIntoPixels(app) {
  const { body } = poseTarget(app.store.state);

  commitPose(app, { label: 'Turn into pixels', layers: [body] }, () => {
    delete body.pose;
  });
}

// a drag that poses the Body as it goes, kept as one step when let go
export function keepDrag(app, { label, body, before }) {
  const changed = app.history.record(label, [
    { layer: body, before: before.sprite, poseBefore: before.pose },
  ]);

  if (changed) {
    app.saver.markLayers([body.id]);
    app.saver.markStructure();
    app.store.touch('pixels');
  }
}
