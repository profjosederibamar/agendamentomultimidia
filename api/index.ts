import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
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

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;
