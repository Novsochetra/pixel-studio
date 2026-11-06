import { pymod } from './numeric.js';

// colour change between neighbouring columns (axis 1) or rows (axis 0), summed across the image;
// changes between two background pixels are ignored, or a checkerboard would win
export function edgeProfile(image, axis, ignore = null) {
  const { width, height, rgb } = image;
  const length = axis === 1 ? width - 1 : height - 1;
  const prof = new Float64Array(length);
  const step = axis === 1 ? 1 : width;

  for (let y = 0; y < (axis === 1 ? height : height - 1); y++) {
    for (let x = 0; x < (axis === 1 ? width - 1 : width); x++) {
      const at = y * width + x;
      const next = at + step;

      if (ignore && ignore[at] && ignore[next]) {
        continue;
      }

      const change =
        Math.abs(rgb[next * 3] - rgb[at * 3]) +
        Math.abs(rgb[next * 3 + 1] - rgb[at * 3 + 1]) +
        Math.abs(rgb[next * 3 + 2] - rgb[at * 3 + 2]);
      prof[axis === 1 ? x : y] += change;
    }
  }

  let total = 0;

  for (const value of prof) {
    total += value;
  }

  const mean = total / length + 1e-9;

  return prof.map((value) => value / mean);
}

// negative 2nd derivative: keeps sharp edges, drops slow trends like the silhouette
export function peaks(prof) {
  const kernel = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
  const smooth = new Float64Array(prof.length);

  for (let i = 0; i < prof.length; i++) {
    let total = 0;

    for (let pass = 0; pass < 5; pass++) {
      const j = i + 2 - pass;

      if (j >= 0 && j < prof.length) {
        total += prof[j] * kernel[pass];
      }
    }

    smooth[i] = total;
  }

  const lap = new Float64Array(prof.length);

  for (let i = 1; i < prof.length - 1; i++) {
    lap[i] = Math.max(0, 2 * smooth[i] - smooth[i - 1] - smooth[i + 1]);
  }

  return lap;
}

// for each candidate spacing: how strongly the edges share one phase on a grid of it (0..1)
export function coherence(prof, candidates, cachedPeaks = peaks(prof)) {
  const peakList = cachedPeaks;
  let total = 0;

  for (const value of peakList) {
    total += value;
  }

  const nonzero = [];

  for (let x = 0; x < peakList.length; x++) {
    if (peakList[x] !== 0) {
      nonzero.push(x);
    }
  }

  return Float64Array.from(candidates, (candidate) => {
    let re = 0;
    let im = 0;

    for (const x of nonzero) {
      const angle = (2 * Math.PI * x) / candidate;
      re += Math.cos(angle) * peakList[x];
      im += Math.sin(angle) * peakList[x];
    }

    return Math.hypot(re, im) / (total + 1e-9);
  });
}

export function findOffset(prof, size) {
  const peakList = peaks(prof);
  let re = 0;
  let im = 0;

  for (let x = 0; x < peakList.length; x++) {
    const angle = (2 * Math.PI * x) / size;
    re += Math.cos(angle) * peakList[x];
    im += Math.sin(angle) * peakList[x];
  }

  const angle = Math.atan2(im, re);

  // diff index k is the boundary between px k and k+1, so the cell starts half a px later
  return pymod((angle / (2 * Math.PI)) * size + 0.5, size);
}
