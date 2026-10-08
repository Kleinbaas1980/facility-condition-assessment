import pg from "pg";
import { env } from "./env.js";
import { logger } from "./logger.js";

export function connectionOptions(connectionString: string) {
  const url = new URL(connectionString);
  // Strip libpq SSL query flags so they cannot override certificate verification below.
  for (const key of [
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "uselibpqcompat",
  ])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : false,
  };
}

export const pool = new pg.Pool({
  ...connectionOptions(env.DATABASE_URL),
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 20_000,
});

pool.on("error", (error) =>
  logger.error({ error: error.message }, "PostgreSQL pool failure"),
);

export async function transaction<T>(
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type Db = Pick<pg.PoolClient, "query">;
