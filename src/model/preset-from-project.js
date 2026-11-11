import { newId } from './project.js';

// What a project starts others with: its kind, views, canvas, parts and their colours, animation
// names and speed, game settings, guides, palettes and export settings, but none of its pixels.
export function presetFromProject(project, label = project.name) {
  const first = project.animations[0];

  return {
    id: newId('preset'),
    label,
    kind: project.kind,
    directionSet: project.directionSet,
    startWith: Object.keys(first.directions),
    referenceDirection: project.referenceDirection,
    canvas: { ...project.canvas },
    parts: project.parts.map((part) => ({ name: part.name, colours: [...part.colours] })),
    names: project.animations.map((animation) => animation.name),
    fps: first.fps,
    game: structuredClone(project.game ?? {}),
    guides: structuredClone(project.guides ?? []),
    palettes: structuredClone(project.palettes ?? []),
    exportSettings: structuredClone(project.exportSettings ?? null),
  };
}
