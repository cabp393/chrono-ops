import type { AppData } from '../types';

const STORAGE_KEY = 'shiftboard:data:v1';

const demoData: AppData = {
  roles: [
    { id: 'picker', nombre: 'Picker', color: '#93c5fd' },
    { id: 'packing', nombre: 'Packing', color: '#86efac' },
    { id: 'supervisor', nombre: 'Supervisor', color: '#c4b5fd' }
  ],
  people: [
    { id: 'p1', nombre: 'Ana', rolId: 'picker' },
    { id: 'p2', nombre: 'Luis', rolId: 'picker' },
    { id: 'p3', nombre: 'Marta', rolId: 'picker' },
    { id: 'p4', nombre: 'Sergio', rolId: 'packing' },
    { id: 'p5', nombre: 'Nora', rolId: 'packing' },
    { id: 'p6', nombre: 'Javier', rolId: 'packing' },
    { id: 'p7', nombre: 'Carla', rolId: 'supervisor' },
    { id: 'p8', nombre: 'Diego', rolId: 'supervisor' }
  ],
  shifts: []
};

const seedShifts = (baseMonday: Date) => {
  const mk = (dayOffset: number, startH: number, endH: number, personId: string, rolId: string, etiqueta?: string) => {
    const start = new Date(baseMonday);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startH, 0, 0, 0);
    const end = new Date(baseMonday);
    end.setDate(end.getDate() + dayOffset);
    end.setHours(endH, 0, 0, 0);
    return { id: crypto.randomUUID(), personId, rolId, startISO: start.toISOString(), endISO: end.toISOString(), etiqueta };
  };

  return [
    mk(0, 6, 14, 'p1', 'picker'), mk(0, 8, 16, 'p2', 'picker'), mk(0, 12, 20, 'p4', 'packing'), mk(0, 9, 18, 'p7', 'supervisor'),
    mk(1, 6, 14, 'p3', 'picker'), mk(1, 10, 18, 'p5', 'packing'), mk(1, 12, 20, 'p6', 'packing'), mk(1, 9, 18, 'p8', 'supervisor'),
    mk(2, 7, 15, 'p1', 'picker'), mk(2, 8, 16, 'p2', 'picker'), mk(2, 14, 22, 'p4', 'packing'), mk(2, 9, 18, 'p7', 'supervisor'),
    mk(3, 6, 14, 'p3', 'picker'), mk(3, 8, 16, 'p5', 'packing'), mk(3, 10, 19, 'p8', 'supervisor'),
    mk(4, 6, 14, 'p1', 'picker'), mk(4, 12, 20, 'p6', 'packing'), mk(4, 9, 18, 'p7', 'supervisor'),
    mk(5, 8, 14, 'p2', 'picker'), mk(5, 9, 17, 'p4', 'packing'), mk(5, 8, 16, 'p8', 'supervisor'),
    mk(6, 8, 13, 'p3', 'picker'), mk(6, 10, 16, 'p5', 'packing')
  ];
};

export const loadData = (baseMonday: Date): AppData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AppData;
    } catch {
      // fallback demo
    }
  }

  const seeded = { ...demoData, shifts: seedShifts(baseMonday) };
  saveData(seeded);
  return seeded;
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
