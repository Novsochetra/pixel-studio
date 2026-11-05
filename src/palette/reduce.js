import { unpack } from '../model/sprite.js';

function widestChannel(box) {
  const ranges = [0, 1, 2].map((c) => {
    const values = box.map((entry) => unpack(entry.color)[c]);

    return Math.max(...values) - Math.min(...values);
  });

  return ranges.indexOf(Math.max(...ranges));
}

function split(box) {
  const channel = widestChannel(box);
  const sorted = [...box].sort((a, b) => unpack(a.color)[channel] - unpack(b.color)[channel]);
  const half = sorted.reduce((total, entry) => total + entry.count, 0) / 2;
  let running = 0;
  let cut = 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    running += sorted[i].count;

    if (running >= half) {
      cut = i + 1;
      break;
    }

    cut = i + 1;
  }

  return [sorted.slice(0, cut), sorted.slice(cut)];
}

// Median cut over the colours in use, keeping each group's most used colour, so the smaller
// palette is made of colours the character already has: [{ color, count }] -> [color].
export function reducePalette(entries, size) {
  const used = entries.filter((entry) => entry.count > 0);

  if (!used.length) {
    return [];
  }

  let boxes = [used];

  while (boxes.length < size) {
    const splittable = boxes.filter((box) => box.length > 1);

    if (!splittable.length) {
      break;
    }

    const biggest = splittable.reduce((a, b) => (a.reduce((t, e) => t + e.count, 0) >= b.reduce((t, e) => t + e.count, 0) ? a : b));
    boxes = boxes.filter((box) => box !== biggest).concat(split(biggest));
  }

  return boxes.map((box) => box.reduce((a, b) => (a.count >= b.count ? a : b)).color);
}
