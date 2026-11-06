import { arange, argmax, interp, percentile, pymod, roundHalfEven } from './numeric.js';
import { peaks } from './profile.js';

export function cellStarts(offset, size, length) {
  const start = pymod(offset + size / 2, size) - size / 2;

  return Array.from(arange(start, length, size)).filter(
    (value) => value + size / 2 >= 0 && value + size / 2 < length,
  );
}

function strongEdge(peakList) {
  const positive = peakList.filter((value) => value > 0);

  return positive.length ? 0.15 * percentile(positive, 95) : Infinity;
}

function edgeShift(peakList, start, size, strong) {
  const lo = Math.max(Math.ceil(start - 0.5 - 0.45 * size), 0);
  const hi = Math.min(Math.trunc(start - 0.5 + 0.45 * size) + 1, peakList.length);

  if (hi <= lo) {
    return NaN;
  }

  const window = peakList.subarray(lo, hi);
  const best = argmax(window);

  return window[best] >= strong ? lo + best + 0.5 - start : NaN;
}

// Move each grid line onto the real edge next to it. An AI image upscaled by a fraction has
// cells of uneven width (8 and 9 px for 8.4), so an even grid drifts up to half a cell off and
// samples the neighbouring pixel: outlines double and the sprite grows a row.
export function snapLines(starts, prof, size) {
  const peakList = peaks(prof);
  const strong = strongEdge(peakList);
  const shifts = starts.map((start) => edgeShift(peakList, start, size, strong));
  const knownIndex = [];
  const knownValue = [];

  shifts.forEach((shift, index) => {
    if (!Number.isNaN(shift)) {
      knownIndex.push(index);
      knownValue.push(shift);
    }
  });

  if (!knownIndex.length) {
    return starts.slice();
  }

  // lines with no edge (flat colour) follow the drift of the lines around them
  const filled = interp(
    starts.map((_, index) => index),
    knownIndex,
    knownValue,
  );
  const lines = starts.map((start, index) => start + filled[index]);

  for (let index = 1; index < lines.length; index++) {
    lines[index] = Math.max(lines[index], lines[index - 1] + 0.5 * size);
  }

  return lines;
}

// pixel ranges [a, b) covering the part lo..hi of each cell
export function spans(lines, size, length, lo, hi) {
  return lines.map((start, index) => {
    const end = index + 1 < lines.length ? lines[index + 1] : start + size;
    const first = Math.max(roundHalfEven(start + (end - start) * lo), 0);
    const second = Math.min(Math.max(roundHalfEven(start + (end - start) * hi), first + 1), length);

    return [first, second];
  });
}
