import { arange, argmax } from './numeric.js';
import { coherence, edgeProfile, findOffset, peaks } from './profile.js';
import { gridError } from './grid-error.js';

// For already-clean art: the largest whole cell size where (nearly) every colour change falls on
// one grid line phase, plus that phase. Null for blurry images.
export function exactCell(image, maxCell = 64, purity = 0.995) {
  const profs = [edgeProfile(image, 1), edgeProfile(image, 0)];

  for (let size = maxCell; size > 1; size--) {
    const offsets = [];

    for (const prof of profs) {
      const phase = new Float64Array(size);
      prof.forEach((value, i) => {
        phase[(i + 1) % size] += value;
      });
      const total = phase.reduce((a, b) => a + b, 0);

      if (Math.max(...phase) < purity * total) {
        break;
      }

      offsets.push(argmax(phase));
    }

    if (offsets.length === profs.length) {
      return { size, offsets };
    }
  }

  return null;
}

function climb(cands, score, start) {
  let i = start;
  let moved = true;

  // s/2 and s/3 also line up; climb to the largest size that still does (a true 2s cancels out)
  while (moved) {
    moved = false;

    for (const k of [2, 3]) {
      const win = [];
      cands.forEach((c, j) => {
        if (Math.abs(c - k * cands[i]) <= 0.02 * k * cands[i]) {
          win.push(j);
        }
      });
      const best = win.length ? win[argmax(win.map((j) => score[j]))] : -1;

      if (best >= 0 && score[best] >= 0.6 * score[i]) {
        i = best;
        moved = true;
        break;
      }
    }
  }

  return i;
}

function totalScore(profs, peakList, cands) {
  const scores = profs.map((prof, k) => coherence(prof, cands, peakList[k]));

  return cands.map((_, i) => scores[0][i] + scores[1][i]);
}

export function detectCell(profs, lo = 2.0, hi = 40.0) {
  const peakList = profs.map(peaks);
  const cands = arange(lo, hi, 0.01);
  const score = totalScore(profs, peakList, cands);
  const i = climb(cands, score, argmax(score));
  // a 0.01 px error drifts ~2 px across 160 cells, enough to sample the wrong pixel
  const fine = arange(cands[i] - 0.03, cands[i] + 0.03, 0.0005);

  return fine[argmax(totalScore(profs, peakList, fine))];
}

function axisCandidates(prof, size) {
  const cands = arange(0.6 * size, 1.1 * size, 0.01);
  const score = coherence(prof, cands);
  const top = Math.max(...score);
  const picked = [];

  for (let i = 1; i < score.length - 1; i++) {
    if (score[i] >= score[i - 1] && score[i] >= score[i + 1] && score[i] > 0.5 * top) {
      if (Math.abs(cands[i] - size) > 0.1 * size) {
        picked.push(cands[i]);
      }
    }
  }

  return picked;
}

// An AI image's pixels need not be square: ChatGPT's back views came out with 9-10 px rows and
// 7-8 px columns, and its columns wander. Each axis tries the sizes its edges suggest and keeps the
// one whose rebuild is closest to the image; among near-ties (2%) the best lined-up wins, and the
// shared size stays unless the winner is clearly (7%) better, since resampling a small difference
// away would double the outline.
function axisCells(image, isBg, profs, size) {
  const sizes = [size, size];
  const base = gridError(image, isBg, profs, size, size);

  for (const axis of [0, 1]) {
    const tried = axisCandidates(profs[axis], size).map((cand) => {
      const trial = axis === 0 ? [cand, size] : [size, cand];

      return [gridError(image, isBg, profs, ...trial), cand];
    });
    const lowest = Math.min(...tried.map(([err]) => err));

    if (!tried.length || lowest >= 0.93 * base) {
      continue;
    }

    const near = tried.filter(([err]) => err <= 1.02 * lowest).map(([, cand]) => cand);
    sizes[axis] = near[argmax(coherence(profs[axis], near))];
  }

  return sizes;
}

function parseCell(text) {
  const [sx, sy] = String(text).toLowerCase().split('x');

  return [Number(sx), Number(sy || sx)];
}

export function findGrid(image, isBg, options, cutOut = false) {
  const forced = options.cell || options.native;
  let exact = forced ? null : exactCell(image);

  // a cut-out sprite with no bigger grid is already one pixel per art pixel (a native PNG)
  if (cutOut && !exact && !forced) {
    exact = { size: 1, offsets: [0, 0] };
  }

  if (exact) {
    return { sx: exact.size, sy: exact.size, ox: exact.offsets[0], oy: exact.offsets[1], exact: true };
  }

  const profs = [edgeProfile(image, 1, isBg), edgeProfile(image, 0, isBg)];
  let sizes;

  if (options.native) {
    sizes = [image.width / options.native, image.width / options.native];
  } else if (options.cell) {
    sizes = parseCell(options.cell);
  } else {
    const shared = detectCell(profs, 2.0, Math.max(40.0, Math.min(image.width, image.height) / 8));
    sizes = axisCells(image, isBg, profs, shared);
  }

  const [sx, sy] = sizes;

  return { sx, sy, ox: findOffset(profs[0], sx), oy: findOffset(profs[1], sy), exact: false, profs };
}
