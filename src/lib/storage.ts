import type { AppliedViewState, AppData, Function, Person, Role, Shift, ShiftLabelMode } from '../types';
import { clampScale } from './timeScale';
import type { TimeScale } from '../types';

const STORAGE_KEY = 'shiftboard:data:v2';
const LEGACY_STORAGE_KEY = 'shiftboard:data:v1';
const VIEW_SCALE_KEY = 'shiftboard:view:timeScale';
const SHIFT_LABEL_MODE_KEY = 'shiftboard:view:shiftLabelMode';
const VIEW_STATE_KEY = 'shiftboard:view:state:v1';

type LegacyPerson = {
  id: string;
  nombre: string;
  rolId?: string;
  functionId?: string;
};

type LegacyShift = {
  id: string;
  personId: string;
  rolId?: string;
  startISO: string;
  endISO: string;
  etiqueta?: string;
};

type LegacyData = {
  roles: Role[];
  functions?: Function[];
  people: LegacyPerson[];
  shifts: LegacyShift[];
};

const demoRoles: Role[] = [
  { id: 'picker', nombre: 'Picker', color: '#60a5fa' },
  { id: 'packing', nombre: 'Packing', color: '#4ade80' },
  { id: 'supervisor', nombre: 'Supervisor', color: '#a78bfa' }
];

const demoFunctions: Function[] = [
  { id: 'fn-picker', roleId: 'picker', nombre: 'Picker' },
  { id: 'fn-picker-senior', roleId: 'picker', nombre: 'Picker Senior' },
  { id: 'fn-packing', roleId: 'packing', nombre: 'Packing' },
  { id: 'fn-packing-qa', roleId: 'packing', nombre: 'Packing QA' },
  { id: 'fn-supervisor', roleId: 'supervisor', nombre: 'Supervisor' },
  { id: 'fn-lider-turno', roleId: 'supervisor', nombre: 'Líder Turno' }
];

const demoPeople: Person[] = [
  { id: 'p1', nombre: 'Ana Pérez', functionId: 'fn-picker' },
  { id: 'p2', nombre: 'Luis Ríos', functionId: 'fn-picker-senior' },
  { id: 'p3', nombre: 'Marta Díaz', functionId: 'fn-picker' },
  { id: 'p4', nombre: 'Sergio Mora', functionId: 'fn-packing' },
  { id: 'p5', nombre: 'Nora Vega', functionId: 'fn-packing-qa' },
  { id: 'p6', nombre: 'Javier Sol', functionId: 'fn-packing' },
  { id: 'p7', nombre: 'Carla Soto', functionId: 'fn-supervisor' },
  { id: 'p8', nombre: 'Diego Paz', functionId: 'fn-lider-turno' }
];

const seedShifts = (baseMonday: Date): Shift[] => {
  const mk = (dayOffset: number, startH: number, startM: number, endH: number, endM: number, personId: string, etiqueta?: string) => {
    const start = new Date(baseMonday);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(baseMonday);
    end.setDate(end.getDate() + dayOffset);
    end.setHours(endH, endM, 0, 0);
    return { id: crypto.randomUUID(), personId, startISO: start.toISOString(), endISO: end.toISOString(), etiqueta };
  };

  return [
    mk(0, 6, 0, 14, 0, 'p1', 'Recepción'), mk(0, 8, 0, 16, 0, 'p2'), mk(0, 11, 30, 20, 0, 'p4'), mk(0, 9, 0, 18, 0, 'p7'),
    mk(1, 6, 0, 14, 0, 'p3'), mk(1, 10, 0, 18, 0, 'p5'), mk(1, 12, 0, 20, 0, 'p6', 'Picos'), mk(1, 9, 0, 18, 0, 'p8'),
    mk(2, 7, 0, 15, 0, 'p1'), mk(2, 8, 0, 16, 0, 'p2'), mk(2, 14, 0, 22, 0, 'p4'), mk(2, 9, 0, 18, 0, 'p7'),
    mk(3, 0, 30, 7, 0, 'p8', 'Nocturno'), mk(3, 0, 30, 7, 0, 'p4', 'Nocturno'), mk(3, 6, 0, 14, 0, 'p3'),
    mk(4, 6, 0, 14, 0, 'p1'), mk(4, 12, 0, 20, 0, 'p6'), mk(4, 9, 0, 18, 0, 'p7'),
    mk(5, 8, 0, 14, 0, 'p2'), mk(5, 9, 0, 17, 0, 'p4'), mk(5, 8, 0, 16, 0, 'p8'), mk(5, 8, 30, 16, 30, 'p3'),
    mk(6, 8, 0, 13, 0, 'p3'), mk(6, 10, 0, 16, 0, 'p5')
  ];
};

const createDemoData = (baseMonday: Date): AppData => ({
  roles: demoRoles,
  functions: demoFunctions,
  people: demoPeople,
  shifts: seedShifts(baseMonday)
});

