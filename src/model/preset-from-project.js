import { newId } from './project.js';

// What a project starts others with: its kind, views, canvas, parts, animation names, game
// settings and guides, but none of its pixels.
export function presetFromProject(project, label = project.name) {
  const first = project.animations[0];

  return {
    id: newId('preset'),
    label,
    kind: project.kind,
    directionSet: project.directionSet,
    startWith: Object.keys(first.directions),
    canvas: { ...project.canvas },
    parts: project.parts.map((part) => part.name),
    names: project.animations.map((animation) => animation.name),
    game: structuredClone(project.game ?? {}),
    guides: structuredClone(project.guides ?? []),
  };
}
