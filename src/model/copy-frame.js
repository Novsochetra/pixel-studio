import { cloneSprite, createSprite } from './sprite.js';
import { matchingLayer } from './project.js';
import { paintOver } from './layer-ops.js';
import { bodyOf, isBody } from './body/body-kind.js';

// A view cut its own way takes a copied Body as plain pixels; a view not cut yet takes the
// figure on its art instead, where Cut into parts finds it.
function copyInto(frame, source, { canvas, cut }) {
  for (const layer of frame.layers) {
    const copy = matchingLayer(source, layer)?.sprite;

    layer.sprite = copy ? cloneSprite(copy) : createSprite(canvas.width, canvas.height);

    if (isBody(layer)) {
      delete layer.pose;
    }
  }

  const body = bodyOf(frame);
  const art = frame.layers.find((layer) => layer.kind === 'art');

  if (!cut && body && art) {
    paintOver(art.sprite, body.sprite);
    body.sprite = createSprite(canvas.width, canvas.height);
  }
}

// the current frame of one view becomes the same frame of every other view: a start for them
export function copyFrameToViews(project, animation, direction, index) {
  const source = animation.directions[direction].frames[index];

  for (const [other, entry] of Object.entries(animation.directions)) {
    if (other !== direction) {
      copyInto(entry.frames[index], source, { canvas: project.canvas, cut: Boolean(entry.rig) });
    }
  }
}
