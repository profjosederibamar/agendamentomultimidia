export type Turno = 'matutino' | 'vespertino' | 'noturno';

export type ItemType = 'equipamento' | 'ambiente';

export type Aula = '1ª Aula' | '2ª Aula' | '3ª Aula' | '4ª Aula' | '5ª Aula';

export interface AulaRoomAssignment {
  aula: Aula;
  classroom: string;
}

export interface BookingResource {
  id: string;
  name: string;
  type: ItemType;
  category: 'Equipamento' | 'Ambiente';
  description: string;
  iconName: 'laptop' | 'tv' | 'projector' | 'speaker' | 'sun' | 'book' | 'flask';
  color: string;
}

export interface Booking {
  id: string;
  groupId?: string; // Group ID when multiple resources are booked together
  resourceId: string;
  resourceName: string;
  resourceType: ItemType;
  date: string; // YYYY-MM-DD
  turno: Turno;
  schedule: AulaRoomAssignment[]; // Direct link: 1ª Aula -> Sala 13.01, 4ª Aula -> Sala 34.01
  classrooms: string[]; // Distinct classrooms involved e.g. ['13.01', '34.01']
  classroom?: string; // Backward compatibility string e.g. "13.01, 34.01"
  aulas: string[]; // Distinct aulas e.g. ['1ª Aula', '4ª Aula']
  teacherName: string;
  curriculumComponent: string; // Componente Curricular
  notes?: string;
  createdAt: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictReason?: 'resource' | 'classroom';
  conflictResourceName?: string;
  conflictClassroom?: string;
  conflictingAulas?: string[];
  conflictingBooking?: Booking;
}
