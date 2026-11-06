// Small numeric helpers that behave exactly like the numpy calls pixel_clean.py makes, so the
// page and the command line rebuild a sprite pixel for pixel the same.

export function pymod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

// Python's round(): halves go to the even neighbour
export function roundHalfEven(value) {
  const floor = Math.floor(value);
  const diff = value - floor;

  if (diff > 0.5) {
    return floor + 1;
  }

  if (diff < 0.5) {
    return floor;
  }

  return floor % 2 === 0 ? floor : floor + 1;
}

// numpy fills arange as start + i * (second - first), not start + i * step
export function arange(start, stop, step) {
  const length = Math.max(0, Math.ceil((stop - start) / step));
  const delta = start + step - start;
  const out = new Float64Array(length);

  for (let i = 0; i < length; i++) {
    out[i] = start + i * delta;
  }

  return out;
}

export function argmax(values) {
  let best = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) {
      best = i;
    }
  }

  return best;
}

export function argmin(values) {
  let best = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[best]) {
      best = i;
    }
  }

  return best;
}

export function median(values) {
  const sorted = Float64Array.from(values).sort();
  const mid = sorted.length >> 1;

  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function medianColor(pixels) {
  const channels = [[], [], []];

  for (const pixel of pixels) {
    channels[0].push(pixel[0]);
    channels[1].push(pixel[1]);
    channels[2].push(pixel[2]);
  }

  return channels.map(median);
}

// numpy's default "linear" percentile
export function percentile(values, percent) {
  const sorted = Float64Array.from(values).sort();
  const index = (percent / 100) * (sorted.length - 1);
  const lo = Math.floor(index);
  const hi = Math.min(lo + 1, sorted.length - 1);
  const fraction = index - lo;

  return fraction >= 0.5
    ? sorted[hi] - (sorted[hi] - sorted[lo]) * (1 - fraction)
    : sorted[lo] + (sorted[hi] - sorted[lo]) * fraction;
}

export function sum(values) {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}

export function interp(points, knownIndex, knownValue) {
  return points.map((point) => {
    if (point <= knownIndex[0]) {
      return knownValue[0];
    }

    const last = knownIndex.length - 1;

    if (point >= knownIndex[last]) {
      return knownValue[last];
    }

    let index = 0;

    while (knownIndex[index + 1] <= point) {
      index++;
    }

    const slope =
      (knownValue[index + 1] - knownValue[index]) / (knownIndex[index + 1] - knownIndex[index]);

    return slope * (point - knownIndex[index]) + knownValue[index];
  });
}
