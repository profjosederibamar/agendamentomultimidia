import { Booking, ConflictCheckResult, Turno, Aula, AulaRoomAssignment } from '../types/booking';
import { SCHOOL_RESOURCES } from '../constants/schoolData';

const STORAGE_KEY = 'escola_agendamentos_v3';
const TEACHER_PROFILE_KEY = 'escola_professor_perfil_v1';

export interface TeacherProfile {
  name: string;
  component: string;
}

// Generate today's date string YYYY-MM-DD in local time
export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowDateString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Seed realistic demo bookings with linked Aula -> Classroom schedule
const getInitialSeedBookings = (): Booking[] => {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  return [
    {
      id: 'demo-1',
      groupId: 'grp-demo-1',
      resourceId: 'chromebook',
      resourceName: 'Carrinho de Chromebook',
      resourceType: 'equipamento',
      date: today,
      turno: 'matutino',
      schedule: [
        { aula: '1ª Aula', classroom: '13.01' },
        { aula: '4ª Aula', classroom: '34.01' },
      ],
      classrooms: ['13.01', '34.01'],
      classroom: '13.01 (1ª Aula), 34.01 (4ª Aula)',
      aulas: ['1ª Aula', '4ª Aula'],
      teacherName: 'Prof. Ana Clara',
      curriculumComponent: 'Língua Portuguesa',
      notes: 'Pesquisa com Chromebooks na 1ª e 4ª aula em salas diferentes',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-2',
      groupId: 'grp-demo-2',
      resourceId: 'datashow',
      resourceName: 'Datashow',
      resourceType: 'equipamento',
      date: today,
      turno: 'vespertino',
      schedule: [
        { aula: '1ª Aula', classroom: '62.01' },
        { aula: '2ª Aula', classroom: '72.01' },
      ],
      classrooms: ['62.01', '72.01'],
      classroom: '62.01 (1ª Aula), 72.01 (2ª Aula)',
      aulas: ['1ª Aula', '2ª Aula'],
      teacherName: 'Prof. Carlos Eduardo',
      curriculumComponent: 'Matemática',
      notes: 'Exibição de geometria espacial',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-3',
      groupId: 'grp-demo-3',
      resourceId: 'laboratorio',
      resourceName: 'Laboratório',
      resourceType: 'ambiente',
      date: today,
      turno: 'vespertino',
      schedule: [
        { aula: '3ª Aula', classroom: '82.01' },
        { aula: '4ª Aula', classroom: '82.01' },
      ],
      classrooms: ['82.01'],
      classroom: '82.01',
      aulas: ['3ª Aula', '4ª Aula'],
      teacherName: 'Prof. Mariana Santos',
      curriculumComponent: 'Ciências',
      notes: 'Experimento prático sobre reações químicas',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-4',
      groupId: 'grp-demo-4',
      resourceId: 'tv',
      resourceName: 'TV',
      resourceType: 'equipamento',
      date: tomorrow,
      turno: 'matutino',
      schedule: [
        { aula: '2ª Aula', classroom: '23.01' },
        { aula: '3ª Aula', classroom: '24.01' },
      ],
      classrooms: ['23.01', '24.01'],
      classroom: '23.01 (2ª Aula), 24.01 (3ª Aula)',
      aulas: ['2ª Aula', '3ª Aula'],
      teacherName: 'Prof. Roberto Silva',
      curriculumComponent: 'História',
      notes: 'Documentário sobre o Brasil Colonial',
      createdAt: new Date().toISOString(),
    },
  ];
};

export const getStoredBookings = (): Booking[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialSeedBookings();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Normalize backward compatibility
    return parsed.map((b) => {
      const aulas = b.aulas || ['1ª Aula', '2ª Aula'];
      const classrooms = b.classrooms || (b.classroom ? [b.classroom] : ['13.01']);
      const schedule: AulaRoomAssignment[] =
        b.schedule ||
        aulas.map((aula: Aula, idx: number) => ({
          aula,
          classroom: classrooms[idx % classrooms.length] || classrooms[0],
        }));

      return {
        ...b,
        schedule,
        classrooms,
        aulas,
      };
    });
  } catch (err) {
    console.error('Erro ao ler agendamentos:', err);
    return [];
  }
};

