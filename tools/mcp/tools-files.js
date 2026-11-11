import { readFileSync, writeFileSync } from 'node:fs';
import { PATH, WHERE, picture, schema, text } from './answers.js';
import { locate } from './locate.js';
import { decodePng, encodePng } from './png.js';
import { readProject, writeProject } from './project-files.js';
import { enlarged } from './text-grid.js';
import { cleanAlone } from '../../src/clean/like.js';
import { toRgba } from '../../src/clean/scale.js';
import { buildSheet } from '../../src/export/sheet.js';
import { KINDS } from '../../src/model/kinds.js';

// An AI's "pixel art" is a large picture of blurred squares. The cleaner finds its grid and
// makes each square one true pixel, standing in the canvas where the project's kind stands.
function clean({ image, path, ...where }) {
  const project = readProject(path);
  const { layer } = locate(project, where);
  const { place, ground } = KINDS[project.kind] ?? {};
  const { width, height } = project.canvas;
  const cleaned = cleanAlone(decodePng(readFileSync(image)), { width, height }, { place, ground });

  layer.sprite = { width, height, pixels: new Uint8ClampedArray(toRgba(cleaned)) };
  writeProject(path, project);

  const [across, down] = cleaned.report.size;

  return [
    text(
      `Cleaned onto ${layer.name}: art ${across}×${down} on the ${width}×${height} canvas, one pixel for each ${cleaned.report.cell.join('×')} of the picture’s`,
    ),
    picture(encodePng(enlarged(layer.sprite))),
  ];
}

// each frame in a cell the size of the canvas, a row for each view: what a game loads
function exportSheet({ path, out, ...where }) {
  const project = readProject(path);
  const { animation } = locate(project, where);
  const { width, height } = project.canvas;
  const { sheet, frames, rows, warnings } = buildSheet(project, animation, {
    frameWidth: width,
    frameHeight: height,
    anchorX: 0,
    anchorY: 0,
    artAnchor: { x: 0, y: 0 },
    includeMirrored: false,
  });

  writeFileSync(out, encodePng(sheet));

  return [
    text(
      [
        `${animation.name}: ${frames} frames across, ${rows.length} rows (${rows.map((row) => row.direction).join(', ')}), each ${width}×${height}, ${animation.fps} fps, saved to ${out}`,
        ...warnings,
      ].join('\n'),
    ),
  ];
}

export const FILE_TOOLS = [
  {
    name: 'clean_image',
    description:
      'Turn an AI-made "pixel art" picture (a PNG file) into true pixel art on a layer of a project’s frame: its blurred squares become single pixels, sized and placed for the project’s canvas. It replaces what the layer holds.',
    inputSchema: schema(
      { image: { type: 'string', description: 'Path of the PNG to clean.' }, path: PATH, ...WHERE },
      ['image', 'path'],
    ),
    run: clean,
  },
  {
    name: 'export_sheet',
    description:
      'Save one animation as a sprite sheet PNG: its frames left to right, a row for each view, every cell the size of the canvas.',
    inputSchema: schema(
      {
        path: PATH,
        animation: WHERE.animation,
        out: { type: 'string', description: 'The PNG to write.' },
      },
      ['path', 'out'],
    ),
    run: exportSheet,
  },
];
