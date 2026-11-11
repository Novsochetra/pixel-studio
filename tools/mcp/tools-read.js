import { writeFileSync } from 'node:fs';
import { PATH, WHERE, picture, schema, text } from './answers.js';
import { locate } from './locate.js';
import { encodePng } from './png.js';
import { readProject } from './project-files.js';
import { asText, enlarged } from './text-grid.js';
import { compositeFrame } from '../../src/model/composite.js';
import { allLayers, directionLabel } from '../../src/model/project.js';
import { colorCounts, toHex } from '../../src/model/sprite.js';

const layerSaid = (layer) =>
  `${layer.name}${layer.kind === 'art' ? '' : ` (${layer.kind})`}${layer.visible ? '' : ' (hidden)'}`;

function animationSaid(animation) {
  const views = Object.entries(animation.directions).map(([direction, { frames }]) => {
    const layers = frames[0].layers.map(layerSaid).join(', ');

    return `    ${directionLabel(direction)} (${direction}): ${frames.length} frames; layers bottom to top: ${layers}`;
  });

  return [`  ${animation.name}, ${animation.fps} fps`, ...views].join('\n');
}

function coloursSaid(project) {
  const counts = new Map();

  for (const { layer } of allLayers(project)) {
    for (const { color, count } of layer.sprite ? colorCounts(layer.sprite) : []) {
      counts.set(color, (counts.get(color) ?? 0) + count);
    }
  }

  const most = [...counts].sort((first, second) => second[1] - first[1]).slice(0, 32);

  return most.map(([color, count]) => `${toHex(color)} ×${count}`).join(', ') || 'none yet';
}

function describe({ path }) {
  const project = readProject(path);
  const { width, height } = project.canvas;

  return [
    text(
      [
        `${project.name}: ${project.kind}, canvas ${width}×${height}`,
        'Animations:',
        ...project.animations.map(animationSaid),
        `Colours, most used first: ${coloursSaid(project)}`,
      ].join('\n'),
    ),
  ];
}

// one layer when a layer is named, else the frame as it shows: its visible layers together
function spriteAt(project, where) {
  const { frame, layer } = locate(project, where);
  const { width, height } = project.canvas;

  return where.layer ? layer.sprite : compositeFrame(frame, width, height);
}

function gridSaid(sprite) {
  const { palette, rows } = asText(sprite);
  const legend = Object.entries(palette).map(([mark, hex]) => `${mark}=${hex}`);

  return text(`palette: ${legend.join(' ') || '(no colours)'}  .=clear\n${rows.join('\n')}`);
}

function readFrame({ path, as = 'both', out, ...where }) {
  const sprite = spriteAt(readProject(path), where);

  if (out) {
    writeFileSync(out, encodePng(sprite));
  }

  return [
    text(`${sprite.width}×${sprite.height} pixels${out ? `, saved to ${out}` : ''}`),
    as === 'text' ? null : picture(encodePng(enlarged(sprite))),
    as === 'image' ? null : gridSaid(sprite),
  ].filter(Boolean);
}

export const READ_TOOLS = [
  {
    name: 'describe_project',
    description:
      'What a Pixel Clean Studio project file holds: its kind and canvas, each animation with its views, frame counts and layers, and its colours. Call this first.',
    inputSchema: schema({ path: PATH }),
    run: describe,
  },
  {
    name: 'read_frame',
    description:
      'One frame of a project as a picture (enlarged, to look at) and as a grid of letters with their colours (exact, to edit from). Names a layer to read that layer alone; else the frame as it shows.',
    inputSchema: schema({
      path: PATH,
      ...WHERE,
      as: { type: 'string', enum: ['both', 'image', 'text'], description: 'Default: both.' },
      out: { type: 'string', description: 'Also save the frame, at its own size, as this PNG.' },
    }),
    run: readFrame,
  },
];
