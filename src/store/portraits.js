import { portraitFrame, portraitOf } from '../model/cast.js';
import { normalizeProject } from '../model/normalize.js';
import { dataUrlSprite, spriteDataUrl } from '../io/images.js';
import { keysFor } from './keys.js';

// Each picture is a document of its own, not part of the projects list, so the list stays small
// and pictures are read only when they are shown.

export function portraitUrl(project) {
  const sprite = portraitOf(project);

  return sprite ? spriteDataUrl(sprite) : null;
}

export async function savePortrait(backend, keys, project, last) {
  const url = portraitUrl(project);

  if (url !== last) {
    await backend.write(keys.portrait, { png: url });
  }

  return url;
}

// Projects saved before pictures were kept have none. Reading the one frame the picture shows,
// not the whole project, keeps a long list quick to open.
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

export async function readPortrait(backend, prefix) {
  const keys = keysFor(prefix);

  try {
    const stored = await backend.read(keys.portrait);

    return stored ? stored.png : await portraitFromProject(backend, keys);
  } catch {
    return null;
  }
}
