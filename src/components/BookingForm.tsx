import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  MapPin,
  User,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Clock,
  Check,
  Copy,
  Zap,
  ShieldCheck,
  Lock,
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
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onBookingSuccess,
  preselectedDate,
  preselectedTurno,
  preselectedResourceId,
}) => {
  const { user } = useAuth();
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  // Form State
  const [teacherName, setTeacherName] = useState('');
  const [curriculumComponent, setCurriculumComponent] = useState('');
  const [date, setDate] = useState<string>(preselectedDate || today);
  const [turno, setTurno] = useState<Turno>(preselectedTurno || 'matutino');

  // Selected Resources (multi-select)
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    preselectedResourceId ? [preselectedResourceId] : []
  );

  // Linked Schedule State: Mapping each aula to an active state and a chosen classroom
  // Default: 1ª Aula in first room of turno
  const [aulaActiveMap, setAulaActiveMap] = useState<Record<Aula, boolean>>({
    '1ª Aula': true,
    '2ª Aula': false,
    '3ª Aula': false,
    '4ª Aula': true,
    '5ª Aula': false,
  });

  const [aulaRoomMap, setAulaRoomMap] = useState<Record<Aula, string>>({
    '1ª Aula': '13.01',
    '2ª Aula': '13.01',
    '3ª Aula': '23.01',
    '4ª Aula': '34.01',
    '5ª Aula': '34.01',
  });

  const [notes, setNotes] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ItemType>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMultiSelectEnabled, setIsMultiSelectEnabled] = useState(false);

  // Valid rooms for current shift
  const validRooms = useMemo(() => CLASSROOMS_BY_TURNO[turno] || [], [turno]);

  // Conflict calculation for rooms per aula (defined with useCallback for safety and reactivity)
  const isRoomOccupiedOnAula = useCallback(
    (aula: Aula, room: string): Booking | null => {
      const occupiedMap = getOccupiedAulasForClassroom(room, date, turno);
      return occupiedMap.get(aula) || null;
    },
    [date, turno, activeBookings]
  );

  // When shift, date, or bookings change, ensure default rooms match shift rooms and pick a FREE room
  useEffect(() => {
    if (validRooms.length > 0) {
      setAulaRoomMap((prev) => {
        const next = { ...prev };
        let changed = false;

        AULAS_LIST.forEach((aula) => {
          const currentRoom = next[aula];
          const occupied = isRoomOccupiedOnAula(aula, currentRoom);

          // If room is not in this shift or is currently occupied on this aula, find a free room!
          if (!validRooms.includes(currentRoom) || occupied) {
            // Find first room in this shift that is FREE on this aula
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
      if (!curriculumComponent && savedProfile.component)
        setCurriculumComponent(savedProfile.component);
    }

    window.addEventListener('escola_bookings_updated', refresh);
    return () => window.removeEventListener('escola_bookings_updated', refresh);
  }, []);

  // Auto pre-fill teacher name if logged in
  useEffect(() => {
    if (user?.displayName && !teacherName) {
      setTeacherName(user.displayName);
    }
  }, [user]);

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

  // Select resource with STRICT CONFLICT ZERO PREVENTION
  const handleToggleResource = (resource: BookingResource) => {
    setErrorMessage(null);

    // Single-select mode (default): Clicking switches directly to this item
    if (!isMultiSelectEnabled) {
      if (selectedResourceIds.length === 1 && selectedResourceIds[0] === resource.id) {
        setSelectedResourceIds([]);
        return;
      }

      // Check conflict
      const conflict = resourceConflictInfo.get(resource.id);
      if (conflict) {
        const bookedTeacher = conflict.conflictingBookings[0];
        setErrorMessage(
          `🚫 CONFLITO ZERO: O item "${resource.name}" NÃO PODE ser agendado porque já está reservado na ${conflict.occupiedAulas.join(', ')} por ${bookedTeacher?.teacherName} (${bookedTeacher?.curriculumComponent} - Salas ${bookedTeacher?.classrooms?.join(', ') || bookedTeacher?.classroom}). Desmarque essa aula ou escolha outro equipamento livre.`
        );
        return;
      }

      setSelectedResourceIds([resource.id]);
      return;
    }

    // Multi-select mode (when explicitly enabled)
    if (selectedResourceIds.includes(resource.id)) {
      setSelectedResourceIds((prev) => prev.filter((id) => id !== resource.id));
      return;
    }

    // Check conflict
    const conflict = resourceConflictInfo.get(resource.id);
    if (conflict) {
      const bookedTeacher = conflict.conflictingBookings[0];
      setErrorMessage(
        `🚫 CONFLITO ZERO: O item "${resource.name}" NÃO PODE ser agendado porque já está reservado na ${conflict.occupiedAulas.join(', ')} por ${bookedTeacher?.teacherName} (${bookedTeacher?.curriculumComponent} - Salas ${bookedTeacher?.classrooms?.join(', ') || bookedTeacher?.classroom}). Desmarque essa aula ou escolha outro equipamento livre.`
      );
      return;
    }

    setSelectedResourceIds((prev) => [...prev, resource.id]);
  };

  // Toggle an aula on/off
  const handleToggleAula = (aula: Aula) => {
    setErrorMessage(null);
    setAulaActiveMap((prev) => ({
      ...prev,
      [aula]: !prev[aula],
    }));
  };

  // Change room for a specific aula with STRICT CONFLICT ZERO PREVENTION
  const handleSetRoomForAula = (aula: Aula, room: string) => {
    setErrorMessage(null);
    const occupied = isRoomOccupiedOnAula(aula, room);

    if (occupied) {
      setErrorMessage(
        `🚫 CONFLITO ZERO: A Sala ${room} já está ocupada na ${aula}. Por favor, escolha outra sala livre.`
      );
      return;
    }

    setAulaRoomMap((prev) => ({
      ...prev,
      [aula]: room,
    }));

    if (!aulaActiveMap[aula]) {
      setAulaActiveMap((prev) => ({
        ...prev,
        [aula]: true,
      }));
    }
  };

  // Quick Action: Replicate first active room to all active aulas
  const handleReplicateRoomToAll = () => {
    const firstActive = activeSchedule[0];
    if (!firstActive) return;
    const roomToCopy = firstActive.classroom;

    setAulaRoomMap((prev) => {
      const next = { ...prev };
      AULAS_LIST.forEach((aula) => {
        if (aulaActiveMap[aula]) {
          next[aula] = roomToCopy;
        }
      });
      return next;
    });
  };

  // Quick Action: User Example preset
  const handleApplyUserExample = () => {
    if (turno !== 'matutino') {
      setTurno('matutino');
    }
    setAulaActiveMap({
      '1ª Aula': true,
      '2ª Aula': false,
      '3ª Aula': false,
      '4ª Aula': true,
      '5ª Aula': false,
    });
    setAulaRoomMap((prev) => ({
      ...prev,
      '1ª Aula': '13.01',
      '4ª Aula': '34.01',
    }));
  };

  // Quick Action: Select all 5 aulas
  const handleSelectAllAulas = () => {
    const allOn: Record<Aula, boolean> = {
      '1ª Aula': true,
      '2ª Aula': true,
      '3ª Aula': true,
      '4ª Aula': true,
      '5ª Aula': true,
    };
    setAulaActiveMap(allOn);
  };

  // Quick Action: Clear all aulas
  const handleClearAllAulas = () => {
    const allOff: Record<Aula, boolean> = {
      '1ª Aula': false,
      '2ª Aula': false,
      '3ª Aula': false,
      '4ª Aula': false,
      '5ª Aula': false,
    };
    setAulaActiveMap(allOff);
  };

  // Filtered resources list
  const filteredResources = useMemo(() => {
    if (categoryFilter === 'all') return SCHOOL_RESOURCES;
    return SCHOOL_RESOURCES.filter((r) => r.type === categoryFilter);
  }, [categoryFilter]);

  // Conflict calculation for resources based on active schedule aulas
  const activeAulasList = useMemo(
    () => activeSchedule.map((s) => s.aula),
    [activeSchedule]
  );

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

  // Real-time conflict inspection across the entire active schedule (zero conflict assurance)
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

  // Real-time conflict inspection for selected resources
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

  // Auto-deselect any selected resources that conflict when schedule or date changes
  useEffect(() => {
    setSelectedResourceIds((prev) => {
      const stillFree = prev.filter((id) => !resourceConflictInfo.has(id));
      if (stillFree.length !== prev.length) {
        const removedIds = prev.filter((id) => resourceConflictInfo.has(id));
        const removedNames = removedIds
          .map((id) => SCHOOL_RESOURCES.find((r) => r.id === id)?.name || id)
          .join(', ');
        setErrorMessage(
          `ℹ️ CONFLITO ZERO: O item "${removedNames}" já estava agendado nas aulas ativadas e foi desmarcado automaticamente para manter sua grade 100% livre de conflitos.`
        );
      }
      return stillFree;
    });
  }, [resourceConflictInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    // Validation
    if (!teacherName.trim()) {
      setErrorMessage('Por favor, digite o Nome do Professor.');
      return;
    }
    if (!curriculumComponent.trim()) {
      setErrorMessage('Por favor, digite a Componente Curricular (Disciplina).');
      return;
    }
    if (!date) {
      setErrorMessage('Por favor, selecione a Data do agendamento.');
      return;
    }
    if (!turno) {
      setErrorMessage('Por favor, selecione o Turno.');
      return;
    }
    if (activeSchedule.length === 0) {
      setErrorMessage('Por favor, ative pelo menos uma Aula e selecione a Sala de Aula correspondente.');
      return;
    }
    if (selectedResourceIds.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos um Equipamento ou Ambiente.');
      return;
    }

    // STRICT ZERO CONFLICT CHECK
    if (hasAnyConflict) {
      setErrorMessage(
        '🚫 CONFLITO ZERO: Existem salas ou equipamentos ocupados selecionados. Por favor, ajuste as salas ou itens em conflito antes de confirmar.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit batch booking with linked schedule
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
      '4ª Aula': true,
      '5ª Aula': false,
    });
    setNotes('');
    setErrorMessage(null);
  };

  // Selected resources objects
  const selectedResourceObjects = SCHOOL_RESOURCES.filter((r) =>
    selectedResourceIds.includes(r.id)
  );

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      {/* Intro Header */}
      <div className="text-center mb-6 sm:mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Agendamento com Aula Atrelada à Sala
        </span>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Agendar Itens por Aula e Turma
        </h2>
        <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          Escolha exatamente em qual sala você estará em cada aula (ex: <strong>1ª Aula na Sala 13.01</strong> e <strong>4ª Aula na Sala 34.01</strong>).
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs animate-shake">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-rose-950">Atenção ao agendar</h4>
            <p className="text-xs sm:text-sm mt-0.5 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-rose-700 hover:text-rose-950 px-2.5 py-1 bg-rose-100 rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 pb-24 md:pb-8">
        {/* PASSO 1: DADOS DO PROFESSOR */}
        <section className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-200 shrink-0">
              1
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Quem é você?
              </h3>
              <p className="text-xs text-slate-500">
                Digite seu nome e o componente curricular da sua aula.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nome do Professor(a) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Ex: Prof. Carlos Silva"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden font-medium text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Componente Curricular (Disciplina) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={curriculumComponent}
                onChange={(e) => setCurriculumComponent(e.target.value)}
                placeholder="Ex: Matemática, Português, Ciências..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden font-medium text-slate-900 placeholder:text-slate-400 text-sm sm:text-base transition-all"
              />

              <div className="mt-2.5 flex items-center flex-wrap gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Atalhos:
                </span>
                {SUGGESTED_COMPONENTS.slice(0, 7).map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setCurriculumComponent(comp)}
                    className={`text-xs px-2.5 py-1 rounded-xl transition-all font-medium cursor-pointer ${
                      curriculumComponent.toLowerCase() === comp.toLowerCase()
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PASSO 2: DATA E TURNO */}
        <section className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-amber-200 shrink-0">
              2
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-500" />
                Qual o Dia e Turno?
              </h3>
              <p className="text-xs text-slate-500">
                Selecione o dia e o turno que você irá lecionar.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-5 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Data da Reserva <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  className={`px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    date === today
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-normal text-slate-500">Hoje</span>
                  <span>{formatDateDisplay(today)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDate(tomorrow)}
                  className={`px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all flex flex-col items-center justify-center cursor-pointer ${
                    date === tomorrow
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-normal text-slate-500">Amanhã</span>
                  <span>{formatDateDisplay(tomorrow)}</span>
                </button>
              </div>

              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden font-semibold text-slate-900 text-sm transition-all"
              />
            </div>

            <div className="md:col-span-7 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Turno da Aula <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['matutino', 'vespertino', 'noturno'] as Turno[]).map((tKey) => {
                  const cfg = TURNO_CONFIG[tKey];
                  const isSelected = turno === tKey;

                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTurno(tKey)}
                      className={`p-3 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? `border-indigo-600 bg-indigo-50/90 shadow-md shadow-indigo-100 ring-2 ring-indigo-600/20`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl">{cfg.icon === 'Sun' ? '☀️' : cfg.icon === 'Sunset' ? '🌤️' : '🌙'}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 fill-indigo-100" />
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                          {cfg.label}
                        </p>
                        <p className="text-xs font-semibold text-indigo-700">
                          {cfg.subLabel}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {cfg.period}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* PASSO 3: GRADE DE AULAS ATRELADAS ÀS SALAS DE AULA */}
        <section className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-violet-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-violet-200 shrink-0">
                3
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-violet-600" />
                  Qual Sala em cada Aula?
                </h3>
                <p className="text-xs text-slate-500">
                  Marque as aulas que você terá e toque na sala onde você estará em cada uma.
                </p>
              </div>
            </div>

            {/* Quick Helper Actions */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleApplyUserExample}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                <span>Exemplo: 1ª (13.01) + 4ª (34.01)</span>
              </button>

              <button
                type="button"
                onClick={handleReplicateRoomToAll}
                disabled={activeSchedule.length === 0}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Repetir mesma sala</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllAulas}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Todas as 5 Aulas
              </button>

              <button
                type="button"
                onClick={handleClearAllAulas}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Cards for each Aula with Room Selection */}
          <div className="space-y-3">
            {AULAS_LIST.map((aula) => {
              const isActive = aulaActiveMap[aula];
              const selectedRoom = aulaRoomMap[aula] || validRooms[0];
              const scheduleTime = AULA_SCHEDULE_BY_TURNO[turno][aula];

              return (
                <div
                  key={aula}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isActive
                      ? 'border-violet-500 bg-violet-50/50 shadow-xs ring-1 ring-violet-500/20'
                      : 'border-slate-200 bg-slate-50/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Left: Aula toggle & Period */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAula(aula)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                          : 'bg-white border-slate-300 text-transparent hover:border-violet-400'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-slate-900">
                          {aula}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                          {scheduleTime}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {isActive ? 'Aula ativada para uso do item' : 'Toque para ativar'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Room Buttons for this Aula */}
                  {isActive ? (
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-violet-900 mr-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-violet-600" />
                          Sala:
                        </span>

                        {validRooms.map((room) => {
                          const isRoomSelected = selectedRoom === room;
                          const occupied = isRoomOccupiedOnAula(aula, room);

                          return (
                            <button
                              key={room}
                              type="button"
                              disabled={!!occupied}
                              onClick={() => handleSetRoomForAula(aula, room)}
                              title={
                                occupied
                                  ? `🚫 Sala ${room} ocupada nesta ${aula}`
                                  : `Selecionar Sala ${room} para ${aula}`
                              }
                              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
                                occupied
                                  ? 'bg-rose-50 text-rose-800 border-2 border-rose-300 opacity-90 cursor-not-allowed shadow-none'
                                  : isRoomSelected
                                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200 ring-2 ring-violet-400 cursor-pointer'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 cursor-pointer'
                              }`}
                            >
                              <span>{room}</span>
                              {occupied ? (
                                <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              ) : isRoomSelected ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Aula desativada
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Schedule Overview Pills */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Grade configurada:</span>
            {activeSchedule.length > 0 ? (
              activeSchedule.map((s) => (
                <span
                  key={s.aula}
                  className="px-2.5 py-1 rounded-xl bg-violet-100 text-violet-950 font-bold text-xs border border-violet-200 flex items-center gap-1"
                >
                  <span>{s.aula}</span>
                  <span className="text-violet-400">➔</span>
                  <span className="text-violet-700">Sala {s.classroom}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-rose-500 font-bold">
                Nenhuma aula ativada. Ative pelo menos uma aula acima!
              </span>
            )}
          </div>
        </section>

        {/* PASSO 4: QUAIS EQUIPAMENTOS OU AMBIENTES? (MULTI-SELEÇÃO) */}
        <section className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-emerald-200 shrink-0">
                4
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Qual Equipamento ou Ambiente?
                </h3>
                <p className="text-xs text-slate-500">
                  {isMultiSelectEnabled
                    ? 'Multi-seleção ativa: toque nos itens que deseja reservar juntos.'
                    : 'Toque para escolher o item desejado (seleção única).'}
                </p>
              </div>
            </div>

            {/* Category filter tabs, multi-select toggle & count */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Multi-select toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextState = !isMultiSelectEnabled;
                  setIsMultiSelectEnabled(nextState);
                  if (!nextState && selectedResourceIds.length > 1) {
                    setSelectedResourceIds([selectedResourceIds[0]]);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isMultiSelectEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{isMultiSelectEnabled ? '✓ Multi-seleção Ativada' : '➕ Selecionar Vários Itens'}</span>
              </button>

              <div className="flex items-center p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({SCHOOL_RESOURCES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('equipamento')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    categoryFilter === 'equipamento'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  💻 Equipamentos (4)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ambiente')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    categoryFilter === 'ambiente'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏫 Ambientes (3)
                </button>
              </div>

              {selectedResourceIds.length > 0 && (
                <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {selectedResourceIds.length} selecionado(s)
                </span>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredResources.map((resource) => {
              const isSelected = selectedResourceIds.includes(resource.id);
              const conflict = resourceConflictInfo.get(resource.id);
              const hasConflict = !!conflict;

              return (
                <div
                  key={resource.id}
                  onClick={() => {
                    if (hasConflict) {
                      const bookedTeacher = conflict.conflictingBookings[0];
                      setErrorMessage(
                        `🚫 CONFLITO ZERO: O item "${resource.name}" NÃO PODE ser agendado pois já está reservado na(s) ${conflict.occupiedAulas.join(', ')} por Prof. ${bookedTeacher?.teacherName} (${bookedTeacher?.curriculumComponent} - Sala ${bookedTeacher?.classrooms?.join(', ') || bookedTeacher?.classroom}). Escolha outro equipamento disponível.`
                      );
                    } else {
                      handleToggleResource(resource);
                    }
                  }}
                  className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col justify-between text-left ${
                    hasConflict
                      ? 'border-rose-400 bg-rose-50/85 cursor-not-allowed shadow-none opacity-95'
                      : isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 shadow-lg shadow-emerald-100/60 ring-2 ring-emerald-500/20 cursor-pointer'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:bg-slate-50/50 cursor-pointer'
                  }`}
                >
                  <div>
                    {/* Top Tag & Icon */}
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                          hasConflict
                            ? 'bg-rose-600 shadow-rose-200'
                            : isSelected
                            ? 'bg-emerald-600'
                            : resource.type === 'equipamento'
                            ? 'bg-indigo-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        <ResourceIcon iconName={resource.iconName} className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            resource.type === 'equipamento'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {resource.category}
                        </span>

                        {hasConflict ? (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-200 text-rose-950 font-black text-[10px] uppercase">
                            <Lock className="w-3 h-3 text-rose-700" />
                            <span>Ocupado</span>
                          </div>
                        ) : (
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <h4 className="font-extrabold text-base text-slate-900 leading-snug">
                      {resource.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {resource.description}
                    </p>
                  </div>

                  {/* Status indicator bottom */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {hasConflict ? (
                      <div className="p-2.5 rounded-2xl bg-rose-100/90 border border-rose-200 text-rose-950 text-xs font-medium space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-rose-900 text-[11px]">
                          <Lock className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                          <span>Bloqueado na(s): {conflict.occupiedAulas.join(', ')}</span>
                        </div>
                        <p className="text-[11px] text-rose-950 font-black truncate">
                          👤 Prof. {conflict.conflictingBookings[0]?.teacherName}
                        </p>
                        <p className="text-[10px] text-rose-800 font-semibold truncate">
                          📚 {conflict.conflictingBookings[0]?.curriculumComponent} • Sala {conflict.conflictingBookings[0]?.classrooms?.join(', ') || conflict.conflictingBookings[0]?.classroom}
                        </p>
                      </div>
                    ) : isSelected ? (
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-100 py-1.5 px-3 rounded-xl">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          Selecionado
                        </span>
                        <span className="text-[11px] uppercase tracking-wider font-extrabold">PRONTO</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 py-1 px-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Livre para agendar
                        </span>
                        <span className="text-slate-400 text-[11px]">Toque para marcar</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PASSO 5: OBSERVAÇÕES OPCIONAIS */}
        <section className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-700 text-white font-black flex items-center justify-center text-sm shadow-md shadow-slate-200 shrink-0">
              5
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Observações ou Avisos (Opcional)
              </h3>
              <p className="text-xs text-slate-500">
                Informações para os coordenadores ou apoio pedagógico.
              </p>
            </div>
          </div>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Digite qualquer detalhe importante para a equipe escolar..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 outline-hidden font-medium text-slate-900 placeholder:text-slate-400 text-sm transition-all resize-none"
          />
        </section>

        {/* PAINEL DE VERIFICAÇÃO CONFLITO ZERO */}
        {hasAnyConflict ? (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-3xl p-4 sm:p-6 shadow-md text-rose-950">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-base sm:text-lg text-rose-950">
                    Conflito Detectado — Agendamento Bloqueado
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[11px] font-black uppercase">
                    Conflito Zero Ativo
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-1 font-medium">
                  Para garantir que nenhum professor fique sem sala ou equipamento, altere os itens ou salas em conflito antes de confirmar:
                </p>

                <div className="mt-3 space-y-2">
                  {detectedScheduleConflicts.map((c, i) => (
                    <div
                      key={`sc-${i}`}
                      className="text-xs bg-white/90 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 shadow-2xs"
                    >
                      <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="font-bold text-rose-950">{c.aula}: </span>
                        A <strong className="text-rose-950 font-black">Sala {c.room}</strong> já está ocupada por{' '}
                        <strong className="text-rose-950 font-black">Prof. {c.booking.teacherName}</strong>{' '}
                        ({c.booking.curriculumComponent} com {c.booking.resourceName}).
                        <span className="block text-[11px] text-rose-700 mt-0.5 font-bold">
                          👉 Dica: Escolha outra sala livre na {c.aula} acima.
                        </span>
                      </div>
                    </div>
                  ))}

                  {detectedResourceConflicts.map((c, i) => (
                    <div
                      key={`rc-${i}`}
                      className="text-xs bg-white/90 border border-rose-200 rounded-xl px-3.5 py-2.5 flex items-start gap-2 shadow-2xs"
                    >
                      <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        <span className="font-bold text-rose-950">{c.resourceName}: </span>
                        Já reservado na(s) <strong className="text-rose-950 font-black">{c.occupiedAulas.join(', ')}</strong> por{' '}
                        <strong className="text-rose-950 font-black">Prof. {c.booking.teacherName}</strong>{' '}
                        ({c.booking.curriculumComponent} - Salas {c.booking.classrooms?.join(', ') || c.booking.classroom}).
                        <span className="block text-[11px] text-rose-700 mt-0.5 font-bold">
                          👉 Dica: Desmarque as aulas em que o item está em uso ou escolha outro equipamento livre.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-4 sm:p-5 shadow-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h5 className="font-black text-sm sm:text-base text-emerald-950 flex items-center gap-2">
                  <span>🛡️ Garantia de Conflito Zero</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                    100% Liberado
                  </span>
                </h5>
                <p className="text-xs text-emerald-800">
                  Todas as salas e equipamentos selecionados foram validados em tempo real e estão completamente livres.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-800 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 self-start sm:self-auto shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>0 Conflitos • Pronto para Agendar</span>
            </div>
          </div>
        )}

        {/* RESUMO E BOTÃO DE CONFIRMAR (Desktop Box) */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-5 sm:p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Resumo do Agendamento Atrelado
              </span>

              <h4 className="text-lg sm:text-2xl font-black text-white">
                {selectedResourceObjects.length > 0
                  ? selectedResourceObjects.map((r) => r.name).join(' + ')
                  : 'Selecione os equipamentos acima'}
              </h4>

              {/* Schedule detail pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm text-slate-200 font-medium">
                <span className="bg-white/10 px-3 py-1 rounded-xl">
                  📅 {formatDateDisplay(date)} ({TURNO_CONFIG[turno].label})
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-xl">
                  👤 {teacherName || 'Professor'} {curriculumComponent ? `(${curriculumComponent})` : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {activeSchedule.map((s) => (
                  <span
                    key={s.aula}
                    className="bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1"
                  >
                    <span>{s.aula}</span>
                    <span className="text-violet-400">➔</span>
                    <span>Sala {s.classroom}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-3.5 rounded-2xl border border-white/20 text-white hover:bg-white/10 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Limpar</span>
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedResourceIds.length === 0 ||
                  activeSchedule.length === 0 ||
                  !teacherName.trim() ||
                  !curriculumComponent.trim() ||
                  hasAnyConflict
                }
                className={`px-8 py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer ${
                  selectedResourceIds.length > 0 &&
                  activeSchedule.length > 0 &&
                  teacherName.trim() &&
                  curriculumComponent.trim() &&
                  !hasAnyConflict &&
                  !isSubmitting
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 scale-100 hover:scale-[1.02] active:scale-[0.98]'
                    : hasAnyConflict
                    ? 'bg-rose-950 text-rose-300 border border-rose-700 cursor-not-allowed opacity-90'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                {isSubmitting ? (
                  <span>GRAVANDO AGENDAMENTO...</span>
                ) : hasAnyConflict ? (
                  <>
                    <Lock className="w-5 h-5 text-rose-400" />
                    <span>RESOLVA OS CONFLITOS PARA AGENDAR</span>
                  </>
                ) : (
                  <>
                    <span>CONFIRMAR AGENDAMENTO</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* STICKY BOTTOM BAR FOR MOBILE PHONES */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate">
                {hasAnyConflict
                  ? '⚠️ Conflito Detectado!'
                  : selectedResourceIds.length > 0
                  ? `${selectedResourceIds.length} item(ns) em ${activeSchedule.length} aula(s)`
                  : 'Selecione itens e aulas'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {hasAnyConflict
                  ? 'Altere a sala ou equipamento ocupado'
                  : activeSchedule.map((s) => `${s.aula} (${s.classroom})`).join(', ') || 'Nenhuma aula'}
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                selectedResourceIds.length === 0 ||
                activeSchedule.length === 0 ||
                !teacherName.trim() ||
                !curriculumComponent.trim() ||
                hasAnyConflict
              }
              className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 ${
                selectedResourceIds.length > 0 &&
                activeSchedule.length > 0 &&
                teacherName.trim() &&
                curriculumComponent.trim() &&
                !hasAnyConflict &&
                !isSubmitting
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : hasAnyConflict
                  ? 'bg-rose-600 text-white shadow-rose-200 cursor-not-allowed'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : hasAnyConflict ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Conflito</span>
                </>
              ) : (
                <>
                  <span>Confirmar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
