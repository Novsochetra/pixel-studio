// The accounts and their sessions in Postgres. Ids are read as text: Postgres's bigint is wider
// than a JavaScript number.
export function createAccountsStore(database) {
  return {
    // the new account's id, or null when the email has one already
    async create(email, passwordHash) {
      const { rows } = await database.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id::text',
        [email, passwordHash],
      );

      return rows[0]?.id ?? null;
    },

    async byEmail(email) {
      const { rows } = await database.query(
        'SELECT id::text, email, password_hash FROM users WHERE email = $1',
        [email],
      );

      return rows[0] ? { id: rows[0].id, email: rows[0].email, hash: rows[0].password_hash } : null;
    },

    startSession: (userId, hash, endsAt) =>
      database.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [
        hash,
        userId,
        endsAt.toISOString(),
      ]),

    async userOfSession(hash) {
      const { rows } = await database.query(
        'SELECT users.id::text, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = $1 AND sessions.expires_at > now()',
        [hash],
      );

      return rows[0] ?? null;
    },

    endSession: (hash) => database.query('DELETE FROM sessions WHERE token_hash = $1', [hash]),

    setPassword: (email, passwordHash) => setPassword(database, email, passwordHash),
  };
}

// a new password ends every session the old one began, and the key Claude Code was given: one
// who had the account's password may have made it
async function setPassword(database, email, passwordHash) {
  const { rows } = await database.query(
    'UPDATE users SET password_hash = $2 WHERE email = $1 RETURNING id::text',
    [email, passwordHash],
  );

  if (rows[0]) {
    await database.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].id]);
    await database.query('DELETE FROM mcp_keys WHERE user_id = $1', [rows[0].id]);
  }

  return Boolean(rows[0]);
}
