// A character cut into parts is drawn on one layer of this kind, its Body: each frame's Body
// holds the pose (layer.pose) and the pixels drawn from it, so downloads and previews see plain
// pixels. The cut itself, one per view, is that view's rig (animation.directions[view].rig).

export const BODY_KIND = 'rig';

export const isBody = (layer) => layer?.kind === BODY_KIND;

// a Body still drawn from its parts; painting on it would be lost at the next pose
export const isPosedBody = (layer) => isBody(layer) && Boolean(layer.pose);

export const bodyOf = (frame) => frame?.layers.find(isBody) ?? null;

// a Body copied somewhere its pose means nothing (another view) keeps its pixels as plain art
export function withoutPose(layer) {
  const copy = { ...layer };

  delete copy.pose;

  return copy;
}
