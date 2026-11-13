// Each statement runs on its own, since PGlite (the tests' Postgres) takes one per query. Add new
// migrations at the end and never change one that has shipped.
export const MIGRATIONS = [
  {
    name: '0001_accounts',
    statements: [
      `CREATE TABLE users (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email text NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      // only a hash of each session's token is kept: a copy of the table signs no one in
      `CREATE TABLE sessions (
        token_hash text PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL
      )`,
      'CREATE INDEX sessions_by_user ON sessions (user_id)',
    ],
  },
  {
    name: '0002_documents',
    statements: [
      // The studio's saved work, a document a key, as it keeps it in a browser (src/store/keys.js).
      // A layer's picture is in S3, and its document keeps the file's key (file_key).
      `CREATE TABLE documents (
        user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        key text NOT NULL CHECK (char_length(key) BETWEEN 1 AND 200),
        data jsonb NOT NULL,
        file_key text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, key)
      )`,
    ],
  },
];
