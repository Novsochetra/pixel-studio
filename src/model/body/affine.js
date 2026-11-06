// An affine map of the canvas: x' = a·x + c·y + e, y' = b·x + d·y + f.

export const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export const translation = (x, y) => ({ ...IDENTITY, e: x, f: y });

// outer after inner: a point goes through `inner` first
export function compose(outer, inner) {
  return {
    a: outer.a * inner.a + outer.c * inner.b,
    b: outer.b * inner.a + outer.d * inner.b,
    c: outer.a * inner.c + outer.c * inner.d,
    d: outer.b * inner.c + outer.d * inner.d,
    e: outer.a * inner.e + outer.c * inner.f + outer.e,
    f: outer.b * inner.e + outer.d * inner.f + outer.f,
  };
}

// a quarter turn's sine and cosine are exactly 0 and ±1, so it moves whole pixels exactly
function sineAndCosine(degrees) {
  const turn = ((degrees % 360) + 360) % 360;
  const quarters = { 0: [0, 1], 90: [1, 0], 180: [0, -1], 270: [-1, 0] };

  if (quarters[turn]) {
    return quarters[turn];
  }

  const radians = (turn * Math.PI) / 180;

  return [Math.sin(radians), Math.cos(radians)];
}

// a turn by `degrees` about the point (x, y); the canvas's y grows downward, so a positive turn
// goes clockwise on screen
export function turnAbout({ x, y }, degrees) {
  const [sine, cosine] = sineAndCosine(degrees);

  return {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: x - cosine * x + sine * y,
    f: y - sine * x - cosine * y,
  };
}

export function applyTo(matrix, [x, y]) {
  return [matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f];
}

export function invert(matrix) {
  const { a, b, c, d, e, f } = matrix;
  const det = a * d - b * c;

  return {
    a: d / det,
    b: -b / det,
    c: -c / det,
    d: a / det,
    e: (c * f - d * e) / det,
    f: (b * e - a * f) / det,
  };
}

const whole = (value) => [-1, 0, 1].includes(value);

// no turn, or a turn by a whole number of quarters: pixels land on pixels
export const isQuarterTurn = (matrix) =>
  whole(matrix.a) && whole(matrix.b) && whole(matrix.c) && whole(matrix.d);
