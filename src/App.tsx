import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BookingForm } from './components/BookingForm';
import { DayBoardView } from './components/DayBoardView';
import { ReservationsList } from './components/ReservationsList';
import { BookingReceiptModal } from './components/BookingReceiptModal';
import { Booking, Turno } from './types/booking';
import { getStoredBookings, getTodayDateString } from './services/storageService';
import { ShieldCheck, School, Sparkles, Clock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'board' | 'list'>('form');
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Preselected parameters when coming from Board to Form
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>(undefined);
  const [preselectedTurno, setPreselectedTurno] = useState<Turno | undefined>(undefined);
  const [preselectedResourceId, setPreselectedResourceId] = useState<string | undefined>(undefined);

  // Modal receipt state
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<Booking | null>(null);
  const [batchBookings, setBatchBookings] = useState<Booking[]>([]);
  const [isJustCreatedReceipt, setIsJustCreatedReceipt] = useState(false);

  // Refresh bookings from storage
  const refreshBookings = () => {
    setBookings(getStoredBookings());
  };

  useEffect(() => {
    refreshBookings();
    window.addEventListener('escola_bookings_updated', refreshBookings);
    return () => window.removeEventListener('escola_bookings_updated', refreshBookings);
  }, []);

  const today = getTodayDateString();
  const todayBookingsCount = bookings.filter((b) => b.date === today).length;

  const handleBookingSuccess = (newBookings: Booking[]) => {
    refreshBookings();
    if (newBookings.length > 0) {
      setSelectedReceiptBooking(newBookings[0]);
      setBatchBookings(newBookings);
      setIsJustCreatedReceipt(true);
    }
  };

  const handleQuickBook = (date: string, turno: Turno, resourceId: string) => {
    setPreselectedDate(date);
    setPreselectedTurno(turno);
    setPreselectedResourceId(resourceId);
    setActiveTab('form');
  };

  const handleViewReceipt = (booking: Booking) => {
    setSelectedReceiptBooking(booking);
    // Find all items in the same batch group if grouped
    if (booking.groupId) {
      const grouped = bookings.filter((b) => b.groupId === booking.groupId);
      setBatchBookings(grouped.length > 0 ? grouped : [booking]);
    } else {
      setBatchBookings([booking]);
    }
    setIsJustCreatedReceipt(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalBookingsCount={bookings.length}
        todayBookingsCount={todayBookingsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'form' && (
          <BookingForm
            onBookingSuccess={handleBookingSuccess}
            preselectedDate={preselectedDate}
            preselectedTurno={preselectedTurno}
            preselectedResourceId={preselectedResourceId}
          />
        )}

        {activeTab === 'board' && (
          <DayBoardView
            onQuickBook={handleQuickBook}
            onViewBooking={handleViewReceipt}
            onGoHome={() => setActiveTab('form')}
          />
        )}

        {activeTab === 'list' && (
          <ReservationsList
            bookings={bookings}
            onViewReceipt={handleViewReceipt}
            onNewBookingClick={() => setActiveTab('form')}
            onGoHome={() => setActiveTab('form')}
          />
        )}
      </main>

      {/* Printable Receipt Modal */}
      <BookingReceiptModal
        booking={selectedReceiptBooking}
        allBookingsInBatch={batchBookings}
        onClose={() => setSelectedReceiptBooking(null)}
        isJustCreated={isJustCreatedReceipt}
        onGoHome={() => {
          setSelectedReceiptBooking(null);
          setBatchBookings([]);
          setActiveTab('form');
        }}
        onNewBooking={() => {
          setSelectedReceiptBooking(null);
          setBatchBookings([]);
          setActiveTab('form');
        }}
      />

      {/* Footer & Educational Information */}
      <footer className="bg-white border-t border-slate-200 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs text-slate-500 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                  Prevenção de Conflito por Aula
                </h5>
                <p className="leading-relaxed">
                  Equipamentos e salas ocupados na 1ª ou 2ª aula podem ser agendados por outros professores na 3ª, 4ª ou 5ª aula!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                  1ª à 5ª Aula Flexíveis
                </h5>
                <p className="leading-relaxed">
                  Selecione várias aulas ao mesmo tempo ou o turno completo com um único toque.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <School className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                  Múltiplas Salas e Itens
                </h5>
                <p className="leading-relaxed">
                  Reserve vários equipamentos (ex: Chromebook + Caixa de Som) para várias turmas simultaneamente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h5 className="font-bold text-slate-800 text-sm mb-0.5">
                  Compatível com Celular, PC e TV
                </h5>
                <p className="leading-relaxed">
                  Interface adaptativa para smartphones, tablets e modo painel para TVs das salas dos professores.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 text-center sm:text-left">
            <p>Sistema de Agendamento Escolar • Equipamentos, Ambientes e Salas de Aula</p>
            <p className="font-medium text-slate-500">Desenvolvido com máxima praticidade para os professores</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
