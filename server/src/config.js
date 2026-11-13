export const DEFAULT_PORT = 8811;
export const DEFAULT_HOST = '127.0.0.1';

const POSTGRES_URL = /^postgres(ql)?:\/\//i;

function readPort(value) {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be a whole number from 0 to 65535, got "${value}"`);
  }

  return port;
}

// Railway sets RAILWAY_ENVIRONMENT_ID in every deployment (docs/deploy-railway.md).
export const onRailway = (env) => Boolean(env.RAILWAY_ENVIRONMENT_ID);

// Without Postgres the server keeps accounts and saved work in memory, and a deploy replaces the
// memory: on Railway it refuses to start instead. The value is never shown: it holds the password.
export function railwayProblem(env) {
  if (!onRailway(env) || POSTGRES_URL.test(env.DATABASE_URL?.trim() ?? '')) {
    return null;
  }

  return 'DATABASE_URL is not a postgres:// URL (its value is not shown). On Railway set it to ${{Postgres.DATABASE_URL}}, without quotes, or every account is lost on the next deploy.';
}

// Railway's edge proxy is the only way in, over https: listen on every interface, trust its one
// hop for the visitor's address, and send the session cookie only over https. A variable that is
// set still wins.
export function withRailwayDefaults(env) {
  if (!onRailway(env)) {
    return env;
  }

  const problem = railwayProblem(env);

  if (problem) {
    throw new Error(problem);
  }

  return {
    ...env,
    HOST: env.HOST || '0.0.0.0',
    TRUST_PROXY: env.TRUST_PROXY || '1',
    SECURE_COOKIES: env.SECURE_COOKIES || '1',
  };
}

export function readServerConfig(env) {
  return {
    port: readPort(env.PORT),
    host: env.HOST || DEFAULT_HOST,
    databaseUrl: env.DATABASE_URL?.trim() ?? '',
    trustProxy: env.TRUST_PROXY === '1',
    secureCookies: env.SECURE_COOKIES === '1',
  };
}
