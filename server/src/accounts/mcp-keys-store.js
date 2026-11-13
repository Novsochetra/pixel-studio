// Each account's key for Claude Code, kept as a hash. A new key takes the place of the last, so
// one made again on another machine stops the first.
export function createMcpKeysStore(database) {
  return {
    replace: (userId, hash) =>
      database.query(
        'INSERT INTO mcp_keys (user_id, key_hash) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET key_hash = EXCLUDED.key_hash, created_at = now(), last_used_at = NULL',
        [userId, hash],
      ),

    async about(userId) {
      const { rows } = await database.query(
        'SELECT created_at, last_used_at FROM mcp_keys WHERE user_id = $1',
        [userId],
      );

      return rows[0] ? { createdAt: rows[0].created_at, lastUsedAt: rows[0].last_used_at } : null;
    },

    remove: (userId) => database.query('DELETE FROM mcp_keys WHERE user_id = $1', [userId]),

    async userOfKey(hash) {
      const { rows } = await database.query(
        'UPDATE mcp_keys SET last_used_at = now() FROM users WHERE mcp_keys.key_hash = $1 AND users.id = mcp_keys.user_id RETURNING users.id::text, users.email',
        [hash],
      );

      return rows[0] ?? null;
    },
  };
}
