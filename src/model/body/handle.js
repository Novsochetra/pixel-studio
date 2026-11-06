import { decodeArt } from './piece-art.js';
import { pivotInPose, pivotPoint } from './rig.js';

// A part's turning handle stands beyond its far end, along the line from its pivot through its
// middle, so a limb is turned by grabbing past its hand or foot. `gap` is how far past, in art
// pixels. A part that turns about its own middle has its handle above it.
export function handleOf(rig, pose, piece, gap) {
  const { x, y, sprite } = decodeArt(piece.art);
  const pivot = pivotPoint(piece);
  const along = [x + sprite.width / 2 - pivot.x, y + sprite.height / 2 - pivot.y];
  const length = Math.hypot(...along);
  const unit = length < 1 ? [0, -1] : along.map((value) => value / length);
  const corners = [
    [x, y],
    [x + sprite.width, y],
    [x, y + sprite.height],
    [x + sprite.width, y + sprite.height],
  ];
  const far = Math.max(...corners.map(([cx, cy]) => Math.hypot(cx - pivot.x, cy - pivot.y)));
  const { point, turned } = pivotInPose(rig, pose, piece);
  const radians = (turned * Math.PI) / 180;
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)];
  const direction = [cos * unit[0] - sin * unit[1], sin * unit[0] + cos * unit[1]];

  return {
    pivot: point,
    knob: [point[0] + direction[0] * (far + gap), point[1] + direction[1] * (far + gap)],
  };
}

// the angle, in degrees, of the line from `from` to `to`; y grows downward
export const angleOf = (from, to) => (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

// an angle as one between -180 and 180, whole degrees, or whole steps of `snap` degrees
export function tidyAngle(angle, snap = 1) {
  const stepped = Math.round(angle / snap) * snap;

  return ((((stepped + 180) % 360) + 360) % 360) - 180 || 0;
}
