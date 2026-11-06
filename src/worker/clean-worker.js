import { analyzeReference, cleanAlone, cleanLike } from '../clean/like.js';
import { toRgba } from '../clean/scale.js';

// Runs the cleaner off the main thread: { id, image, reference, options } -> { id, result }.
self.onmessage = (event) => {
  const { id, image, reference, options } = event.data;

  try {
    const empty = !reference.data.some((value, i) => i % 4 === 3 && value > 0);
    const cleaned =
      empty || options.alone
        ? cleanAlone(image, { width: reference.width, height: reference.height }, options)
        : cleanLike(image, analyzeReference(reference), options);
    const pixels = toRgba(cleaned);
    self.postMessage(
      {
        id,
        result: { width: cleaned.width, height: cleaned.height, pixels, report: cleaned.report },
      },
      [pixels.buffer],
    );
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
