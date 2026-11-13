import { migrate } from './migrate.js';
import { createPgliteDatabase } from './pglite.js';
import { createPostgresDatabase, describeDatabase } from './postgres.js';

// Postgres at DATABASE_URL, migrated before each deploy (db/migrate-cli.js); else one in memory,
// migrated here, whose accounts and work are gone when the server stops.
export async function openDatabase({ databaseUrl }) {
  if (databaseUrl) {
    return {
      database: createPostgresDatabase({ connectionString: databaseUrl }),
      description: `Accounts and saved work in Postgres ${describeDatabase(databaseUrl)}`,
    };
  }

  const database = await createPgliteDatabase().catch(() => {
    throw new Error('DATABASE_URL is not set, and there is no Postgres in memory to use instead.');
  });

  await migrate(database);

  return {
    database,
    description:
      'Accounts and saved work in memory: gone when the server stops (set DATABASE_URL to keep them)',
  };
}
