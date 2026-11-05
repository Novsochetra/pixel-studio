import { cloneSprite, getPixel, setPixel } from '../model/sprite.js';
import { linePoints, mirrored, paintPoint } from './paint.js';

const isDiagonal = (a, b) => Math.abs(a[0] - b[0]) === 1 && Math.abs(a[1] - b[1]) === 1;
const isBeside = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

// One drag of the pencil or eraser. With clean lines on, a pixel that turns a diagonal step into
// an L-shaped corner is put back, so outlines stay one pixel thin without doubled corners.
export class Stroke {
  constructor(sprite, color, options = {}) {
    this.sprite = sprite;
    this.color = color;
    this.options = options;
    this.before = cloneSprite(sprite);
    this.path = [];
    this.last = null;
  }

  add(x, y) {
    const points = this.last ? linePoints(this.last[0], this.last[1], x, y).slice(1) : [[x, y]];

    for (const point of points) {
      this.place(point);
    }

    this.last = [x, y];
  }

  place(point) {
    paintPoint(this.sprite, point[0], point[1], this.color, this.options);
    this.path.push(point);

    if (this.options.cleanLines && this.path.length >= 3) {
      this.removeCorner();
    }
  }

  removeCorner() {
    const [a, b, c] = this.path.slice(-3);

    if (isDiagonal(a, c) && isBeside(a, b) && isBeside(b, c)) {
      for (const [x, y] of mirrored(b[0], b[1], this.options.symmetry)) {
        setPixel(this.sprite, x, y, getPixel(this.before, x, y));
      }

      this.path.splice(this.path.length - 2, 1);
    }
  }
}
