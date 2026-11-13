import { MIGRATIONS } from './migrations.js';

const CREATE_LEDGER = `CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

export async function appliedMigrations(database) {
  await database.query(CREATE_LEDGER);
  const { rows } = await database.query('SELECT name FROM schema_migrations');

  return new Set(rows.map((row) => row.name));
}

// One transaction per migration, so a failed one leaves nothing half done and the next run retries it.
export async function migrate(database, migrations = MIGRATIONS) {
  const applied = await appliedMigrations(database);
  const pending = migrations.filter((migration) => !applied.has(migration.name));

  for (const migration of pending) {
    await database.transaction(async (query) => {
      for (const statement of migration.statements) {
        await query(statement);
      }

      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
    });
  }

  return pending.map((migration) => migration.name);
}
