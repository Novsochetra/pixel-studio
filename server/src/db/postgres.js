import pg from 'pg';

// Only the database name and host: the URL also holds the password.
export function describeDatabase(connectionString) {
  try {
    const url = new URL(connectionString);

    return `${url.pathname.slice(1) || 'postgres'} on ${url.host}`;
  } catch {
    return 'an unreadable DATABASE_URL';
  }
}

async function inTransaction(pool, work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work((text, values) => client.query(text, values));

    await client.query('COMMIT');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function createPostgresDatabase({ connectionString, logError = console.error }) {
  const pool = new pg.Pool({ connectionString, max: 5 });

  // An idle connection that drops (a database restart) emits here; without a listener Node would
  // stop the whole server.
  pool.on('error', (error) => logError(`Postgres connection error: ${error.message}`));

  return {
    query: (text, values) => pool.query(text, values),
    transaction: (work) => inTransaction(pool, work),
    close: () => pool.end(),
  };
}
