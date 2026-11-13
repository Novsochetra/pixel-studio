import { WHERE, projectSchema, schema, text } from './answers.js';
import { locate } from './locate.js';
import { leftOut, paintPixels, paintRows } from './text-grid.js';
import { startAnimation } from '../../src/model/animations.js';
import { addFrame, frameCount } from '../../src/model/frames.js';
import { KINDS } from '../../src/model/kinds.js';
import { newProject } from '../../src/model/new-project.js';
import { addLayer } from '../../src/model/structure.js';
import { CANVAS_LIMITS } from '../../src/model/canvas-size.js';
import { freeName } from '../../src/model/free-name.js';

async function changed(shelf, args, change) {
  const project = await shelf.read(args);
  const said = change(project);

  await shelf.write(args, project);

  return [text(said)];
}

async function create(shelf, { kind = 'character', name, width, height, ...where }) {
  const project = newProject({ kind, name, width, height });
  const at = await shelf.make(where, project);

  return [
    text(
      `Made ${project.name}: ${project.kind}, ${project.canvas.width}×${project.canvas.height}, ${at}`,
    ),
  ];
}

function setPixels(shelf, { pixels, rows, palette, at, ...where }) {
  return changed(shelf, where, (project) => {
    const { layer } = locate(project, where);
    const count =
      (pixels ? paintPixels(layer.sprite, pixels) : 0) +
      (rows ? paintRows(layer.sprite, { rows, palette, at }) : 0);
    const off = leftOut(layer.sprite, { pixels, rows, at });
    const { width, height } = layer.sprite;

    return `${count} pixel${count === 1 ? '' : 's'} changed on ${layer.name}${off ? `; ${off} outside the ${width}×${height} canvas were left out` : ''}`;
  });
}

function addFrameAfter(shelf, { copy = false, ...where }) {
  return changed(shelf, where, (project) => {
    const { animation, index } = locate(project, where);
    const after = where.frame ? index : frameCount(animation) - 1;
    const made = addFrame(project, animation, after, copy);
    const what = copy ? `a copy of frame ${after + 1}` : 'empty';

    return `${animation.name} has a new frame ${made + 1} in every view, ${what}`;
  });
}

function addLayerAbove(shelf, { name, ...where }) {
  return changed(shelf, where, (project) => {
    const { frame } = locate(project, where);
    // a name the frame has already is numbered: two of one name, and a layer named was the first
    const free = freeName(
      name,
      frame.layers.map((each) => each.name),
    );

    addLayer(project, frame, { name: free });

    return `${free} is the top layer of that frame: ${frame.layers.map((each) => each.name).join(', ')}`;
  });
}

function addAnimation(shelf, { name, frames = 1, fps = 8, ...where }) {
  return changed(shelf, where, (project) => {
    const made = startAnimation(project, project.animations[0], { name, frames, fps });

    return `Made ${made.name}: ${frames} empty frames in each view, ${fps} fps`;
  });
}

// the sizes the studio opens a canvas at: 1 to 512 let through files it could not open
const SIDE = { minimum: CANVAS_LIMITS.min, maximum: CANVAS_LIMITS.max };

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

const run = (shelf, change) => (args) => change(shelf, args);

const newProjectTool = (shelf) => ({
  name: 'new_project',
  description: `Start a project ${shelf.madeWhere}: a character, an object, tiles, an effect or an icon, with one empty frame.`,
  inputSchema: schema(
    {
      ...shelf.makeArgs.properties,
      name: { type: 'string' },
      kind: { type: 'string', enum: Object.keys(KINDS), description: 'Default: character.' },
      width: { type: 'integer', ...SIDE },
      height: { type: 'integer', ...SIDE },
    },
    shelf.makeArgs.required,
  ),
  run: run(shelf, create),
});

export const editTools = (shelf) => [
  newProjectTool(shelf),
  {
    name: 'set_pixels',
    description:
      'Draw on one layer of one frame: single pixels, rows of letters with a palette, or both. Read the frame first, and read it again after to see the result.',
    inputSchema: projectSchema(shelf, { ...WHERE, pixels: PIXELS, ...ROWS }),
    run: run(shelf, setPixels),
  },
  {
    name: 'add_frame',
    description:
      'A new frame in every view of an animation, after the frame named (default: at the end): empty, or a copy of that frame to change.',
    inputSchema: projectSchema(shelf, { ...WHERE, copy: { type: 'boolean' } }),
    run: run(shelf, addFrameAfter),
  },
  {
    name: 'add_layer',
    description: 'A new empty layer of art on top of one frame, to draw a part on its own.',
    inputSchema: projectSchema(shelf, { ...WHERE, name: { type: 'string' } }, ['name']),
    run: run(shelf, addLayerAbove),
  },
  {
    name: 'add_animation',
    description: 'A new animation with the project’s views, its frames empty.',
    inputSchema: projectSchema(
      shelf,
      {
        name: { type: 'string' },
        frames: { type: 'integer', minimum: 1, maximum: 64 },
        fps: { type: 'integer', minimum: 1, maximum: 30 },
      },
      ['name'],
    ),
    run: run(shelf, addAnimation),
  },
];
