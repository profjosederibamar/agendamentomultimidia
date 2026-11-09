import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool
export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.SUPABASE_DB_URL;

    let poolConfig: PoolConfig;

    if (connectionString) {
      // Direct connection string (typical in Vercel + Supabase integration)
      const isRemote =
        connectionString.includes('supabase.co') ||
        connectionString.includes('sslmode=') ||
        process.env.NODE_ENV === 'production';

      poolConfig = {
        connectionString,
        max: 10,
        connectionTimeoutMillis: 15000,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
      };
    } else {
      // Object Method configuration (Cloud SQL, Supabase manual parameters)
      const host = process.env.SQL_HOST;
      const isSupabase =
        host?.includes('supabase.co') ||
        host?.includes('pooler.supabase.com') ||
        process.env.SQL_SSL === 'true';

      poolConfig = {
        host: host || 'localhost',
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
        // Supabase requires SSL encryption when connecting over internet/Vercel
        ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
      };
    }

    global._postgresPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
