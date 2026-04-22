import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { getConfig } from '../config';

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const cfg = getConfig();
    _pool = new Pool({
      connectionString: cfg.db.url,
      ssl: cfg.db.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return _pool;
}

export function getDbPool(): Pool {
  return getPool();
}

export const db = drizzle({ client: getPool(), schema });
