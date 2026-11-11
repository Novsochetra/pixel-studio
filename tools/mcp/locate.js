import { directionLabel } from '../../src/model/project.js';

const same = (first, second) => String(first).toLowerCase() === String(second).toLowerCase();
const listed = (names) => names.map((name) => `"${name}"`).join(', ');

function animationOf(project, name) {
  const found = name
    ? project.animations.find((each) => same(each.name, name))
    : project.animations[0];

  if (!found) {
    const names = project.animations.map((each) => each.name);

    throw new Error(`No animation "${name}". This project has ${listed(names)}.`);
  }

  return found;
}

// a view by its id ("south") or its name ("Front"); none asked for is the project's first view
function directionOf(project, animation, view) {
  const directions = Object.keys(animation.directions);

  if (!view) {
    return directions.includes(project.referenceDirection)
      ? project.referenceDirection
      : directions[0];
  }

  const found = directions.find((id) => same(id, view) || same(directionLabel(id), view));

  if (!found) {
    const names = directions.map(directionLabel);

    throw new Error(`No view "${view}" in ${animation.name}. It has ${listed(names)}.`);
  }

  return found;
}

// a layer by name; none asked for is the top layer of art, where a stroke would go
function layerOf(frame, name) {
  const found = name
    ? frame.layers.find((each) => same(each.name, name))
    : (frame.layers.findLast((each) => each.kind === 'art') ?? frame.layers.at(-1));

  if (!found) {
    const names = frame.layers.map((each) => each.name);

    throw new Error(`No layer "${name}" in this frame. It has ${listed(names)}.`);
  }

  return found;
}

// where: { animation, view, frame, layer }, each optional; frames count from 1 as the studio's do
export function locate(project, where = {}) {
  const animation = animationOf(project, where.animation);
  const direction = directionOf(project, animation, where.view);
  const { frames } = animation.directions[direction];
  const number = where.frame ?? 1;
  const frame = frames[number - 1];

  if (!frame) {
    throw new Error(
      `No frame ${number}: ${animation.name}, ${directionLabel(direction)} has ${frames.length}.`,
    );
  }

  return { animation, direction, frame, index: number - 1, layer: layerOf(frame, where.layer) };
}
