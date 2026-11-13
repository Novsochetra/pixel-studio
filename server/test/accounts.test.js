import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { startServer, visitor } from './helpers.js';
import { hashPassword, passwordMatches } from '../src/accounts/passwords.js';

let server;

before(async () => {
  server = await startServer();
});
after(() => server.close());

const account = { email: 'Artist@Example.com', password: 'pixels-forever' };

test('a password is kept as a salted hash, and only its own matches', async () => {
  const first = await hashPassword('pixels-forever');

  assert.notEqual(first, await hashPassword('pixels-forever'), 'each has a salt of its own');
  assert.ok(!first.includes('pixels-forever'));
  assert.ok(await passwordMatches('pixels-forever', first));
  assert.ok(!(await passwordMatches('pixels-forevex', first)));
});

test('an account is made, signed in to and out of', async () => {
  const browser = visitor(server.base);

  assert.deepEqual((await browser('/api/account')).json, { studio: true, user: null });

  const made = await browser('/api/account/signup', { method: 'POST', json: account });

  assert.equal(made.status, 200);
  assert.equal(made.json.user.email, 'artist@example.com', 'the email is kept in lower case');
  assert.match(made.set, /HttpOnly/);
  assert.match(made.set, /SameSite=Lax/);
  assert.equal((await browser('/api/account')).json.user.email, 'artist@example.com');

  await browser('/api/account/signout', { method: 'POST', json: {} });
  assert.equal((await browser('/api/account')).json.user, null, 'the session is over');
});

test('an email has one account, and a wrong password says no more than that', async () => {
  const browser = visitor(server.base);
  const again = await browser('/api/account/signup', { method: 'POST', json: account });
  const wrong = await browser('/api/account/signin', {
    method: 'POST',
    json: { ...account, password: 'not-the-one' },
  });
  const nobody = await browser('/api/account/signin', {
    method: 'POST',
    json: { email: 'nobody@example.com', password: 'whatever-it-is' },
  });

  assert.equal(again.status, 409);
  assert.equal(wrong.status, 401);
  assert.equal(nobody.json.error, wrong.json.error, 'no telling who has an account');
  assert.equal(
    (await browser('/api/account/signin', { method: 'POST', json: account })).status,
    200,
  );
});

test('a short password and a non-address are refused, in words', async () => {
  const browser = visitor(server.base);
  const short = await browser('/api/account/signup', {
    method: 'POST',
    json: { email: 'new@example.com', password: 'short' },
  });
  const odd = await browser('/api/account/signup', {
    method: 'POST',
    json: { email: 'not an email', password: 'long enough' },
  });

  assert.equal(short.status, 400);
  assert.match(short.json.error, /8 to 200 characters/);
  assert.match(odd.json.error, /not an email address/);
});

test('another site cannot call the API with its visitor’s cookie', async () => {
  const browser = visitor(server.base);
  const answer = await browser('/api/account/signin', {
    method: 'POST',
    json: account,
    headers: { origin: 'https://elsewhere.example' },
  });

  assert.equal(answer.status, 403);
});

test('signing in is limited to ten tries a minute for one email', async () => {
  const fresh = await startServer();
  const browser = visitor(fresh.base);
  const tries = [];

  for (let i = 0; i < 11; i++) {
    tries.push(
      (
        await browser('/api/account/signin', {
          method: 'POST',
          json: { email: 'target@example.com', password: `guess-${i}-guess` },
        })
      ).status,
    );
  }

  await fresh.close();
  assert.deepEqual(tries.slice(-2), [401, 429]);
});
