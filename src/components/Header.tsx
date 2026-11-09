import React, { useEffect, useState } from 'react';
import { Calendar, Clock, PlusCircle, LayoutGrid, ListFilter, School, Sparkles, Home, LogIn, LogOut } from 'lucide-react';
import { Turno } from '../types/booking';
import { useAuth } from '../context/AuthContext.tsx';

interface HeaderProps {
  activeTab: 'form' | 'board' | 'list';
  setActiveTab: (tab: 'form' | 'board' | 'list') => void;
  totalBookingsCount: number;
  todayBookingsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalBookingsCount,
  todayBookingsCount,
}) => {
  const { user, signInWithGoogle, logOut } = useAuth();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getAutoTurno = (): { turno: Turno; label: string; icon: string } => {
    const hour = currentDateTime.getHours();
    if (hour >= 6 && hour < 12) {
      return { turno: 'matutino', label: 'Turno Matutino (Manhã)', icon: '☀️' };
    } else if (hour >= 12 && hour < 18) {
      return { turno: 'vespertino', label: 'Turno Vespertino (Tarde)', icon: '🌤️' };
    } else {
      return { turno: 'noturno', label: 'Turno Noturno (Noite)', icon: '🌙' };
    }
  };

  const autoTurno = getAutoTurno();

  const formattedDate = currentDateTime.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentDateTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Info Bar */}
        <div className="py-3 sm:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100">
          <div
            onClick={() => setActiveTab('form')}
            className="flex items-center gap-3 cursor-pointer group"
            title="Ir para o Início"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0 group-hover:scale-105 transition-transform">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Agendamento Escolar
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                  Uso Fácil
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Equipamentos, Ambientes e Salas de Aula
              </p>
            </div>
          </div>

          {/* Quick status chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium capitalize">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formattedDate}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{formattedTime}</span>
              <span className="text-slate-400">|</span>
              <span>{autoTurno.icon} {autoTurno.label}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>{todayBookingsCount} hoje</span>
            </div>

            {/* Google Authentication */}
            {user ? (
              <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
                <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-xl transition-all">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Professor'}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                      {(user.displayName || user.email || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-slate-800 max-w-[110px] truncate text-xs">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logOut}
                  title="Sair da conta"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
          {/* Botão INÍCIO com destaque */}
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'form'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                : 'text-slate-700 bg-slate-100 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>INÍCIO</span>
          </button>

          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Fazer Agendamento</span>
          </button>

          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'board'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Quadro Geral do Dia</span>
          </button>

          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'list'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Ver Todos os Agendamentos</span>
            <span
              className={`ml-1 text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'list'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalBookingsCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
