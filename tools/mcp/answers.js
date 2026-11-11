// what a tool hands back to the one that called it, as the protocol has it
export const text = (words) => ({ type: 'text', text: words });

export const picture = (png) => ({
  type: 'image',
  data: png.toString('base64'),
  mimeType: 'image/png',
});

// where in a project a tool acts: every one of these may be left out
export const WHERE = {
  animation: { type: 'string', description: 'Animation name. Default: the first.' },
  view: {
    type: 'string',
    description: 'View name or id, such as "Front" or "south". Default: the project’s first view.',
  },
  frame: { type: 'integer', minimum: 1, description: 'Frame number, from 1. Default: 1.' },
  layer: { type: 'string', description: 'Layer name. Default: the top layer of art.' },
};

export const PATH = {
  type: 'string',
  description: 'Path of the project file, as the studio’s "Save as file" writes it (.json).',
};

export const schema = (properties, required = ['path']) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