export const saveBookings = (bookings: Booking[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  window.dispatchEvent(new Event('escola_bookings_updated'));
};

/**
 * Check conflicts for a specific resource and its aula-classroom schedule
 */
export const checkScheduleConflict = (
  resourceId: string,
  date: string,
  turno: Turno,
  schedule: AulaRoomAssignment[],
  excludeId?: string
): ConflictCheckResult => {
  const bookings = getStoredBookings();

  for (const b of bookings) {
    if (excludeId && b.id === excludeId) continue;
    if (b.date !== date || b.turno !== turno) continue;

    for (const item of schedule) {
      // Check 1: Does another booking have the same resource on this specific aula?
      const bHasAula = (b.aulas || []).includes(item.aula);
      if (b.resourceId === resourceId && bHasAula) {
        return {
          hasConflict: true,
          conflictReason: 'resource',
          conflictResourceName: b.resourceName,
          conflictingAulas: [item.aula],
          conflictingBooking: b,
        };
      }

      // Check 2: Does another booking have the same classroom on this specific aula?
      let isRoomOccupiedInAula = false;
      if (b.schedule && b.schedule.length > 0) {
        isRoomOccupiedInAula = b.schedule.some(
          (s) => s.aula === item.aula && s.classroom === item.classroom
        );
      } else {
        const bRooms = b.classrooms || (b.classroom ? [b.classroom] : []);
        isRoomOccupiedInAula = bHasAula && bRooms.includes(item.classroom);
      }

      if (isRoomOccupiedInAula) {
        return {
          hasConflict: true,
          conflictReason: 'classroom',
          conflictClassroom: item.classroom,
          conflictingAulas: [item.aula],
          conflictingBooking: b,
        };
      }
    }
  }

  return { hasConflict: false };
};

/**
 * Find which aulas are already booked for a specific resource on a date and turno
 */
export const getOccupiedAulasForResource = (
  resourceId: string,
  date: string,
  turno: Turno
): Map<string, Booking> => {
  const bookings = getStoredBookings();
  const map = new Map<string, Booking>();

  bookings.forEach((b) => {
    if (b.date === date && b.turno === turno && b.resourceId === resourceId) {
      (b.aulas || []).forEach((aula) => {
        map.set(aula, b);
      });
    }
  });

  return map;
};

/**
 * Find which aulas are already booked for a specific classroom on a date and turno
 */
export const getOccupiedAulasForClassroom = (
  classroom: string,
  date: string,
  turno: Turno
): Map<string, Booking> => {
  const bookings = getStoredBookings();
  const map = new Map<string, Booking>();

  bookings.forEach((b) => {
    if (b.date === date && b.turno === turno) {
      // If schedule exists, check exact aula assignment
      if (b.schedule && b.schedule.length > 0) {
        b.schedule.forEach((s) => {
          if (s.classroom === classroom) {
            map.set(s.aula, b);
          }
        });
      } else {
        const bRooms = b.classrooms || (b.classroom ? [b.classroom] : []);
        if (bRooms.includes(classroom)) {
          (b.aulas || []).forEach((aula) => {
            map.set(aula, b);
          });
        }
      }
    }
  });

  return map;
};

export interface CreateScheduleBatchBookingInput {
  resourceIds: string[];
  date: string;
  turno: Turno;
  schedule: AulaRoomAssignment[];
  teacherName: string;
  curriculumComponent: string;
  notes?: string;
}

export const createScheduleBatchBooking = (
  input: CreateScheduleBatchBookingInput
): { success: boolean; error?: string; createdBookings?: Booking[] } => {
  if (input.resourceIds.length === 0) {
    return { success: false, error: 'Selecione pelo menos um equipamento ou ambiente.' };
  }
  if (input.schedule.length === 0) {
    return { success: false, error: 'Selecione pelo menos uma aula com sua sala de aula correspondente.' };
  }
  if (!input.teacherName.trim()) {
    return { success: false, error: 'Digite o nome do professor(a).' };
  }
  if (!input.curriculumComponent.trim()) {
    return { success: false, error: 'Digite o componente curricular.' };
  }

  // Ensure every schedule item has a valid classroom
  for (const item of input.schedule) {
    if (!item.classroom) {
      return {
        success: false,
        error: `Por favor, selecione a sala de aula para a ${item.aula}.`,
      };
    }
  }

  // Check conflicts for all selected resources against the schedule
  for (const resId of input.resourceIds) {
    const conflict = checkScheduleConflict(
      resId,
      input.date,
      input.turno,
      input.schedule
    );

    if (conflict.hasConflict && conflict.conflictingBooking) {
      const conflictingAula = conflict.conflictingAulas?.[0] || 'uma das aulas';
      if (conflict.conflictReason === 'resource') {
        return {
          success: false,
          error: `O item "${conflict.conflictingBooking.resourceName}" já está reservado na ${conflictingAula} por ${conflict.conflictingBooking.teacherName} (${conflict.conflictingBooking.curriculumComponent}). Desmarque essa aula ou escolha outro item.`,
        };
      } else {
        return {
          success: false,
          error: `A sala ${conflict.conflictClassroom} já está ocupada na ${conflictingAula} por ${conflict.conflictingBooking.teacherName} (${conflict.conflictingBooking.resourceName}). Escolha outra sala para essa aula.`,
        };
      }
    }
  }

  const groupId = 'grp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const newBookings: Booking[] = [];

  // Extract distinct aulas and distinct classrooms
  const distinctAulas = Array.from(new Set(input.schedule.map((s) => s.aula)));
  const distinctClassrooms = Array.from(new Set(input.schedule.map((s) => s.classroom)));
  const classroomSummary = input.schedule
    .map((s) => `${s.aula}: Sala ${s.classroom}`)
    .join(', ');

  for (const resId of input.resourceIds) {
    const resourceMeta = SCHOOL_RESOURCES.find((r) => r.id === resId);
    if (!resourceMeta) continue;

    const b: Booking = {
      id: 'res-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      groupId,
      resourceId: resourceMeta.id,
      resourceName: resourceMeta.name,
      resourceType: resourceMeta.type,
      date: input.date,
      turno: input.turno,
      schedule: input.schedule,
      classrooms: distinctClassrooms,
      classroom: classroomSummary,
      aulas: distinctAulas,
      teacherName: input.teacherName.trim(),
      curriculumComponent: input.curriculumComponent.trim(),
      notes: input.notes?.trim(),
      createdAt: new Date().toISOString(),
    };
    newBookings.push(b);
  }

  const current = getStoredBookings();
  const updated = [...newBookings, ...current];
  saveBookings(updated);

  saveTeacherProfile({
    name: input.teacherName.trim(),
    component: input.curriculumComponent.trim(),
  });

  return { success: true, createdBookings: newBookings };
};

export const deleteBooking = (id: string): boolean => {
  const current = getStoredBookings();
  const filtered = current.filter((b) => b.id !== id);
  if (filtered.length !== current.length) {
    saveBookings(filtered);
    return true;
  }
  return false;
};

// Teacher memory helper
export const getSavedTeacherProfile = (): TeacherProfile | null => {
  try {
    const raw = localStorage.getItem(TEACHER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveTeacherProfile = (profile: TeacherProfile) => {
  try {
    localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error(e);
  }
};
