import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  AlertCircle,
  MapPin,
  User,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Check,
  Copy,
  Lock,
  LogIn,
  UserPlus,
  MessageSquarePlus,
  LayoutGrid,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  Turno,
  Booking,
  BookingResource,
  ItemType,
  Aula,
  AulaRoomAssignment,
} from '../types/booking';
import { useAuth } from '../context/AuthContext.tsx';
import {
  SCHOOL_RESOURCES,
  CLASSROOMS_BY_TURNO,
  TURNO_CONFIG,
  SUGGESTED_COMPONENTS,
  AULAS_LIST,
  AULA_SCHEDULE_BY_TURNO,
} from '../constants/schoolData';
import {
  createScheduleBatchBooking,
  getTodayDateString,
  getTomorrowDateString,
  formatDateDisplay,
  getSavedTeacherProfile,
  getStoredBookings,
  getOccupiedAulasForResource,
  getOccupiedAulasForClassroom,
} from '../services/storageService';
import { ResourceIcon } from './ResourceIcon';

interface BookingFormProps {
  onBookingSuccess: (bookings: Booking[]) => void;
  preselectedDate?: string;
  preselectedTurno?: Turno;
  preselectedResourceId?: string;
  onOpenAuth?: (mode?: 'login' | 'register' | 'forgot') => void;
  onViewBoard?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onBookingSuccess,
  preselectedDate,
  preselectedTurno,
  preselectedResourceId,
  onOpenAuth,
  onViewBoard,
}) => {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  // Form State
  const [teacherName, setTeacherName] = useState('');
  const [curriculumComponent, setCurriculumComponent] = useState('');
  const [date, setDate] = useState<string>(preselectedDate || today);
  const [turno, setTurno] = useState<Turno>(preselectedTurno || 'matutino');

  // Selected Resources (single-select by default)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    preselectedResourceId ? [preselectedResourceId] : []
  );

  // Linked Schedule State: Default only 1ª Aula active for simplicity
  const [aulaActiveMap, setAulaActiveMap] = useState<Record<Aula, boolean>>({
    '1ª Aula': true,
    '2ª Aula': false,
    '3ª Aula': false,
    '4ª Aula': false,
    '5ª Aula': false,
  });

  const [aulaRoomMap, setAulaRoomMap] = useState<Record<Aula, string>>({
    '1ª Aula': '13.01',
    '2ª Aula': '13.01',
    '3ª Aula': '13.01',
    '4ª Aula': '13.01',
    '5ª Aula': '13.01',
  });

  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ItemType>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sync preselected values from Board quick-book
  useEffect(() => {
    if (preselectedDate) setDate(preselectedDate);
    if (preselectedTurno) setTurno(preselectedTurno);
    if (preselectedResourceId) setSelectedResourceIds([preselectedResourceId]);
  }, [preselectedDate, preselectedTurno, preselectedResourceId]);

  // Valid rooms for current shift
  const validRooms = useMemo(() => CLASSROOMS_BY_TURNO[turno] || [], [turno]);

  // Conflict calculation for rooms per aula
  const isRoomOccupiedOnAula = useCallback(
    (aula: Aula, room: string): Booking | null => {
      const occupiedMap = getOccupiedAulasForClassroom(room, date, turno);
      return occupiedMap.get(aula) || null;
    },
    [date, turno, activeBookings]
  );

  // Ensure default rooms match shift rooms and pick a FREE room
  useEffect(() => {
    if (validRooms.length > 0) {
      setAulaRoomMap((prev) => {
        const next = { ...prev };
        let changed = false;

        AULAS_LIST.forEach((aula) => {
          const currentRoom = next[aula];
          const occupied = isRoomOccupiedOnAula(aula, currentRoom);

          if (!validRooms.includes(currentRoom) || occupied) {
            const freeRoom = validRooms.find((r) => !isRoomOccupiedOnAula(aula, r));
            if (freeRoom && freeRoom !== currentRoom) {
              next[aula] = freeRoom;
              changed = true;
            } else if (!validRooms.includes(currentRoom)) {
              next[aula] = validRooms[0];
              changed = true;
            }
          }
        });

        return changed ? next : prev;
      });
    }
  }, [turno, date, validRooms, activeBookings, isRoomOccupiedOnAula]);

  // Load bookings and teacher profile on mount
  useEffect(() => {
    const refresh = () => {
      setActiveBookings(getStoredBookings());
    };
    refresh();

    const savedProfile = getSavedTeacherProfile();
    if (savedProfile) {
      if (!teacherName && savedProfile.name) setTeacherName(savedProfile.name);
      if (!curriculumComponent && savedProfile.component) {
        setCurriculumComponent(savedProfile.component);
      }
    }

    window.addEventListener('escola_bookings_updated', refresh);
    return () => window.removeEventListener('escola_bookings_updated', refresh);
  }, []);

  // Auto pre-fill teacher name when logged in
  useEffect(() => {
    if (user && !teacherName) {
      const name = user.displayName || user.email?.split('@')[0] || '';
      if (name) setTeacherName(name);
    }
  }, [user, teacherName]);

  // Compute active schedule assignments
  const activeSchedule: AulaRoomAssignment[] = useMemo(() => {
    const list: AulaRoomAssignment[] = [];
    AULAS_LIST.forEach((aula) => {
      if (aulaActiveMap[aula]) {
        list.push({
          aula,
          classroom: aulaRoomMap[aula] || validRooms[0] || '',
        });
      }
    });
    return list;
  }, [aulaActiveMap, aulaRoomMap, validRooms]);

  const activeAulasList = useMemo(
    () => activeSchedule.map((s) => s.aula),
    [activeSchedule]
  );

  // Conflict map for resources based on active aulas
  const resourceConflictInfo = useMemo(() => {
    const map = new Map<string, { occupiedAulas: string[]; conflictingBookings: Booking[] }>();

    SCHOOL_RESOURCES.forEach((r) => {
      const occupiedMap = getOccupiedAulasForResource(r.id, date, turno);
      const overlapping: string[] = [];
      const bookingsList: Booking[] = [];

      activeAulasList.forEach((aula) => {
        const b = occupiedMap.get(aula);
        if (b) {
          overlapping.push(aula);
          if (!bookingsList.some((existing) => existing.id === b.id)) {
            bookingsList.push(b);
          }
        }
      });

      if (overlapping.length > 0) {
        map.set(r.id, { occupiedAulas: overlapping, conflictingBookings: bookingsList });
      }
    });

    return map;
  }, [date, turno, activeAulasList, activeBookings]);

  // Real-time conflict checks
  const detectedScheduleConflicts = useMemo(() => {
    const conflicts: { aula: Aula; room: string; booking: Booking }[] = [];
    activeSchedule.forEach((s) => {
      const b = isRoomOccupiedOnAula(s.aula, s.classroom);
      if (b) {
        conflicts.push({ aula: s.aula, room: s.classroom, booking: b });
      }
    });
    return conflicts;
  }, [activeSchedule, isRoomOccupiedOnAula]);

  const detectedResourceConflicts = useMemo(() => {
    const conflicts: {
      resourceId: string;
      resourceName: string;
      occupiedAulas: string[];
      booking: Booking;
    }[] = [];
    selectedResourceIds.forEach((resId) => {
      const info = resourceConflictInfo.get(resId);
      if (info) {
        const resource = SCHOOL_RESOURCES.find((r) => r.id === resId);
        conflicts.push({
          resourceId: resId,
          resourceName: resource?.name || resId,
          occupiedAulas: info.occupiedAulas,
          booking: info.conflictingBookings[0],
        });
      }
    });
    return conflicts;
  }, [selectedResourceIds, resourceConflictInfo]);

  const hasAnyConflict =
    detectedScheduleConflicts.length > 0 || detectedResourceConflicts.length > 0;

  // Auto-deselect conflicting resources if schedule changes
  useEffect(() => {
    setSelectedResourceIds((prev) => {
      const stillFree = prev.filter((id) => !resourceConflictInfo.has(id));
      if (stillFree.length !== prev.length) {
        const removedNames = prev
          .filter((id) => resourceConflictInfo.has(id))
          .map((id) => SCHOOL_RESOURCES.find((r) => r.id === id)?.name || id)
          .join(', ');
        setErrorMessage(
          `O item "${removedNames}" já está reservado nas aulas selecionadas e foi desmarcado automaticamente.`
        );
      }
      return stillFree;
    });
  }, [resourceConflictInfo]);

  const handleToggleResource = (resource: BookingResource) => {
    setErrorMessage(null);

    const conflict = resourceConflictInfo.get(resource.id);
    if (conflict) {
      const bookedTeacher = conflict.conflictingBookings[0];
      setErrorMessage(
        `"${resource.name}" já está reservado na ${conflict.occupiedAulas.join(', ')} por ${bookedTeacher?.teacherName} (${bookedTeacher?.curriculumComponent}).`
      );
      return;
    }

    if (!isMultiSelectEnabled) {
      if (selectedResourceIds.length === 1 && selectedResourceIds[0] === resource.id) {
        setSelectedResourceIds([]);
      } else {
        setSelectedResourceIds([resource.id]);
      }
      return;
    }

    if (selectedResourceIds.includes(resource.id)) {
      setSelectedResourceIds((prev) => prev.filter((id) => id !== resource.id));
    } else {
      setSelectedResourceIds((prev) => [...prev, resource.id]);
    }
  };

  const handleToggleAula = (aula: Aula) => {
    setErrorMessage(null);
    setAulaActiveMap((prev) => ({
      ...prev,
      [aula]: !prev[aula],
    }));
  };

  const handleSetRoomForAula = (aula: Aula, room: string) => {
    setErrorMessage(null);
    const occupied = isRoomOccupiedOnAula(aula, room);
    if (occupied) {
      setErrorMessage(
        `A Sala ${room} já está ocupada na ${aula} por ${occupied.teacherName}. Escolha outra sala.`
      );
      return;
    }

    setAulaRoomMap((prev) => ({
      ...prev,
      [aula]: room,
    }));
  };

  const handleReplicateRoomToAll = () => {
    const firstActive = activeSchedule[0];
    if (!firstActive) return;
    const roomToCopy = firstActive.classroom;

    setAulaRoomMap((prev) => {
      const next = { ...prev };
      AULAS_LIST.forEach((aula) => {
        if (aulaActiveMap[aula] && !isRoomOccupiedOnAula(aula, roomToCopy)) {
          next[aula] = roomToCopy;
        }
      });
      return next;
    });
  };

  const filteredResources = useMemo(() => {
    if (categoryFilter === 'all') return SCHOOL_RESOURCES;
    return SCHOOL_RESOURCES.filter((r) => r.type === categoryFilter);
  }, [categoryFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Apenas professores logados podem realizar agendamentos.');
      onOpenAuth?.('login');
      return;
    }

    if (!teacherName.trim()) {
      setErrorMessage('Informe o nome do professor(a).');
      return;
    }
    if (!curriculumComponent.trim()) {
      setErrorMessage('Informe a disciplina.');
      return;
    }
    if (!date) {
      setErrorMessage('Selecione a data.');
      return;
    }
    if (activeSchedule.length === 0) {
      setErrorMessage('Selecione pelo menos uma aula.');
      return;
    }
    if (selectedResourceIds.length === 0) {
      setErrorMessage('Selecione pelo menos um equipamento ou ambiente.');
      return;
    }
    if (hasAnyConflict) {
      setErrorMessage('Resolva os conflitos destacados antes de confirmar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = createScheduleBatchBooking({
        resourceIds: selectedResourceIds,
        date,
        turno,
        schedule: activeSchedule,
        teacherName: teacherName.trim(),
        curriculumComponent: curriculumComponent.trim(),
        notes: notes.trim(),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Não foi possível concluir o agendamento.');
        return;
      }

      if (result.createdBookings && result.createdBookings.length > 0) {
        setSelectedResourceIds([]);
        setNotes('');
        setShowNotes(false);
        onBookingSuccess(result.createdBookings);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedResourceIds([]);
    setAulaActiveMap({
      '1ª Aula': true,
      '2ª Aula': false,
      '3ª Aula': false,
      '4ª Aula': false,
      '5ª Aula': false,
    });
    setNotes('');
    setShowNotes(false);
    setErrorMessage(null);
  };

  const handleQuickGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      onOpenAuth?.('login');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Verificando seu acesso...</p>
        </div>
      </div>
    );
  }

  // AUTH GATE: Only logged-in users can schedule
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-14 px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-indigo-200">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Login obrigatório para agendar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Para evitar reservas indevidas e identificar o professor responsável, apenas usuários logados podem fazer agendamentos.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => onOpenAuth?.('login')}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar com E-mail e Senha</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth?.('register')}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Conta de Professor</span>
            </button>

            <div className="py-1 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">ou</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleQuickGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{googleLoading ? 'Conectando...' : 'Continuar com Google'}</span>
            </button>
          </div>

          {onViewBoard && (
            <button
              type="button"
              onClick={onViewBoard}
              className="mt-6 pt-4 border-t border-slate-100 w-full text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Apenas consultar o Quadro Geral do Dia</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const selectedResourceObjects = SCHOOL_RESOURCES.filter((r) =>
    selectedResourceIds.includes(r.id)
  );

  const canSubmit =
    !isSubmitting &&
    selectedResourceIds.length > 0 &&
    activeSchedule.length > 0 &&
    Boolean(teacherName.trim()) &&
    Boolean(curriculumComponent.trim()) &&
    !hasAnyConflict;

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      {errorMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-950 px-2 py-1 rounded-lg bg-rose-100 cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pb-24 md:pb-6">
        {/* BLOCO 1: PROFESSOR, DISCIPLINA, DIA E TURNO */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
          {/* Row 1: Professor & Disciplina */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Professor(a) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-semibold text-slate-900 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Disciplina <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  list="disciplinas-sugeridas"
                  required
                  value={curriculumComponent}
                  onChange={(e) => setCurriculumComponent(e.target.value)}
                  placeholder="Ex: Matemática, Ciências..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-semibold text-slate-900 text-sm transition-all"
                />
                <datalist id="disciplinas-sugeridas">
                  {SUGGESTED_COMPONENTS.map((comp) => (
                    <option key={comp} value={comp} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Row 2: Dia & Turno */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-3 border-t border-slate-100">
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Dia da Reserva <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                    date === today
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setDate(tomorrow)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                    date === tomorrow
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Amanhã
                </button>
                <div className="relative flex-1 min-w-[130px]">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-semibold text-slate-800 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Turno <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['matutino', 'vespertino', 'noturno'] as Turno[]).map((tKey) => {
                  const cfg = TURNO_CONFIG[tKey];
                  const isSelected = turno === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTurno(tKey)}
                      className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-extrabold block">
                        {cfg.icon === 'Sun' ? '☀️' : cfg.icon === 'Sunset' ? '🌤️' : '🌙'} {cfg.subLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                        {cfg.period}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* BLOCO 2: AULAS E SALAS (ULTRA SIMPLES) */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-600" />
                Quais aulas e salas?
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {activeSchedule.length > 1 && (
                <button
                  type="button"
                  onClick={handleReplicateRoomToAll}
                  className="text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Mesma sala nas demais</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const allSelected = AULAS_LIST.every((a) => aulaActiveMap[a]);
                  const next = {} as Record<Aula, boolean>;
                  AULAS_LIST.forEach((a, idx) => {
                    next[a] = allSelected ? idx === 0 : true;
                  });
                  setAulaActiveMap(next);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                {AULAS_LIST.every((a) => aulaActiveMap[a]) ? 'Só 1ª Aula' : 'Todas'}
              </button>
            </div>
          </div>

          {/* 5 compact Aula toggles */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {AULAS_LIST.map((aula) => {
              const isActive = aulaActiveMap[aula];
              const time = AULA_SCHEDULE_BY_TURNO[turno][aula].split(' - ')[0];
              return (
                <button
                  key={aula}
                  type="button"
                  onClick={() => handleToggleAula(aula)}
                  className={`py-2 px-1 sm:px-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isActive
                      ? 'border-violet-600 bg-violet-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black block leading-tight">
                    {aula.replace(' Aula', 'ª')}
                  </span>
                  <span
                    className={`text-[10px] block ${
                      isActive ? 'text-violet-100' : 'text-slate-400'
                    }`}
                  >
                    {time}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Room selector ONLY for active aulas */}
          {activeSchedule.length > 0 ? (
            <div className="space-y-2 pt-1">
              {activeSchedule.map((item) => {
                const scheduleTime = AULA_SCHEDULE_BY_TURNO[turno][item.aula];
                return (
                  <div
                    key={item.aula}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-violet-50/50 border border-violet-200/80"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs sm:text-sm text-violet-950">
                        {item.aula}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({scheduleTime})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 mr-0.5">Sala:</span>
                      {validRooms.map((room) => {
                        const isRoomSelected = item.classroom === room;
                        const occupied = isRoomOccupiedOnAula(item.aula, room);
                        return (
                          <button
                            key={room}
                            type="button"
                            disabled={!!occupied}
                            onClick={() => handleSetRoomForAula(item.aula, room)}
                            title={
                              occupied
                                ? `Ocupada por ${occupied.teacherName}`
                                : `Selecionar Sala ${room}`
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                              occupied
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 opacity-80 cursor-not-allowed'
                                : isRoomSelected
                                ? 'bg-violet-600 text-white shadow-xs cursor-pointer'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300 cursor-pointer'
                            }`}
                          >
                            <span>{room}</span>
                            {occupied && <Lock className="w-3 h-3 text-rose-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs font-semibold text-rose-600 py-1">
              Marque pelo menos uma aula acima para escolher a sala.
            </p>
          )}
        </section>

        {/* BLOCO 3: EQUIPAMENTO OU AMBIENTE */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Qual equipamento ou ambiente?
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('equipamento')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    categoryFilter === 'equipamento'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Equipamentos
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ambiente')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    categoryFilter === 'ambiente'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ambientes
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const nextState = !isMultiSelectEnabled;
                  setIsMultiSelectEnabled(nextState);
                  if (!nextState && selectedResourceIds.length > 1) {
                    setSelectedResourceIds([selectedResourceIds[0]]);
                  }
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  isMultiSelectEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isMultiSelectEnabled ? '✓ Vários itens' : '+ Vários itens'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredResources.map((resource) => {
              const isSelected = selectedResourceIds.includes(resource.id);
              const conflict = resourceConflictInfo.get(resource.id);
              const hasConflict = !!conflict;

              return (
                <button
                  key={resource.id}
                  type="button"
                  onClick={() => handleToggleResource(resource)}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-start gap-2 text-left ${
                    hasConflict
                      ? 'border-rose-300 bg-rose-50/70 cursor-not-allowed opacity-90'
                      : isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-sm cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer'
                  }`}
                >
                  <div className="w-full flex items-center justify-between">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${
                        hasConflict
                          ? 'bg-rose-600'
                          : isSelected
                          ? 'bg-emerald-600'
                          : resource.type === 'equipamento'
                          ? 'bg-indigo-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <ResourceIcon iconName={resource.iconName} className="w-4 h-4" />
                    </div>

                    {hasConflict ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-200 text-rose-900 font-bold text-[10px]">
                        <Lock className="w-3 h-3" />
                        Ocupado
                      </span>
                    ) : isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        Livre
                      </span>
                    )}
                  </div>

                  <div className="w-full min-w-0">
                    <p className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate">
                      {resource.name}
                    </p>
                    {hasConflict ? (
                      <p className="text-[10px] text-rose-700 font-semibold truncate mt-0.5">
                        {conflict.occupiedAulas.join(', ')} • {conflict.conflictingBookings[0]?.teacherName}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {resource.category}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional notes toggle */}
          <div className="pt-1">
            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Adicionar observação (opcional)</span>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Observação (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotes(false);
                      setNotes('');
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    Ocultar
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Algum aviso para coordenação ou apoio..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden font-medium text-slate-900 text-xs sm:text-sm resize-none"
                />
              </div>
            )}
          </div>
        </section>

        {/* CONFLICT ALERT (Only shown if conflict exists) */}
        {hasAnyConflict && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 text-rose-950 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-black text-sm text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Conflito de horário detectado</span>
            </div>
            {detectedScheduleConflicts.map((c, i) => (
              <p key={`sc-${i}`}>
                • <strong>{c.aula} (Sala {c.room})</strong>: ocupada por {c.booking.teacherName}. Escolha outra sala.
              </p>
            ))}
            {detectedResourceConflicts.map((c, i) => (
              <p key={`rc-${i}`}>
                • <strong>{c.resourceName}</strong>: reservado na {c.occupiedAulas.join(', ')} por {c.booking.teacherName}.
              </p>
            ))}
          </div>
        )}

        {/* CLEAN DESKTOP SUBMIT BAR */}
        <div className="hidden md:flex items-center justify-between gap-4 bg-white rounded-3xl p-4 sm:px-6 border border-slate-200 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 truncate">
              {selectedResourceObjects.length > 0
                ? selectedResourceObjects.map((r) => r.name).join(' + ')
                : 'Selecione um item acima'}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {formatDateDisplay(date)} ({TURNO_CONFIG[turno].subLabel}) •{' '}
              {activeSchedule.length > 0
                ? activeSchedule.map((s) => `${s.aula} (Sala ${s.classroom})`).join(', ')
                : 'Nenhuma aula selecionada'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer ${
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* STICKY MOBILE SUBMIT BAR */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate">
                {hasAnyConflict
                  ? 'Conflito de horário'
                  : selectedResourceObjects.length > 0
                  ? selectedResourceObjects.map((r) => r.name).join(' + ')
                  : 'Selecione um item'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {activeSchedule.map((s) => `${s.aula.replace(' Aula', 'ª')} (${s.classroom})`).join(', ') ||
                  'Nenhuma aula'}
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 shrink-0 cursor-pointer ${
                canSubmit
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar'}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
