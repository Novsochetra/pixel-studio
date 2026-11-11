import { existsSync } from 'node:fs';
import { PATH, WHERE, schema, text } from './answers.js';
import { locate } from './locate.js';
import { readProject, writeProject } from './project-files.js';
import { paintPixels, paintRows } from './text-grid.js';
import { startAnimation } from '../../src/model/animations.js';
import { addFrame, frameCount } from '../../src/model/frames.js';
import { KINDS } from '../../src/model/kinds.js';
import { newProject } from '../../src/model/new-project.js';
import { addLayer } from '../../src/model/structure.js';

// a change is read, made and written back: the file is the project
function changed(path, change) {
  const project = readProject(path);
  const said = change(project);

  writeProject(path, project);

  return [text(said)];
}

function create({ path, overwrite = false, kind = 'character', ...options }) {
  if (existsSync(path) && !overwrite) {
    throw new Error(`${path} is there already. Pass overwrite: true to start it again.`);
  }

  const project = newProject({ kind, ...options });
  const { width, height } = project.canvas;

  writeProject(path, project);

  return [text(`Made ${project.name}: ${project.kind}, ${width}×${height}, at ${path}`)];
}

function setPixels({ path, pixels, rows, palette, at, ...where }) {
  return changed(path, (project) => {
    const { layer } = locate(project, where);
    const count =
      (pixels ? paintPixels(layer.sprite, pixels) : 0) +
      (rows ? paintRows(layer.sprite, { rows, palette, at }) : 0);

    return `${count} pixels changed on ${layer.name}`;
  });
}

function addFrameAfter({ path, copy = false, ...where }) {
  return changed(path, (project) => {
    const { animation, index } = locate(project, where);
    const after = where.frame ? index : frameCount(animation) - 1;
    const made = addFrame(project, animation, after, copy);
    const what = copy ? `a copy of frame ${after + 1}` : 'empty';

    return `${animation.name} has a new frame ${made + 1} in every view, ${what}`;
  });
}

function addLayerAbove({ path, name, ...where }) {
  return changed(path, (project) => {
    const { frame } = locate(project, where);

    addLayer(project, frame, { name });

    return `${name} is the top layer of that frame: ${frame.layers.map((each) => each.name).join(', ')}`;
  });
}

function addAnimation({ path, name, frames = 1, fps = 8 }) {
  return changed(path, (project) => {
    const made = startAnimation(project, project.animations[0], { name, frames, fps });

    return `Made ${made.name}: ${frames} empty frames in each view, ${fps} fps`;
  });
}

const PIXELS = {
  type: 'array',
  description: 'Single pixels: x and y from the top left, color as #rrggbb, or null to clear.',
  items: {
    type: 'object',
    properties: {
      x: { type: 'integer' },
      y: { type: 'integer' },
      color: { type: ['string', 'null'] },
    },
    required: ['x', 'y', 'color'],
  },
};
const ROWS = {
  rows: {
    type: 'array',
    items: { type: 'string' },
    description:
      'Rows of letters as read_frame gives them: one letter a pixel, "." clear, a space keeps what is there.',
  },
  palette: {
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'The colour of each letter in rows: { "a": "#rrggbb" }.',
  },
  at: {
    type: 'object',
    properties: { x: { type: 'integer' }, y: { type: 'integer' } },
    required: ['x', 'y'],
    description: 'Where the first letter of rows goes. Default: the top left corner.',
  },
};

export const EDIT_TOOLS = [
  {
    name: 'new_project',
    description:
      'Start a project file the studio can open ("Open a project file…"): a character, an object, tiles, an effect or an icon, with one empty frame.',
    inputSchema: schema({
      path: PATH,
      name: { type: 'string' },
      kind: { type: 'string', enum: Object.keys(KINDS), description: 'Default: character.' },
      width: { type: 'integer', minimum: 1, maximum: 512 },
      height: { type: 'integer', minimum: 1, maximum: 512 },
      overwrite: { type: 'boolean' },
    }),
    run: create,
  },
  {
    name: 'set_pixels',
    description:
      'Draw on one layer of one frame: single pixels, rows of letters with a palette, or both. Read the frame first, and read it again after to see the result.',
    inputSchema: schema({ path: PATH, ...WHERE, pixels: PIXELS, ...ROWS }),
    run: setPixels,
  },
  {
    name: 'add_frame',
    description:
      'A new frame in every view of an animation, after the frame named (default: at the end): empty, or a copy of that frame to change.',
    inputSchema: schema({ path: PATH, ...WHERE, copy: { type: 'boolean' } }),
    run: addFrameAfter,
  },
  {
    name: 'add_layer',
    description: 'A new empty layer of art on top of one frame, to draw a part on its own.',
    inputSchema: schema({ path: PATH, ...WHERE, name: { type: 'string' } }, ['path', 'name']),
    run: addLayerAbove,
  },
  {
    name: 'add_animation',
    description: 'A new animation with the project’s views, its frames empty.',
    inputSchema: schema(
      {
        path: PATH,
        name: { type: 'string' },
        frames: { type: 'integer', minimum: 1, maximum: 64 },
        fps: { type: 'integer', minimum: 1, maximum: 30 },
      },
      ['path', 'name'],
    ),
    run: addAnimation,
  },
];
