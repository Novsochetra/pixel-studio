import { portraitFrame, portraitOf } from '../model/cast.js';
import { normalizeProject } from '../model/normalize.js';
import { dataUrlSprite, spriteDataUrl } from '../io/images.js';
import { keysFor } from './keys.js';

// Each project's picture, for the projects list and the line-up, is a small document of its own:
// the list itself stays small, and pictures are only read when they are shown.

export function portraitUrl(project) {
  const sprite = portraitOf(project);

  return sprite ? spriteDataUrl(sprite) : null;
}

// the project's picture, written when it differs from `last`, the one written before; gives back
// the one now stored
export async function savePortrait(backend, keys, project, last) {
  const url = portraitUrl(project);

  if (url !== last) {
    await backend.write(keys.portrait, { png: url });
  }

  return url;
}

// A project saved before pictures were kept: made from its saved structure and only the layers of
// the one frame it shows, then kept for next time.
async function portraitFromProject(backend, keys) {
  const stored = await backend.read(keys.project);

  if (!stored?.json) {
    return null;
  }

  const project = normalizeProject(JSON.parse(stored.json));

  for (const layer of portraitFrame(project)?.layers ?? []) {
    const doc = await backend.read(keys.layer(layer.id));

    layer.sprite = doc?.png ? await dataUrlSprite(doc.png) : null;
  }

  const url = portraitUrl(project);
  await backend.write(keys.portrait, { png: url });

  return url;
}

// the picture of the project kept under `prefix`, or null when it has none or cannot be read
export async function readPortrait(backend, prefix) {
  const keys = keysFor(prefix);

  try {
    const stored = await backend.read(keys.portrait);

    return stored ? stored.png : await portraitFromProject(backend, keys);
  } catch {
    return null;
  }
}