const migrateLegacyData = (legacy: LegacyData): AppData => {
  const roles = legacy.roles ?? [];

  const existingFunctions = legacy.functions ?? [];
  const roleToAutoFunction = new Map<string, string>();
  const functions: Function[] = existingFunctions.length > 0
    ? existingFunctions
    : roles.map((role) => {
      const id = `fn-${role.id}`;
      roleToAutoFunction.set(role.id, id);
      return { id, roleId: role.id, nombre: role.nombre };
    });

  if (existingFunctions.length > 0) {
    roles.forEach((role) => {
      const first = existingFunctions.find((fn) => fn.roleId === role.id);
      if (first) roleToAutoFunction.set(role.id, first.id);
    });
  }

  const people: Person[] = legacy.people.map((person) => {
    const functionId = person.functionId
      ?? (person.rolId ? roleToAutoFunction.get(person.rolId) : undefined)
      ?? functions[0]?.id
      ?? '';
    return { id: person.id, nombre: person.nombre, functionId };
  });

  const peopleById = new Map(people.map((person) => [person.id, person]));

  const shifts: Shift[] = legacy.shifts.map((shift) => {
    const person = peopleById.get(shift.personId);
    if (!person && shift.rolId && !roleToAutoFunction.has(shift.rolId)) {
      const role = roles.find((item) => item.id === shift.rolId);
      if (role) {
        const autoFunctionId = `fn-${role.id}`;
        roleToAutoFunction.set(role.id, autoFunctionId);
        functions.push({ id: autoFunctionId, roleId: role.id, nombre: role.nombre });
      }
    }
    return {
      id: shift.id,
      personId: shift.personId,
      startISO: shift.startISO,
      endISO: shift.endISO,
      etiqueta: shift.etiqueta
    };
  });

  return { roles, functions, people, shifts };
};

const parsePayload = (raw: string): AppData | null => {
  try {
    const parsed = JSON.parse(raw) as LegacyData;
    if (!parsed || !Array.isArray(parsed.roles) || !Array.isArray(parsed.people) || !Array.isArray(parsed.shifts)) {
      return null;
    }
    return migrateLegacyData(parsed);
  } catch {
    return null;
  }
};

export const loadData = (baseMonday: Date): AppData => {
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) {
    const parsed = parsePayload(current);
    if (parsed) return parsed;
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const migrated = parsePayload(legacy);
    if (migrated) {
      saveData(migrated);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
  }

  const seeded = createDemoData(baseMonday);
  saveData(seeded);
  return seeded;
};

export const saveData = (data: AppData) => {
  const payload: AppData = {
    roles: data.roles,
    functions: data.functions,
    people: data.people,
    shifts: data.shifts.map(({ id, personId, startISO, endISO, etiqueta }) => ({ id, personId, startISO, endISO, etiqueta }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const loadTimeScalePreference = (): TimeScale => {
  const raw = localStorage.getItem(VIEW_SCALE_KEY);
  if (!raw) return 60;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 60;
  return clampScale(parsed);
};

export const saveTimeScalePreference = (scale: TimeScale) => {
  localStorage.setItem(VIEW_SCALE_KEY, String(scale));
};

export const loadShiftLabelModePreference = (): ShiftLabelMode => {
  const raw = localStorage.getItem(SHIFT_LABEL_MODE_KEY);
  if (raw === 'person' || raw === 'function') return raw;
  return 'function';
};

export const saveShiftLabelModePreference = (mode: ShiftLabelMode) => {
  localStorage.setItem(SHIFT_LABEL_MODE_KEY, mode);
};

const normalizeViewState = (value: Partial<AppliedViewState> | null | undefined): AppliedViewState => ({
  timeScale: clampScale(Number(value?.timeScale ?? 60)),
  shiftLabelMode: value?.shiftLabelMode === 'person' ? 'person' : 'function',
  roleIds: Array.isArray(value?.roleIds) ? value!.roleIds.filter((item): item is string => typeof item === 'string') : [],
  functionIds: Array.isArray(value?.functionIds) ? value!.functionIds.filter((item): item is string => typeof item === 'string') : [],
  searchText: typeof value?.searchText === 'string' ? value.searchText : ''
});

export const loadViewStatePreference = (): AppliedViewState => {
  const raw = localStorage.getItem(VIEW_STATE_KEY);
  if (raw) {
    try {
      return normalizeViewState(JSON.parse(raw) as Partial<AppliedViewState>);
    } catch {
      return normalizeViewState(null);
    }
  }

  return normalizeViewState({
    timeScale: loadTimeScalePreference(),
    shiftLabelMode: loadShiftLabelModePreference()
  });
};

export const saveViewStatePreference = (state: AppliedViewState) => {
  const normalized = normalizeViewState(state);
  localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(normalized));
  saveTimeScalePreference(normalized.timeScale);
  saveShiftLabelModePreference(normalized.shiftLabelMode);
};
