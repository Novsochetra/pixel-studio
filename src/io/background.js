import { decodeImage } from './images.js';

// A stored document holds at most 256 KiB; a big screenshot is shrunk to a preview size and,
// if a PNG of it is still too big, kept as a JPEG.
const MAX_WIDTH = 960;
const MAX_HEIGHT = 540;
const MAX_CHARS = 240000;

export async function backgroundDataUrl(file) {
  const image = await decodeImage(file);
  const scale = Math.min(1, MAX_WIDTH / image.width, MAX_HEIGHT / image.height);
  const source = document.createElement('canvas');
  source.width = image.width;
  source.height = image.height;
  source.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = scale < 1;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const png = canvas.toDataURL('image/png');

  return png.length <= MAX_CHARS ? png : canvas.toDataURL('image/jpeg', 0.85);
}

export function imageFrom(url) {
  const image = new Image();
  image.src = url;

  return image.decode().then(() => image);
}
