import { commitPose } from '../actions.js';
import { applyMapping } from '../../palette/palette.js';
import { isPosedBody } from '../../model/body/body-kind.js';
import { poseBody, recolourRigs, rigOf } from '../../model/body/body.js';
import { allLayers } from '../../model/project.js';

function setRigs(project, changes) {
  for (const change of changes) {
    const animation = project.animations.find((candidate) => candidate.id === change.animation);

    animation.directions[change.direction].rig = change.after;
  }
}

// A turn's smoothing depends on which colours are alike, so a posed Body is drawn again from its
// recoloured cut rather than recoloured pixel by pixel.
function redrawBodies(project, layers) {
  for (const { animation, direction, layer } of allLayers(project)) {
    if (layers.has(layer) && isPosedBody(layer)) {
      poseBody(layer, {
        rig: rigOf(animation, direction),
        pose: layer.pose,
        canvas: project.canvas,
      });
    }
  }
}

// New colours on some layers as one step. Everywhere, the cut parts take them too, so the next
// pose keeps them; in one frame only, a posed Body there becomes plain pixels, as its parts keep
// their colours. Says whether anything changed, and whether a posed Body became pixels.
export function recolourLayers(app, { label, layers, mapping, everywhere }) {
  const { project } = app.store.state;
  const rigs = everywhere ? recolourRigs(project, mapping) : [];
  const bodies = everywhere ? [] : layers.filter(isPosedBody);

  const changed = commitPose(app, { label, layers, rigs }, () => {
    layers.forEach((layer) => {
      layer.sprite = applyMapping(layer.sprite, mapping);
    });
    bodies.forEach((layer) => delete layer.pose);
    setRigs(project, rigs);

    if (everywhere) {
      redrawBodies(project, new Set(layers));
    }
  });

  if (changed && everywhere) {
    followColours(app, mapping);
  }

  return { changed, flattened: changed && bodies.length > 0 };
}

// a guide that marks the top of a colour follows that colour to its new one, in the same step
function followColours(app, mapping) {
  const { project } = app.store.state;
  const before = structuredClone(project.guides ?? []);
  const after = before.map((guide) =>
    guide.colour !== null && mapping[guide.colour] !== undefined
      ? { ...guide, colour: mapping[guide.colour] }
      : guide,
  );

  if (after.some((guide, i) => guide.colour !== before[i].colour)) {
    project.guides = after;
    app.history.alsoSetting('guides', before, structuredClone(after));
    // the panels were drawn as the art changed, before the guides did
    app.saver.markStructure?.();
    app.store.touch('guides');
  }
}
