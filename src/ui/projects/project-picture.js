import { node } from '../dom.js';

export const projectPicture = (url) =>
  url ? node('img.project-picture', { src: url, alt: '' }) : node('span.project-picture');

export function laterPicture(reading) {
  const box = projectPicture(null);

  reading.then((url) => url && box.replaceWith(projectPicture(url)));

  return box;
}
