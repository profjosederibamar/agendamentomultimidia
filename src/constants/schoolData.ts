import { BookingResource, Turno, Aula } from '../types/booking';

export const AULAS_LIST: Aula[] = [
  '1ª Aula',
  '2ª Aula',
  '3ª Aula',
  '4ª Aula',
  '5ª Aula',
];

export const AULA_SCHEDULE_BY_TURNO: Record<Turno, Record<Aula, string>> = {
  matutino: {
    '1ª Aula': '07h00 - 07h50',
    '2ª Aula': '07h50 - 08h40',
    '3ª Aula': '08h55 - 09h45',
    '4ª Aula': '09h45 - 10h35',
    '5ª Aula': '10h35 - 11h25',
  },
  vespertino: {
    '1ª Aula': '13h00 - 13h50',
    '2ª Aula': '13h50 - 14h40',
    '3ª Aula': '14h55 - 15h45',
    '4ª Aula': '15h45 - 16h35',
    '5ª Aula': '16h35 - 17h25',
  },
  noturno: {
    '1ª Aula': '19h00 - 19h40',
    '2ª Aula': '19h40 - 20h20',
    '3ª Aula': '20h30 - 21h10',
    '4ª Aula': '21h10 - 21h50',
    '5ª Aula': '21h50 - 22h30',
  },
};

export const TURNO_CONFIG: Record<
  Turno,
  {
    label: string;
    subLabel: string;
    period: string;
    icon: string;
    color: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    badgeBg: string;
  }
> = {
  matutino: {
    label: 'Matutino',
    subLabel: 'Manhã',
    period: '07h00 às 11h30',
    icon: 'Sun',
    color: 'amber',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  vespertino: {
    label: 'Vespertino',
    subLabel: 'Tarde',
    period: '13h00 às 17h30',
    icon: 'Sunset',
    color: 'orange',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-800',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  noturno: {
    label: 'Noturno',
    subLabel: 'Noite',
    period: '19h00 às 22h30',
    icon: 'Moon',
    color: 'indigo',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-800',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
};

// Official classrooms strictly as requested by the user:
export const CLASSROOMS_BY_TURNO: Record<Turno, string[]> = {
  matutino: ['13.01', '14.01', '23.01', '24.01', '33.01', '34.01'],
  vespertino: ['62.01', '62.02', '72.01', '82.01', '92.01'],
  noturno: ['27.01', '46.01'],
};

// Official items & environments strictly as requested by the user:
export const SCHOOL_RESOURCES: BookingResource[] = [
  // Equipamentos
  {
    id: 'chromebook',
    name: 'Carrinho de Chromebook',
    type: 'equipamento',
    category: 'Equipamento',
    description: 'Conjunto completo de chromebooks para pesquisa e atividades digitais.',
    iconName: 'laptop',
    color: 'indigo',
  },
  {
    id: 'tv',
    name: 'TV',
    type: 'equipamento',
    category: 'Equipamento',
    description: 'Televisor com entrada HDMI e suporte móvel para exibição de mídias.',
    iconName: 'tv',
    color: 'blue',
  },
  {
    id: 'datashow',
    name: 'Datashow',
    type: 'equipamento',
    category: 'Equipamento',
    description: 'Projetor multimídia de alta definição para apresentações e aulas.',
    iconName: 'projector',
    color: 'amber',
  },
  {
    id: 'caixa_som',
    name: 'Caixa de Som',
    type: 'equipamento',
    category: 'Equipamento',
    description: 'Caixa acústica portátil com microfone sem fio e conexão bluetooth/cabo.',
    iconName: 'speaker',
    color: 'rose',
  },
  // Ambientes
  {
    id: 'patio',
    name: 'Pátio',
    type: 'ambiente',
    category: 'Ambiente',
    description: 'Área aberta coberta para atividades dinâmicas, gincanas e apresentações.',
    iconName: 'sun',
    color: 'emerald',
  },
  {
    id: 'biblioteca',
    name: 'Biblioteca',
    type: 'ambiente',
    category: 'Ambiente',
    description: 'Espaço silencioso para leitura, pesquisa em grupo e estudo guiado.',
    iconName: 'book',
    color: 'violet',
  },
  {
    id: 'laboratorio',
    name: 'Laboratório',
    type: 'ambiente',
    category: 'Ambiente',
    description: 'Espaço com bancadas para experimentos práticos e ciências.',
    iconName: 'flask',
    color: 'cyan',
  },
];

// Suggested common subjects to make typing even easier and faster:
export const SUGGESTED_COMPONENTS = [
  'Língua Portuguesa',
  'Matemática',
  'Ciências',
  'História',
  'Geografia',
  'Arte',
  'Educação Física',
  'Língua Inglesa',
  'Ensino Religioso',
  'Robótica',
  'Química',
  'Física',
  'Biologia',
  'Filosofia',
  'Sociologia',
  'Projeto de Vida',
];
