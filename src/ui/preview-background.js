import { changeStructure } from './actions.js';
import { profileOf } from '../model/profiles.js';
import { backgroundDataUrl, imageFrom } from '../io/background.js';

let pitch = null;

// the open project's own background as a data URL, to travel with a copy of it
export async function backgroundUrl(app) {
  if (!app.store.state.project.preview?.background) {
    return null;
  }

  const doc = await app.backend.read(app.keys.background).catch(() => null);

  return doc?.url ?? null;
}

// the picture behind the character: the project's own, else the Naga Eleven pitch, else none
export async function backgroundOf(app) {
  const { project } = app.store.state;

  if (project.preview?.background) {
    app.backgroundImage ??= await app.backend
      .read(app.keys.background)
      .then((doc) => (doc?.url ? imageFrom(doc.url) : null))
      .catch(() => null);

    if (app.backgroundImage) {
      return app.backgroundImage;
    }
  }

  if (profileOf(project).preview === 'pitch' && globalThis.SAMPLE?.pitch) {
    pitch ??= await imageFrom(globalThis.SAMPLE.pitch).catch(() => null);

    return pitch;
  }

  return null;
}

export async function setBackground(app, file) {
  const url = await backgroundDataUrl(file);
  await app.backend.write(app.keys.background, { url });
  app.backgroundImage = await imageFrom(url);
  app.store.state.project.preview = { ...app.store.state.project.preview, background: true };
  changeStructure(app, 'background');
}

export function removeBackground(app) {
  app.store.state.project.preview = { ...app.store.state.project.preview, background: false };
  app.backgroundImage = null;
  app.backend.remove(app.keys.background).catch(() => null);
  changeStructure(app, 'background');
}

// the bundled Naga Eleven screenshot, once loaded: its ground line is known
export const isPitch = (image) => Boolean(image) && image === pitch;
