import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const COST = { N: 16384, r: 8, p: 1 };
const KEY_BYTES = 64;

// scrypt, slow on purpose, with a salt of its own for each password: a copy of the users table
// does not give the passwords back, nor show who chose the same one
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_BYTES, COST);

  return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join(
    '$',
  );
}

export async function passwordMatches(password, stored) {
  const [scheme, rounds, blockSize, parallel, salt, key] = String(stored).split('$');

  if (scheme !== 'scrypt') {
    return false;
  }

  const expected = Buffer.from(key, 'base64');
  const cost = { N: Number(rounds), r: Number(blockSize), p: Number(parallel) };
  const given = await derive(password, Buffer.from(salt, 'base64'), expected.length, cost);

  // the same time whatever the answer, so the time taken tells nothing of how near it came
  return timingSafeEqual(given, expected);
}
