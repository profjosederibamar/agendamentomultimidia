import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Booking } from '../types/booking.ts';

export const cleanSupabaseUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let cleaned = rawUrl.trim();
  // Strip trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  // Strip /rest/v1 or /rest/v1/ if user pasted the REST endpoint
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  // Strip trailing slashes again
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

const SUPABASE_URL_KEY = 'escola_supabase_url';
const SUPABASE_ANON_KEY = 'escola_supabase_anon_key';
export const DEFAULT_SUPABASE_URL = 'https://qloswiosvzjockzdetwn.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_eChB2cVU5apHPrCP0GqxUA_p-IIN94T';

let cachedClient: SupabaseClient | null = null;

/**
 * Get current configured Supabase credentials
 */
export const getSupabaseCredentials = (): { url: string; anonKey: string } => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_URL_KEY) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_ANON_KEY) || '' : '';

  const rawUrl = localUrl || envUrl || DEFAULT_SUPABASE_URL;
  const rawKey = localKey || envKey || DEFAULT_SUPABASE_KEY;

  return {
    url: cleanSupabaseUrl(rawUrl),
    anonKey: rawKey.trim(),
  };
};

/**
 * Get active Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar cliente Supabase:', err);
    return null;
  }
};

/**
 * Check if Supabase client credentials are fully set
 */
export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
};

/**
 * Save credentials to local storage and reinitialize
 */
export const saveSupabaseCredentials = (url: string, anonKey: string) => {
  if (typeof window !== 'undefined') {
    const cleaned = cleanSupabaseUrl(url);
    localStorage.setItem(SUPABASE_URL_KEY, cleaned);
    localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
  }
  cachedClient = null;
  window.dispatchEvent(new Event('escola_supabase_config_updated'));
};

/**
 * Clear credentials
 */
export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_ANON_KEY);
  }
  cachedClient = null;
  window.dispatchEvent(new Event('escola_supabase_config_updated'));
};

/**
 * Test connectivity with Supabase using URL and Publishable Key
 */
export const testSupabaseConnection = async (
  rawUrl: string,
  rawKey: string
): Promise<{ success: boolean; message: string; tableFound?: boolean; rlsNeedsPolicy?: boolean }> => {
  try {
    const url = cleanSupabaseUrl(rawUrl);
    const anonKey = rawKey.trim();
    const client = createClient(url, anonKey);

    // Test querying the bookings table
    const { data, error } = await client
      .from('bookings')
      .select('id')
      .limit(1);

    if (error) {
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('not found')
      ) {
        return {
          success: true,
          tableFound: false,
          message:
            'Conexão com o Supabase autenticada! Porém a tabela "bookings" ainda não foi criada no seu Supabase.',
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message} (${error.code || ''})`,
      };
    }

    // Test write permission for RLS validation
    const testId = 'test-perm-' + Date.now();
    const { error: insertError } = await client.from('bookings').insert([
      {
        id: testId,
        resource_id: 'test-check',
        resource_name: 'Teste Conexão',
        resource_type: 'equipamento',
        date: '2026-11-09',
        turno: 'matutino',
        schedule: [],
        classrooms: [],
        aulas: [],
        teacher_name: 'Teste',
        curriculum_component: 'Teste',
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError && insertError.code === '42501') {
      return {
        success: true,
        tableFound: true,
        rlsNeedsPolicy: true,
        message:
          '✅ Conexão e leitura ativas! Apenas a política de gravação (RLS) precisa ser liberada na tabela "bookings" no Supabase.',
      };
    }

    if (!insertError) {
      try {
        await client.from('bookings').delete().eq('id', testId);
      } catch {
        // Ignore test cleanup error
      }
    }

    return {
      success: true,
      tableFound: true,
      rlsNeedsPolicy: false,
      message: `🎉 Conexão 100% ativa com leitura e gravação no Supabase! (${data?.length ?? 0} agendamentos)`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Falha ao conectar com o Supabase.',
    };
  }
};

/**
 * Fetch all bookings directly from Supabase
 */
export const fetchBookingsFromSupabase = async (): Promise<Booking[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar agendamentos do Supabase:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      groupId: row.group_id || undefined,
      resourceId: row.resource_id,
      resourceName: row.resource_name,
      resourceType: row.resource_type,
      date: row.date,
      turno: row.turno,
      schedule: row.schedule || [],
      classrooms: row.classrooms || [],
      classroom: row.classroom || undefined,
      aulas: row.aulas || [],
      teacherName: row.teacher_name,
      curriculumComponent: row.curriculum_component,
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Falha na consulta ao Supabase:', err);
    return [];
  }
};

/**
 * Insert batch bookings directly into Supabase
 */
export const insertBookingsToSupabase = async (items: Booking[]): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client || items.length === 0) return false;

  try {
    const rows = items.map((b) => ({
      id: b.id,
      group_id: b.groupId || null,
      resource_id: b.resourceId,
      resource_name: b.resourceName,
      resource_type: b.resourceType,
      date: b.date,
      turno: b.turno,
      schedule: b.schedule,
      classrooms: b.classrooms,
      classroom: b.classroom || null,
      aulas: b.aulas,
      teacher_name: b.teacherName,
      curriculum_component: b.curriculumComponent,
      notes: b.notes || null,
      created_at: b.createdAt,
    }));

    const { error } = await client.from('bookings').upsert(rows);
    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao enviar agendamentos para Supabase:', err);
    return false;
  }
};

/**
 * Delete a booking from Supabase
 */
export const deleteBookingFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao excluir no Supabase:', err);
    return false;
  }
};

/**
 * Delete an entire booking group from Supabase
 */
export const deleteBookingGroupFromSupabase = async (
  groupId: string
): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('bookings').delete().eq('group_id', groupId);
    if (error) {
      console.error('Erro ao deletar grupo no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao excluir grupo no Supabase:', err);
    return false;
  }
};
