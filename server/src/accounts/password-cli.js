import { createInterface } from 'node:readline/promises';
import { createPostgresDatabase } from '../db/postgres.js';
import { accountProblem, emailOf } from './account-checks.js';
import { createAccountsStore } from './accounts-store.js';
import { hashPassword } from './passwords.js';

// npm run account:password -- them@example.com, inside the service (railway ssh): there is no
// email sending, so someone who forgot their password is given a new one by hand. It is asked for
// here, not taken as an argument, so it stays out of the shell's history.
const email = emailOf(process.argv[2]);
const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error('DATABASE_URL is not set: run this inside the service (railway ssh).');
  process.exit(1);
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
const password = await prompt.question(`New password for ${email}: `);

prompt.close();

const problem = accountProblem({ email, password });

if (problem) {
  console.error(problem);
  process.exit(1);
}

const database = createPostgresDatabase({ connectionString });

try {
  const changed = await createAccountsStore(database).setPassword(
    email,
    await hashPassword(password),
  );

  console.log(
    changed ? `Changed, and ${email} is signed out everywhere.` : `No account is ${email}.`,
  );
} finally {
  await database.close();
}
