import type {
  AppliedViewState,
  Function,
  Person,
  PersonFunctionWeek,
  PersonWeekPlan,
  Role,
  ScheduleOverride,
  ScheduleTemplate,
  Shift,
  ShiftLabelMode
} from '../types';
import { clampScale } from './timeScale';
import type { TimeScale } from '../types';
import { addDays, startOfWeekMonday } from './dateUtils';
import { toISODate } from './scheduleUtils';

const STORAGE_KEY = 'shiftboard:data:v3';
const LEGACY_STORAGE_KEY = 'shiftboard:data:v2';
const LEGACY_STORAGE_V1_KEY = 'shiftboard:data:v1';
const VIEW_SCALE_KEY = 'shiftboard:view:timeScale';
const SHIFT_LABEL_MODE_KEY = 'shiftboard:view:shiftLabelMode';
const VIEW_STATE_KEY = 'shiftboard:view:state:v1';

const TEMPLATES_KEY = 'shiftboard_templates';
const PERSON_WEEK_PLANS_KEY = 'shiftboard_personWeekPlans';
const PERSON_FUNCTION_WEEKS_KEY = 'shiftboard_personFunctionWeeks';
const LEGACY_FUNCTION_WEEK_KEY = 'shiftboard_functionWeek';
const OVERRIDES_KEY = 'shiftboard_overrides';

export type AppState = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  shifts: Shift[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
};

type LegacyPerson = {
  id: string;
  nombre: string;
  rolId?: string;
  roleId?: string;
  functionId?: string;
};

type LegacyData = {
  roles: Role[];
  functions?: Function[];
  people: LegacyPerson[];
  shifts: Shift[];
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
  { id: 'p1', nombre: 'Ana Pérez', roleId: 'picker' },
  { id: 'p2', nombre: 'Luis Ríos', roleId: 'picker' },
  { id: 'p3', nombre: 'Marta Díaz', roleId: 'picker' },
  { id: 'p4', nombre: 'Sergio Mora', roleId: 'packing' },
  { id: 'p5', nombre: 'Nora Vega', roleId: 'packing' },
  { id: 'p6', nombre: 'Javier Sol', roleId: 'packing' },
  { id: 'p7', nombre: 'Carla Soto', roleId: 'supervisor' },
  { id: 'p8', nombre: 'Diego Paz', roleId: 'supervisor' }
];

const createDemoTemplates = (): ScheduleTemplate[] => {
  const make = (name: string, start: string | null, end: string | null): ScheduleTemplate => ({
    id: crypto.randomUUID(),
    name,
    days: {
      mon: { start, end }, tue: { start, end }, wed: { start, end }, thu: { start, end }, fri: { start, end },
      sat: { start: null, end: null }, sun: { start: null, end: null }
    }
  });
  return [make('Mañana', '06:00', '14:00'), make('Tarde', '14:00', '22:00'), make('Noche', '22:00', '06:00')];
};

const seedShifts = (baseMonday: Date): Shift[] => {
  const mk = (dayOffset: number, startH: number, startM: number, endH: number, endM: number, personId: string, etiqueta?: string) => {
    const start = new Date(baseMonday);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(baseMonday);
    end.setDate(end.getDate() + dayOffset);
    end.setHours(endH, endM, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);
    return { id: crypto.randomUUID(), personId, startISO: start.toISOString(), endISO: end.toISOString(), etiqueta };
  };
  return [mk(0, 6, 0, 14, 0, 'p1'), mk(1, 6, 0, 14, 0, 'p2'), mk(2, 6, 0, 14, 0, 'p3')];
};

const createDemoData = (baseMonday: Date): AppState => {
  const weekStartISO = toISODate(startOfWeekMonday(new Date()));
  const templates = createDemoTemplates();
  return {
    roles: demoRoles,
    functions: demoFunctions,
    people: demoPeople,
    shifts: seedShifts(baseMonday),
    templates,
    personWeekPlans: demoPeople.map((person, index) => ({
      personId: person.id,
      weekStartISO,
      templateId: templates[index % 2].id
    })),
    personFunctionWeeks: demoPeople.map((person, index) => ({
      personId: person.id,
      weekStartISO,
      functionId: demoFunctions.filter((fn) => fn.roleId === person.roleId)[index % 2]?.id ?? null
    })),
    overrides: []
  };
};

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

const inferRoleFromFunction = (functionId: string | undefined, functions: Function[]): string | null => {
  if (!functionId) return null;
  return functions.find((fn) => fn.id === functionId)?.roleId ?? null;
};

const normalizePeople = (people: LegacyPerson[], functions: Function[], roles: Role[]): Person[] => {
  const fallbackRole = roles[0]?.id ?? '';
  return people.map((person) => {
    const derivedRole = person.roleId ?? person.rolId ?? inferRoleFromFunction(person.functionId, functions) ?? fallbackRole;
    return { id: person.id, nombre: person.nombre, roleId: derivedRole, functionId: person.functionId };
  });
};

const loadLegacyCore = (): { roles: Role[]; functions: Function[]; people: Person[]; shifts: Shift[] } | null => {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_V1_KEY);
  const parsed = parseJson<LegacyData | null>(raw, null);
  if (!parsed || !Array.isArray(parsed.roles) || !Array.isArray(parsed.people) || !Array.isArray(parsed.shifts)) return null;
  const roles = parsed.roles;
  const functions = parsed.functions && parsed.functions.length > 0
    ? parsed.functions
    : roles.map((role) => ({ id: `fn-${role.id}`, roleId: role.id, nombre: role.nombre }));
  return { roles, functions, people: normalizePeople(parsed.people, functions, roles), shifts: parsed.shifts };
};

