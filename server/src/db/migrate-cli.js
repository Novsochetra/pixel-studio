import { migrate } from './migrate.js';
import { createPostgresDatabase, describeDatabase } from './postgres.js';

const connectionString = process.env.DATABASE_URL?.trim();

if (connectionString) {
  const database = createPostgresDatabase({ connectionString });

  try {
    console.log(`Migrating ${describeDatabase(connectionString)}`);
    const applied = await migrate(database);

    console.log(applied.length > 0 ? `Applied ${applied.join(', ')}` : 'Up to date.');
  } finally {
    await database.close();
  }
} else {
  console.error('DATABASE_URL is not set, so there is no database to migrate.');
  process.exitCode = 1;
}
