import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  FileText,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  AlertTriangle,
  Download,
  Home,
} from 'lucide-react';
import { Booking, Turno, Aula } from '../types/booking';
import { TURNO_CONFIG, AULAS_LIST } from '../constants/schoolData';
import {
  formatDateDisplay,
  getTodayDateString,
  deleteBooking,
} from '../services/storageService';
import { ResourceIcon } from './ResourceIcon';

interface ReservationsListProps {
  bookings: Booking[];
  onViewReceipt: (booking: Booking) => void;
  onNewBookingClick: () => void;
  onGoHome?: () => void;
}

export const ReservationsList: React.FC<ReservationsListProps> = ({
  bookings,
  onViewReceipt,
  onNewBookingClick,
  onGoHome,
}) => {
  const today = getTodayDateString();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurno, setSelectedTurno] = useState<'all' | Turno>('all');
  const [selectedAula, setSelectedAula] = useState<'all' | Aula>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'future' | 'past'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTeacher = b.teacherName.toLowerCase().includes(query);
        const matchesComponent = b.curriculumComponent.toLowerCase().includes(query);
        const matchesResource = b.resourceName.toLowerCase().includes(query);
        const roomsStr = (b.classrooms || [b.classroom || '']).join(' ').toLowerCase();
        const matchesRoom = roomsStr.includes(query);

        if (!matchesTeacher && !matchesComponent && !matchesResource && !matchesRoom) {
          return false;
        }
      }

      // Turno filter
      if (selectedTurno !== 'all' && b.turno !== selectedTurno) {
        return false;
      }

      // Aula filter
      if (selectedAula !== 'all' && !(b.aulas || []).includes(selectedAula)) {
        return false;
      }

      // Date filter
      if (selectedDateFilter === 'today' && b.date !== today) {
        return false;
      }
      if (selectedDateFilter === 'future' && b.date < today) {
        return false;
      }
      if (selectedDateFilter === 'past' && b.date >= today) {
        return false;
      }

      return true;
    });
  }, [bookings, searchTerm, selectedTurno, selectedAula, selectedDateFilter, today]);

  const handleDelete = (id: string) => {
    deleteBooking(id);
    setDeleteConfirmId(null);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `agendamentos_escolares_${today}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
      {/* Top Banner & Stats */}
      <div className="bg-white rounded-3xl p-4 sm:p-7 border border-slate-200/80 shadow-xs mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Lista Geral de Reservas
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Histórico completo de equipamentos, salas e aulas agendadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>INÍCIO</span>
              </button>
            )}

            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Exportar Dados</span>
            </button>

            <button
              onClick={onNewBookingClick}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200 cursor-pointer"
            >
              <span>+ Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por professor, disciplina, item ou sala..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-medium focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 outline-hidden"
            />
          </div>

          {/* Turno Filter */}
          <div className="md:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setSelectedTurno('all')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTurno === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedTurno('matutino')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTurno === 'matutino'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              ☀️ Mat
            </button>
            <button
              onClick={() => setSelectedTurno('vespertino')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTurno === 'vespertino'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-orange-800 hover:bg-orange-50'
              }`}
            >
              🌤️ Vesp
            </button>
            <button
              onClick={() => setSelectedTurno('noturno')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTurno === 'noturno'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-800 hover:bg-indigo-50'
              }`}
            >
              🌙 Not
            </button>
          </div>

          {/* Date range filter */}
          <div className="md:col-span-3 flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setSelectedDateFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedDateFilter('today')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedDateFilter('future')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDateFilter === 'future'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Futuras
            </button>
          </div>
        </div>

        {/* Aula Quick filter tags */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-400 font-semibold mr-1">Filtrar Aula:</span>
          <button
            onClick={() => setSelectedAula('all')}
            className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
              selectedAula === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas as Aulas
          </button>
          {AULAS_LIST.map((aula) => (
            <button
              key={aula}
              onClick={() => setSelectedAula(aula)}
              className={`px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-all ${
                selectedAula === aula
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {aula}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List Cards */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Nenhum agendamento encontrado
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5">
            Tente alterar os filtros de pesquisa ou faça uma nova reserva.
          </p>
          <button
            onClick={onNewBookingClick}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-100 cursor-pointer inline-flex items-center gap-2"
          >
            <span>Fazer um Agendamento Agora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredBookings.map((b) => {
            const turnoCfg = TURNO_CONFIG[b.turno];
            const isToday = b.date === today;
            const isPast = b.date < today;
            const roomsDisplay =
              b.classrooms && b.classrooms.length > 0
                ? b.classrooms.join(', ')
                : b.classroom || 'Sala única';

            return (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Shift & Date Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl border flex items-center gap-1 ${turnoCfg.badgeBg}`}
                    >
                      <span>{turnoCfg.icon === 'Sun' ? '☀️' : turnoCfg.icon === 'Sunset' ? '🌤️' : '🌙'}</span>
                      <span>{turnoCfg.label}</span>
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl ${
                        isToday
                          ? 'bg-emerald-100 text-emerald-800 font-extrabold'
                          : isPast
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}
                    >
                      {formatDateDisplay(b.date)}
                    </span>
                  </div>

                  {/* DESTAQUE PRINCIPAL EM 1º LUGAR: NOME DO PROFESSOR */}
                  <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/50 p-3.5 rounded-2xl border-2 border-indigo-200/90 shadow-xs mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                        <User className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">
                          Professor(a)
                        </span>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight truncate">
                          {b.teacherName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-600 truncate">
                            {b.curriculumComponent}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resource Info (Equipamento / Ambiente) */}
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                        b.resourceType === 'equipamento'
                          ? 'bg-indigo-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      <ResourceIcon
                        iconName={
                          b.resourceId === 'chromebook'
                            ? 'laptop'
                            : b.resourceId === 'tv'
                            ? 'tv'
                            : b.resourceId === 'datashow'
                            ? 'projector'
                            : b.resourceId === 'caixa_som'
                            ? 'speaker'
                            : b.resourceId === 'patio'
                            ? 'sun'
                            : b.resourceId === 'biblioteca'
                            ? 'book'
                            : 'flask'
                        }
                        className="w-5 h-5"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {b.resourceType === 'equipamento' ? 'Equipamento' : 'Ambiente'}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                        {b.resourceName}
                      </h4>
                    </div>
                  </div>

                  {/* Schedule details & notes */}
                  <div className="space-y-1.5 text-xs">

                    {/* Aulas and Classrooms Schedule */}
                    {b.schedule && b.schedule.length > 0 ? (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Grade Atrelada:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {b.schedule.map((s) => (
                            <span
                              key={s.aula}
                              className="px-2 py-0.5 rounded-md bg-violet-50 text-violet-900 border border-violet-100 font-bold text-[11px] flex items-center gap-1"
                            >
                              <span>{s.aula}</span>
                              <span className="text-violet-400">➔</span>
                              <span className="text-violet-700">Sala {s.classroom}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-cyan-800 font-bold">
                          <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span className="truncate">
                            Aulas: {b.aulas?.join(', ') || '1ª e 2ª Aula'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-violet-800 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span className="truncate">Sala(s): {roomsDisplay}</span>
                        </div>
                      </>
                    )}

                    {b.notes && (
                      <div className="mt-2 p-2 rounded-xl bg-slate-50 text-[11px] text-slate-600 italic">
                        &ldquo;{b.notes}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onViewReceipt(b)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver agendamento</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(b.id)}
                    title="Cancelar este agendamento"
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Confirmation for Deletion */}
                {deleteConfirmId === b.id && (
                  <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Cancelar este agendamento?
                    </p>
                    <p className="text-[11px] text-rose-700 mt-1">
                      O item e as salas ficarão livres nestas aulas.
                    </p>
                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        Manter
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                      >
                        Sim, Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
