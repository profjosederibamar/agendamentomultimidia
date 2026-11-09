import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { db } from '../src/db/index.ts';
import { optionalAuth, requireAuth, AuthRequest } from '../src/middleware/auth.ts';
import {
  getAllBookings,
  insertBatchBookings,
  deleteBookingById,
  getTeacherProfiles,
  saveTeacherProfileRecord,
} from '../src/db/bookings.ts';
import { getOrCreateUser } from '../src/db/users.ts';

dotenv.config();

const app = express();
app.use(express.json());

// API Route: Get all bookings
app.get('/api/bookings', async (_req: Request, res: Response) => {
  try {
    const list = await getAllBookings();
    res.json(list);
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Falha ao buscar agendamentos no banco de dados.' });
  }
});

// API Route: Create batch bookings
app.post('/api/bookings/batch', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { bookings: items, teacherProfile } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Lista de agendamentos inválida.' });
    }

    const userId = req.user?.uid;
    const created = await insertBatchBookings(items, userId);

    if (teacherProfile?.name && teacherProfile?.component) {
      await saveTeacherProfileRecord(teacherProfile.name, teacherProfile.component);
    }

    res.status(201).json({ success: true, count: created.length, bookings: created });
  } catch (error: any) {
    console.error('Error creating batch bookings:', error);
    res.status(500).json({ error: 'Falha ao salvar agendamento no banco de dados.' });
  }
});

// API Route: Delete booking
app.delete('/api/bookings/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await deleteBookingById(id);
    if (success) {
      res.json({ success: true, message: 'Agendamento removido com sucesso.' });
    } else {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
    }
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Falha ao remover agendamento no banco de dados.' });
  }
});

// API Route: Get teacher profiles
app.get('/api/teachers', async (_req: Request, res: Response) => {
  try {
    const profiles = await getTeacherProfiles();
    res.json(profiles);
  } catch (error: any) {
    console.error('Error fetching teacher profiles:', error);
    res.status(500).json({ error: 'Falha ao carregar perfis de professores.' });
  }
});

// API Route: Sync Firebase authenticated user
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    const user = await getOrCreateUser(
      req.user.uid,
      req.user.email || 'sem-email@escola.gov.br',
      req.user.name || undefined
    );
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Falha ao sincronizar perfil do usuário.' });
  }
});

// Diagnostic & Test Connection Endpoint for Vercel and Supabase/PostgreSQL
app.get('/api/test-db', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const rawResult = await db.execute(
      sql`SELECT NOW() as server_time, current_database() as db_name, version() as pg_version`
    );
    const bookingsList = await getAllBookings().catch(() => []);
    const latencyMs = Date.now() - startTime;
    const row = rawResult.rows[0] as any;

    const host = process.env.SQL_HOST || 'local-host';
    const isSupabase =
      host.includes('supabase.co') ||
      host.includes('supabase.com') ||
      (row?.pg_version || '').toLowerCase().includes('supabase');

    res.json({
      connected: true,
      provider: isSupabase ? 'Supabase (PostgreSQL)' : 'PostgreSQL (Cloud SQL / Supabase compatível)',
      database: row?.db_name,
      serverTime: row?.server_time,
      version: row?.pg_version,
      latency: `${latencyMs}ms`,
      totalBookings: bookingsList.length,
      vercelReady: true,
      message: '✅ Conexão com o banco de dados PostgreSQL ativa e funcionando 100%!',
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    res.status(500).json({
      connected: false,
      error: error.message || 'Falha ao conectar no banco de dados',
      latency: `${latencyMs}ms`,
      hint: 'Verifique as variáveis SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME ou DATABASE_URL no Vercel.',
    });
  }
});

// Direct test endpoint for custom Supabase connection strings
app.post('/api/test-db', async (req: Request, res: Response) => {
  const { connectionString, host, user, password, database, port } = req.body;
  const startTime = Date.now();
  let tempPool: Pool | null = null;
  try {
    const config = connectionString
      ? {
          connectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        }
      : {
          host: host || 'localhost',
          user: user || 'postgres',
          password: password || '',
          database: database || 'postgres',
          port: port ? parseInt(port, 10) : 5432,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        };

    tempPool = new Pool(config);
    const client = await tempPool.connect();
    const result = await client.query(
      'SELECT NOW() as server_time, current_database() as db_name, version() as pg_version'
    );
    client.release();
    const latencyMs = Date.now() - startTime;
    const row = result.rows[0];

    res.json({
      connected: true,
      provider: 'Supabase / PostgreSQL',
      database: row.db_name,
      serverTime: row.server_time,
      version: row.pg_version,
      latency: `${latencyMs}ms`,
      message: '✅ Teste de conexão com o Supabase realizado com sucesso!',
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    res.status(400).json({
      connected: false,
      error: error.message || 'Falha ao testar conexão com o banco',
      latency: `${latencyMs}ms`,
    });
  } finally {
    if (tempPool) {
      await tempPool.end().catch(() => {});
    }
  }
});

// Initialize Supabase tables automatically
app.post('/api/init-supabase', async (req: Request, res: Response) => {
  const { connectionString } = req.body;
  const targetConnectionString =
    connectionString || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  let tempPool: Pool | null = null;
  try {
    const poolToUse = targetConnectionString
      ? (tempPool = new Pool({
          connectionString: targetConnectionString,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
        }))
      : (await import('../src/db/index.ts')).createPool();

    const client = await poolToUse.connect();

    // Execute table migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        resource_id TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        date TEXT NOT NULL,
        turno TEXT NOT NULL,
        schedule JSONB NOT NULL,
        classrooms JSONB NOT NULL,
        classroom TEXT,
        aulas JSONB NOT NULL,
        teacher_name TEXT NOT NULL,
        curriculum_component TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        user_id TEXT
      );

      CREATE TABLE IF NOT EXISTS teacher_profiles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        component TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_date_turno ON bookings(date, turno);
      CREATE INDEX IF NOT EXISTS idx_bookings_resource_id ON bookings(resource_id);
    `);

    client.release();

    res.json({
      success: true,
      message: '✅ Tabelas criadas com sucesso no Supabase! (bookings, users, teacher_profiles)',
      tables: ['bookings', 'users', 'teacher_profiles'],
    });
  } catch (error: any) {
    console.error('Failed to init Supabase tables:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Falha ao criar tabelas no Supabase',
    });
  } finally {
    if (tempPool) {
      await tempPool.end().catch(() => {});
    }
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;
