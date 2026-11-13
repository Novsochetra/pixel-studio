import { readFileSync, writeFileSync } from 'node:fs';
import { WHERE, picture, projectSchema, text } from './answers.js';
import { locate } from './locate.js';
import { decodePng, encodePng } from './png.js';
import { enlarged } from './text-grid.js';
import { cleanAlone } from '../../src/clean/like.js';
import { toRgba } from '../../src/clean/scale.js';
import { buildSheet } from '../../src/export/sheet.js';
import { KINDS } from '../../src/model/kinds.js';

// An AI's "pixel art" is a large picture of blurred squares. The cleaner finds its grid and
// makes each square one true pixel, standing in the canvas where the project's kind stands.
async function clean(shelf, { image, ...where }) {
  const project = await shelf.read(where);
  const { layer } = locate(project, where);
  const { place, ground } = KINDS[project.kind] ?? {};
  const { width, height } = project.canvas;
  const cleaned = cleanAlone(decodePng(readFileSync(image)), { width, height }, { place, ground });

  layer.sprite = { width, height, pixels: new Uint8ClampedArray(toRgba(cleaned)) };
  await shelf.write(where, project);

  const [across, down] = cleaned.report.size;

  return [
    text(
      `Cleaned onto ${layer.name}: art ${across}×${down} on the ${width}×${height} canvas, one pixel for each ${cleaned.report.cell.join('×')} of the picture’s`,
    ),
    picture(encodePng(enlarged(layer.sprite))),
  ];
}

// each frame in a cell the size of the canvas, a row for each view: what a game loads
function sheetOf(project, where) {
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
  const said = `${animation.name}: ${frames} frames across, ${rows.length} rows (${rows.map((row) => row.direction).join(', ')}), each ${width}×${height}, ${animation.fps} fps`;

  return { png: encodePng(sheet), said, warnings };
}

async function exportSheet(shelf, { out, ...where }) {
  const { png, said, warnings } = sheetOf(await shelf.read(where), where);

  if (out) {
    writeFileSync(out, png);
  }

  return [
    text([out ? `${said}, saved to ${out}` : said, ...warnings].join('\n')),
    ...(out ? [] : [picture(png)]),
  ];
}

const OUT = { out: { type: 'string', description: 'The PNG to write.' } };

export const sheetTool = (shelf) => ({
  name: 'export_sheet',
  description: `${shelf.savesFiles ? 'Save' : 'Make'} one animation as a sprite sheet PNG: its frames left to right, a row for each view, every cell the size of the canvas.`,
  inputSchema: projectSchema(
    shelf,
    { animation: WHERE.animation, ...(shelf.savesFiles ? OUT : {}) },
    shelf.savesFiles ? ['out'] : [],
  ),
  run: (args) => exportSheet(shelf, args),
});

// the picture is a file on the caller's machine: a shelf of files only
export const cleanTool = (shelf) => ({
  name: 'clean_image',
  description:
    'Turn an AI-made "pixel art" picture (a PNG file) into true pixel art on a layer of a project’s frame: its blurred squares become single pixels, sized and placed for the project’s canvas. It replaces what the layer holds.',
  inputSchema: projectSchema(
    shelf,
    { image: { type: 'string', description: 'Path of the PNG to clean.' }, ...WHERE },
    ['image'],
  ),
  run: (args) => clean(shelf, args),
});
