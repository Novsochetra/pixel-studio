// A whole Postgres in this process, kept in memory: for the tests, and for running the server on
// a laptop with no database. It is a dev dependency, so a server deployed without DATABASE_URL
// says so instead (open-database.js).
export async function createPgliteDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = new PGlite();

  return {
    query: (text, values) => pglite.query(text, values),
    transaction: (work) =>
      pglite.transaction((tx) => work((text, values) => tx.query(text, values))),
    close: () => pglite.close(),
  };
}