const loadPersonFunctionWeeks = (): PersonFunctionWeek[] => {
  const direct = parseJson<PersonFunctionWeek[]>(localStorage.getItem(PERSON_FUNCTION_WEEKS_KEY), []);
  if (direct.length > 0) return direct;

  const fromPlans = parseJson<Array<PersonWeekPlan & { functionId?: string | null }>>(localStorage.getItem(PERSON_WEEK_PLANS_KEY), []);
  const mapped = fromPlans
    .filter((item) => typeof item.personId === 'string' && typeof item.weekStartISO === 'string' && 'functionId' in item)
    .map((item) => ({ personId: item.personId, weekStartISO: item.weekStartISO, functionId: item.functionId ?? null }));
  if (mapped.length > 0) return mapped;

  const legacyRaw = parseJson<Record<string, string | null>>(localStorage.getItem(LEGACY_FUNCTION_WEEK_KEY), {});
  const weekStartISO = toISODate(startOfWeekMonday(new Date()));
  return Object.entries(legacyRaw).map(([personId, functionId]) => ({ personId, weekStartISO, functionId }));
};

export const loadAll = (baseMonday: Date): AppState => {
  const core = loadLegacyCore();
  if (!core) {
    const demo = createDemoData(baseMonday);
    saveAll(demo);
    return demo;
  }

  const templates = parseJson<ScheduleTemplate[]>(localStorage.getItem(TEMPLATES_KEY), []);
  const personWeekPlans = parseJson<PersonWeekPlan[]>(localStorage.getItem(PERSON_WEEK_PLANS_KEY), []).map((item) => ({
    personId: item.personId,
    weekStartISO: item.weekStartISO,
    templateId: item.templateId ?? null
  }));
  const overrides = parseJson<ScheduleOverride[]>(localStorage.getItem(OVERRIDES_KEY), []);
  const personFunctionWeeks = loadPersonFunctionWeeks();

  const state = { ...core, templates, personWeekPlans, personFunctionWeeks, overrides };
  saveAll(state);
  return state;
};

export const saveAll = (partialOrAll: Partial<AppState>): AppState => {
  const current = loadLegacyCore() ?? createDemoData(startOfWeekMonday(new Date()));
  const currentState: AppState = {
    ...current,
    templates: parseJson(localStorage.getItem(TEMPLATES_KEY), []),
    personWeekPlans: parseJson(localStorage.getItem(PERSON_WEEK_PLANS_KEY), []),
    personFunctionWeeks: parseJson(localStorage.getItem(PERSON_FUNCTION_WEEKS_KEY), []),
    overrides: parseJson(localStorage.getItem(OVERRIDES_KEY), [])
  };
  const next = { ...currentState, ...partialOrAll };

  const payload = { roles: next.roles, functions: next.functions, people: next.people, shifts: next.shifts };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next.templates));
  localStorage.setItem(PERSON_WEEK_PLANS_KEY, JSON.stringify(next.personWeekPlans));
  localStorage.setItem(PERSON_FUNCTION_WEEKS_KEY, JSON.stringify(next.personFunctionWeeks));
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next.overrides));
  return next;
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
  selectedPersonId: typeof value?.selectedPersonId === 'string' ? value.selectedPersonId : null,
  roleIds: Array.isArray(value?.roleIds) ? value.roleIds.filter((item): item is string => typeof item === 'string') : [],
  functionIds: Array.isArray(value?.functionIds) ? value.functionIds.filter((item): item is string => typeof item === 'string') : [],
  templateIds: Array.isArray(value?.templateIds) ? value.templateIds.filter((item): item is string => typeof item === 'string') : [],
  includeWithoutTemplate: value?.includeWithoutTemplate === true,
  dayKeys: Array.isArray(value?.dayKeys)
    ? value.dayKeys.filter((item): item is AppliedViewState['dayKeys'][number] => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(item))
    : [],
  timeRangeStart: typeof value?.timeRangeStart === 'string' ? value.timeRangeStart : '',
  timeRangeEnd: typeof value?.timeRangeEnd === 'string' ? value.timeRangeEnd : '',
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

export const clearIncompatibleWeekFunction = (
  rows: PersonFunctionWeek[],
  personId: string,
  weekStartISO: string,
  validFunctionIds: Set<string>
): PersonFunctionWeek[] => rows.map((row) => {
  if (row.personId !== personId || row.weekStartISO !== weekStartISO) return row;
  if (!row.functionId || validFunctionIds.has(row.functionId)) return row;
  return { ...row, functionId: null };
});

export const weekStartISOFromDate = (date: Date) => toISODate(startOfWeekMonday(date));

export const removePersonCascade = (state: AppState, personId: string): AppState => ({
  ...state,
  people: state.people.filter((person) => person.id !== personId),
  shifts: state.shifts.filter((shift) => shift.personId !== personId),
  personWeekPlans: state.personWeekPlans.filter((item) => item.personId !== personId),
  personFunctionWeeks: state.personFunctionWeeks.filter((item) => item.personId !== personId),
  overrides: state.overrides.filter((item) => item.personId !== personId)
});

export const weekDates = (weekStartISO: string) => Array.from({ length: 7 }, (_, day) => toISODate(addDays(new Date(`${weekStartISO}T00:00:00`), day)));
