import type { AppData } from '../types';

const STORAGE_KEY = 'shiftboard:data:v1';

const demoData: AppData = {
  roles: [
    { id: 'picker', nombre: 'Picker', color: '#60a5fa' },
    { id: 'packing', nombre: 'Packing', color: '#4ade80' },
    { id: 'supervisor', nombre: 'Supervisor', color: '#a78bfa' }
  ],
  people: [
    { id: 'p1', nombre: 'Ana Pérez', rolId: 'picker' },
    { id: 'p2', nombre: 'Luis Ríos', rolId: 'picker' },
    { id: 'p3', nombre: 'Marta Díaz', rolId: 'picker' },
    { id: 'p4', nombre: 'Sergio Mora', rolId: 'packing' },
    { id: 'p5', nombre: 'Nora Vega', rolId: 'packing' },
    { id: 'p6', nombre: 'Javier Sol', rolId: 'packing' },
    { id: 'p7', nombre: 'Carla Soto', rolId: 'supervisor' },
    { id: 'p8', nombre: 'Diego Paz', rolId: 'supervisor' }
  ],
  shifts: []
};

const seedShifts = (baseMonday: Date) => {
  const mk = (dayOffset: number, startH: number, startM: number, endH: number, endM: number, personId: string, rolId: string, etiqueta?: string) => {
    const start = new Date(baseMonday);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(baseMonday);
    end.setDate(end.getDate() + dayOffset);
    end.setHours(endH, endM, 0, 0);
    return { id: crypto.randomUUID(), personId, rolId, startISO: start.toISOString(), endISO: end.toISOString(), etiqueta };
  };

  return [
    mk(0, 6, 0, 14, 0, 'p1', 'picker', 'Recepción'), mk(0, 8, 0, 16, 0, 'p2', 'picker'), mk(0, 11, 30, 20, 0, 'p4', 'packing'), mk(0, 9, 0, 18, 0, 'p7', 'supervisor'),
    mk(1, 6, 0, 14, 0, 'p3', 'picker'), mk(1, 10, 0, 18, 0, 'p5', 'packing'), mk(1, 12, 0, 20, 0, 'p6', 'packing', 'Picos'), mk(1, 9, 0, 18, 0, 'p8', 'supervisor'),
    mk(2, 7, 0, 15, 0, 'p1', 'picker'), mk(2, 8, 0, 16, 0, 'p2', 'picker'), mk(2, 14, 0, 22, 0, 'p4', 'packing'), mk(2, 9, 0, 18, 0, 'p7', 'supervisor'),
    mk(3, 0, 30, 7, 0, 'p8', 'supervisor', 'Nocturno'), mk(3, 0, 30, 7, 0, 'p4', 'packing', 'Nocturno'), mk(3, 6, 0, 14, 0, 'p3', 'picker'),
    mk(4, 6, 0, 14, 0, 'p1', 'picker'), mk(4, 12, 0, 20, 0, 'p6', 'packing'), mk(4, 9, 0, 18, 0, 'p7', 'supervisor'),
    mk(5, 8, 0, 14, 0, 'p2', 'picker'), mk(5, 9, 0, 17, 0, 'p4', 'packing'), mk(5, 8, 0, 16, 0, 'p8', 'supervisor'), mk(5, 8, 30, 16, 30, 'p3', 'picker'),
    mk(6, 8, 0, 13, 0, 'p3', 'picker'), mk(6, 10, 0, 16, 0, 'p5', 'packing')
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
  const payload: AppData = {
    roles: data.roles,
    people: data.people,
    shifts: data.shifts.map(({ id, personId, rolId, startISO, endISO, etiqueta }) => ({ id, personId, rolId, startISO, endISO, etiqueta }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
