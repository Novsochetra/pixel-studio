import { strict as assert } from 'node:assert';
import { beforeEach, mock, test } from 'node:test';
import { touchIntent } from '../../src/ui/touch-intent.js';

const at = (x, y) => ({ clientX: x, clientY: y });

function landed() {
  const started = { times: 0 };
  const intent = touchIntent(at(100, 100), () => {
    started.times += 1;
  });

  return { intent, started };
}

beforeEach(() => {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout'] });
});

test('a finger that stays put starts its tool after a moment', () => {
  const { started } = landed();

  mock.timers.tick(100);
  assert.equal(started.times, 0);
  mock.timers.tick(100);
  assert.equal(started.times, 1);
});

test('a finger that moves starts its tool at once; a tremble does not', () => {
  const { intent, started } = landed();

  intent.moved(at(102, 101));
  assert.equal(started.times, 0);
  intent.moved(at(108, 100));
  assert.equal(started.times, 1);
});

test('the tool starts once, however it was told to', () => {
  const { intent, started } = landed();

  intent.begin();
  intent.moved(at(140, 140));
  intent.begin();
  mock.timers.tick(500);
  assert.equal(started.times, 1);
});

// the first finger of a pinch filled the art with the Fill tool in hand
test('a second finger in time makes it a pinch: the tool never starts', () => {
  const { intent, started } = landed();

  intent.drop();
  intent.moved(at(160, 160));
  intent.begin();
  mock.timers.tick(500);
  assert.equal(started.times, 0);
});
