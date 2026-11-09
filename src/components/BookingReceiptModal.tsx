import React from 'react';
import {
  CheckCircle,
  Printer,
  X,
  School,
  Calendar,
  Clock,
  MapPin,
  User,
  BookOpen,
  Share2,
  Home,
} from 'lucide-react';
import { Booking } from '../types/booking';
import { TURNO_CONFIG, AULA_SCHEDULE_BY_TURNO } from '../constants/schoolData';
import { formatDateDisplay } from '../services/storageService';
import { ResourceIcon } from './ResourceIcon';

interface BookingReceiptModalProps {
  booking: Booking | null;
  allBookingsInBatch?: Booking[];
  onClose: () => void;
  onNewBooking?: () => void;
  onGoHome?: () => void;
  isJustCreated?: boolean;
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  booking,
  allBookingsInBatch,
  onClose,
  onNewBooking,
  onGoHome,
  isJustCreated = false,
}) => {
  if (!booking) return null;

  const turnoCfg = TURNO_CONFIG[booking.turno];
  const itemsToShow =
    allBookingsInBatch && allBookingsInBatch.length > 0
      ? allBookingsInBatch
      : [booking];

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const itemsList = itemsToShow.map((b) => b.resourceName).join(' + ');
    const roomsList = booking.classrooms?.join(', ') || booking.classroom || '';
    const aulasList = booking.aulas?.join(', ') || '';

    const text = `📋 Registro de Agendamento Escolar:\nEquipamento(s)/Ambiente(s): ${itemsList}\nData: ${formatDateDisplay(
      booking.date
    )} (${turnoCfg.label})\nAulas: ${aulasList}\nSala(s): ${roomsList}\nProfessor(a): ${booking.teacherName} (${booking.curriculumComponent})`;

    if (navigator.share) {
      navigator
        .share({
          title: 'Ver agendamento',
          text: text,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Texto do agendamento copiado com sucesso!');
    }
  };

  const classroomsDisplay =
    booking.classrooms && booking.classrooms.length > 0
      ? booking.classrooms.join(', ')
      : booking.classroom || 'Não informada';

  const aulasDisplay =
    booking.aulas && booking.aulas.length > 0
      ? booking.aulas.join(', ')
      : 'Não informada';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 my-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer no-print"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Status */}
        {isJustCreated && (
          <div className="text-center mb-5 no-print">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-emerald-100">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Reserva Concluída!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              {itemsToShow.length > 1
                ? `${itemsToShow.length} itens foram agendados com sucesso.`
                : 'Seu agendamento foi registrado no sistema escolar.'}
            </p>
          </div>
        )}

        {/* The Printable Slip / Voucher */}
        <div className="border-2 border-dashed border-slate-300 rounded-3xl p-4 sm:p-6 bg-slate-50/80 relative">
          {/* Header of Voucher */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  Ver agendamento
                </h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Reserva de Equipamentos e Ambientes
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-mono text-slate-400 block">CÓDIGO</span>
              <span className="text-xs font-mono font-bold text-slate-800">
                {booking.id.slice(-6).toUpperCase()}
              </span>
            </div>
          </div>

          {/* DESTAQUE PRINCIPAL EM 1º LUGAR: PROFESSOR(A) RESPONSÁVEL */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 rounded-2xl shadow-md mb-3.5 border border-indigo-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <User className="w-7 h-7 text-white stroke-[2.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 block">
                  Professor(a) Responsável
                </span>
                <h4 className="font-black text-lg sm:text-xl leading-tight truncate text-white">
                  {booking.teacherName}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span className="text-xs font-bold text-indigo-100 truncate">
                    {booking.curriculumComponent}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Resources Feature Cards */}
          <div className="space-y-2 mb-3">
            {itemsToShow.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    item.resourceType === 'equipamento'
                      ? 'bg-indigo-600'
                      : 'bg-emerald-600'
                  }`}
                >
                  <ResourceIcon
                    iconName={
                      item.resourceId === 'chromebook'
                        ? 'laptop'
                        : item.resourceId === 'tv'
                        ? 'tv'
                        : item.resourceId === 'datashow'
                        ? 'projector'
                        : item.resourceId === 'caixa_som'
                        ? 'speaker'
                        : item.resourceId === 'patio'
                        ? 'sun'
                        : item.resourceId === 'biblioteca'
                        ? 'book'
                        : 'flask'
                    }
                    className="w-5 h-5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">
                    {item.resourceType === 'equipamento' ? 'Equipamento Agendado' : 'Ambiente Agendado'}
                  </span>
                  <h5 className="font-black text-sm text-slate-900 truncate">
                    {item.resourceName}
                  </h5>
                </div>
              </div>
            ))}
          </div>

          {/* Details Grid */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Data da Utilização:
              </span>
              <span className="font-extrabold text-slate-900">
                {formatDateDisplay(booking.date)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Turno:
              </span>
              <span className="font-extrabold text-slate-900">
                {turnoCfg.label} ({turnoCfg.period})
              </span>
            </div>

            {/* Linked Schedule Display: 1ª Aula -> Sala 13.01, 4ª Aula -> Sala 34.01 */}
            {booking.schedule && booking.schedule.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                <span className="text-slate-500 font-medium flex items-center gap-1.5 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-violet-500" />
                  Aulas e Salas Atreladas:
                </span>
                <div className="space-y-1">
                  {booking.schedule.map((s) => (
                    <div
                      key={s.aula}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-950 font-extrabold text-xs"
                    >
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-600" />
                        {s.aula}
                      </span>
                      <span className="text-violet-700 bg-white px-2 py-0.5 rounded-md border border-violet-200">
                        Sala {s.classroom}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                    Aulas Agendadas:
                  </span>
                  <span className="font-extrabold text-cyan-900">
                    {aulasDisplay}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-violet-500" />
                    Sala(s) de Aula:
                  </span>
                  <span className="font-extrabold text-violet-950 text-sm">
                    Sala(s) {classroomsDisplay}
                  </span>
                </div>
              </>
            )}

            {booking.notes && (
              <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  Observações:
                </span>
                <span className="font-medium text-slate-700 italic">
                  &ldquo;{booking.notes}&rdquo;
                </span>
              </div>
            )}
          </div>

          {/* Footer of Voucher */}
          <div className="mt-3 pt-2 border-t border-slate-200 text-center">
            <span className="text-[10px] text-slate-400">
              Registrado em {new Date(booking.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 no-print">
          {/* Botão INÍCIO com destaque */}
          <button
            onClick={() => {
              onClose();
              if (onGoHome) onGoHome();
            }}
            className="flex-1 min-w-[130px] py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>INÍCIO</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 min-w-[130px] py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir agendamento</span>
          </button>

          <button
            onClick={handleShare}
            className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Copiar</span>
          </button>

          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
