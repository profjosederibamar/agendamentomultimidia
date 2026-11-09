import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle,
  Plus,
  Sparkles,
  Tv,
  Maximize2,
  Minimize2,
  Clock,
  Layers,
  Home,
} from 'lucide-react';
import { Turno, Booking, Aula } from '../types/booking';
import {
  SCHOOL_RESOURCES,
  CLASSROOMS_BY_TURNO,
  TURNO_CONFIG,
  AULAS_LIST,
  AULA_SCHEDULE_BY_TURNO,
} from '../constants/schoolData';
import {
  getTodayDateString,
  getTomorrowDateString,
  formatDateDisplay,
  getStoredBookings,
} from '../services/storageService';
import { ResourceIcon } from './ResourceIcon';

interface DayBoardViewProps {
  onQuickBook: (date: string, turno: Turno, resourceId: string) => void;
  onViewBooking: (booking: Booking) => void;
  onGoHome?: () => void;
}

export const DayBoardView: React.FC<DayBoardViewProps> = ({
  onQuickBook,
  onViewBooking,
  onGoHome,
}) => {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeShiftFilter, setActiveShiftFilter] = useState<'all' | Turno>('all');
  const [tvMode, setTvMode] = useState(false);

  const bookings = getStoredBookings();

  // Change date helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${dy}`);
  };

  // Day's bookings filter
  const dayBookings = useMemo(() => {
    return bookings.filter((b) => b.date === selectedDate);
  }, [bookings, selectedDate]);

  const shiftsToShow: Turno[] =
    activeShiftFilter === 'all'
      ? ['matutino', 'vespertino', 'noturno']
      : [activeShiftFilter];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className={`mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8 transition-all ${
        tvMode
          ? 'max-w-full bg-slate-950 text-white min-h-screen fixed inset-0 z-50 overflow-y-auto'
          : 'max-w-7xl'
      }`}
    >
      {/* Top Date & View Toolbar */}
      <div
        className={`rounded-3xl p-4 sm:p-6 border shadow-xs mb-6 sm:mb-8 ${
          tvMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-white border-slate-200/80 text-slate-900'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Mural Interativo
              </span>
              {tvMode && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-slate-950">
                  Modo TV Ativo
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Quadro de Equipamentos por Aula
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Acompanhe a disponibilidade da 1ª à 5ª aula em cada turno.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão INÍCIO com destaque */}
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer no-print"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>INÍCIO</span>
              </button>
            )}

            {/* TV Mode Toggle Button */}
            <button
              onClick={() => setTvMode(!tvMode)}
              className={`px-3 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                tvMode
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>{tvMode ? 'Sair do Modo TV' : 'Modo TV / Mural'}</span>
            </button>

            {/* Date Navigator */}
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                tvMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
            >
              <button
                onClick={handlePrevDay}
                title="Dia anterior"
                className="p-2 rounded-xl hover:bg-slate-700/50 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 font-bold text-sm">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <span>{formatDateDisplay(selectedDate)}</span>
                {selectedDate === today && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                    Hoje
                  </span>
                )}
                {selectedDate === tomorrow && (
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400">
                    Amanhã
                  </span>
                )}
              </div>

              <button
                onClick={handleNextDay}
                title="Próximo dia"
                className="p-2 rounded-xl hover:bg-slate-700/50 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Picker Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`px-3 py-2 rounded-2xl border text-xs font-semibold ${
                tvMode
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            />

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all no-print cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Turno Quick Filter Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-100/20 flex flex-wrap items-center gap-2 no-print">
          <span className="text-xs font-bold text-slate-400 mr-2">Filtrar Turno:</span>
          <button
            onClick={() => setActiveShiftFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeShiftFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-200/60 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Todos os 3 Turnos
          </button>
          <button
            onClick={() => setActiveShiftFilter('matutino')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeShiftFilter === 'matutino'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            }`}
          >
            ☀️ Matutino (Manhã)
          </button>
          <button
            onClick={() => setActiveShiftFilter('vespertino')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeShiftFilter === 'vespertino'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
            }`}
          >
            🌤️ Vespertino (Tarde)
          </button>
          <button
            onClick={() => setActiveShiftFilter('noturno')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeShiftFilter === 'noturno'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
            }`}
          >
            🌙 Noturno (Noite)
          </button>
        </div>
      </div>

      {/* Turno Sections */}
      <div className="space-y-6 sm:space-y-8">
        {shiftsToShow.map((turnoKey) => {
          const cfg = TURNO_CONFIG[turnoKey];
          const classrooms = CLASSROOMS_BY_TURNO[turnoKey] || [];
          const turnoBookings = dayBookings.filter((b) => b.turno === turnoKey);

          return (
            <div
              key={turnoKey}
              className={`rounded-3xl border shadow-xs overflow-hidden ${
                tvMode
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              {/* Header of the Turno */}
              <div
                className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                  tvMode
                    ? 'bg-slate-800/80 border-slate-700'
                    : `${cfg.bgClass} border-slate-200/80`
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {cfg.icon === 'Sun' ? '☀️' : cfg.icon === 'Sunset' ? '🌤️' : '🌙'}
                  </span>
                  <div>
                    <h3
                      className={`text-lg sm:text-xl font-black tracking-tight ${
                        tvMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Turno {cfg.label} ({cfg.subLabel})
                    </h3>
                    <p className={`text-xs font-medium ${tvMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cfg.period} • Salas ativas: {classrooms.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="text-xs font-bold">
                  <span
                    className={`px-3 py-1 rounded-full border ${
                      tvMode
                        ? 'bg-slate-700 text-slate-200 border-slate-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {turnoBookings.length} reserva(s) registradas
                  </span>
                </div>
              </div>

              {/* Items Availability Matrix by Aula */}
              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Equipamentos e Ambientes por Aula (1ª a 5ª)</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCHOOL_RESOURCES.map((resource) => {
                      // Find bookings for this resource in this shift
                      const resourceBookings = turnoBookings.filter(
                        (b) => b.resourceId === resource.id
                      );

                      return (
                        <div
                          key={resource.id}
                          className={`p-4 rounded-3xl border transition-all ${
                            tvMode
                              ? 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                              : 'bg-slate-50/70 border-slate-200/90 hover:border-indigo-200 hover:bg-slate-50'
                          }`}
                        >
                          {/* Resource Title & Action */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                                  resource.type === 'equipamento'
                                    ? 'bg-indigo-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                <ResourceIcon iconName={resource.iconName} className="w-5 h-5" />
                              </div>
                              <div>
                                <h5
                                  className={`font-black text-sm sm:text-base leading-tight ${
                                    tvMode ? 'text-white' : 'text-slate-900'
                                  }`}
                                >
                                  {resource.name}
                                </h5>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                  {resource.category}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => onQuickBook(selectedDate, turnoKey, resource.id)}
                              className="text-xs font-extrabold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer no-print shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agendar</span>
                            </button>
                          </div>

                          {/* 5 Aulas Timeline for this Resource */}
                          <div className="grid grid-cols-5 gap-1.5">
                            {AULAS_LIST.map((aula) => {
                              // Find if booked for this aula
                              const bookingForAula = resourceBookings.find((b) =>
                                (b.aulas || []).includes(aula)
                              );

                              // Resolve exact classroom for this specific aula from the linked schedule
                              const roomForThisAula =
                                bookingForAula?.schedule?.find((s) => s.aula === aula)?.classroom ||
                                bookingForAula?.classrooms?.[0] ||
                                bookingForAula?.classroom ||
                                '';

                              return (
                                <div
                                  key={aula}
                                  onClick={() =>
                                    bookingForAula && onViewBooking(bookingForAula)
                                  }
                                  className={`p-2 rounded-2xl border text-center flex flex-col justify-between min-h-[72px] transition-all ${
                                    bookingForAula
                                      ? 'border-rose-400/50 bg-rose-500/10 text-rose-300 cursor-pointer hover:bg-rose-500/20'
                                      : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                                  }`}
                                >
                                  <span className="text-[10px] font-bold block truncate">
                                    {aula.replace(' Aula', 'ª')}
                                  </span>

                                  {bookingForAula ? (
                                    <div className="my-auto">
                                      <span className="text-[9px] font-black uppercase text-rose-400 block truncate">
                                        Sala {roomForThisAula}
                                      </span>
                                      <span className="text-[9px] text-slate-400 block truncate">
                                        {bookingForAula.teacherName.split(' ')[0]}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="my-auto">
                                      <span className="text-[10px] font-bold text-emerald-500 block">
                                        LIVRE
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rooms Occupation Grid for this Shift */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <span>📍 Mapa das Salas ({turnoKey})</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    {classrooms.map((room) => {
                      const roomBookings = turnoBookings.filter((b) =>
                        (b.classrooms || [b.classroom]).includes(room)
                      );

                      return (
                        <div
                          key={room}
                          className={`p-3 rounded-2xl border text-center ${
                            roomBookings.length > 0
                              ? tvMode
                                ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-200'
                                : 'border-indigo-200 bg-indigo-50/80 text-indigo-900'
                              : tvMode
                              ? 'border-slate-800 bg-slate-800/40 text-slate-400'
                              : 'border-slate-200 bg-slate-50/50 text-slate-600'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Sala
                          </span>
                          <span className="text-lg font-black">{room}</span>

                          {roomBookings.length > 0 ? (
                            <div className="mt-1 space-y-1">
                              {roomBookings.map((rb) => (
                                <div
                                  key={rb.id}
                                  onClick={() => onViewBooking(rb)}
                                  className="text-[9px] p-1 rounded-lg bg-indigo-600 text-white truncate cursor-pointer hover:bg-indigo-500 shadow-2xs leading-tight"
                                  title={`Prof. ${rb.teacherName} (${rb.curriculumComponent}) - ${rb.resourceName}`}
                                >
                                  <div className="font-black truncate">👤 {rb.teacherName.split(' ')[0]}</div>
                                  <div className="text-[8px] opacity-90 truncate">{rb.resourceName} ({rb.aulas?.map((a) => a[0]).join(',')})</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1 text-[10px] text-slate-400 font-medium">
                              Livre
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
