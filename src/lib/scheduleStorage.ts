import type {
  Function,
  Person,
  PersonFunctionWeek,
  PersonSchedule,
  Role,
  ScheduleOverride,
  ScheduleTemplate,
  StorageData
} from '../types';
import { addDays, startOfWeekMonday } from './dateUtils';
import { createEmptyTemplateDays, toISODate } from './scheduleUtils';

const ROLES_KEY = 'shiftboard_roles';
const FUNCTIONS_KEY = 'shiftboard_functions';
const PEOPLE_KEY = 'shiftboard_people';
const PERSON_FUNCTION_WEEKS_KEY = 'shiftboard_personFunctionWeeks';
const TEMPLATES_KEY = 'shiftboard_templates';
const PERSON_SCHEDULES_KEY = 'shiftboard_personSchedules';
const OVERRIDES_KEY = 'shiftboard_overrides';

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const isSlotValue = (value: unknown): value is { start: string | null; end: string | null } => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (record.start === null || typeof record.start === 'string') && (record.end === null || typeof record.end === 'string');
};

const normalizeTemplate = (value: unknown): ScheduleTemplate | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.name !== 'string' || !row.days || typeof row.days !== 'object') return null;
  const days = row.days as Record<string, unknown>;
  const fallback = createEmptyTemplateDays();
  return {
    id: row.id,
    name: row.name,
    days: {
      mon: isSlotValue(days.mon) ? { ...days.mon } : fallback.mon,
      tue: isSlotValue(days.tue) ? { ...days.tue } : fallback.tue,
      wed: isSlotValue(days.wed) ? { ...days.wed } : fallback.wed,
      thu: isSlotValue(days.thu) ? { ...days.thu } : fallback.thu,
      fri: isSlotValue(days.fri) ? { ...days.fri } : fallback.fri,
      sat: isSlotValue(days.sat) ? { ...days.sat } : fallback.sat,
      sun: isSlotValue(days.sun) ? { ...days.sun } : fallback.sun
    }
  };
};

const createDemoTemplates = (): ScheduleTemplate[] => {
  const make = (name: string, start: string | null, end: string | null, weekendFree = true): ScheduleTemplate => ({
    id: crypto.randomUUID(),
    name,
    days: {
      mon: { start, end }, tue: { start, end }, wed: { start, end }, thu: { start, end }, fri: { start, end },
      sat: weekendFree ? { start: null, end: null } : { start, end },
      sun: weekendFree ? { start: null, end: null } : { start, end }
    }
  });

  return [make('Mañana', '06:00', '14:00'), make('Tarde', '14:00', '22:00'), make('Noche', '22:00', '06:00')];
};

const createDemoData = (): StorageData => {
  const roles: Role[] = [
    { id: 'picker', nombre: 'Picker', color: '#60a5fa' },
    { id: 'packing', nombre: 'Packing', color: '#4ade80' },
    { id: 'supervisor', nombre: 'Supervisor', color: '#a78bfa' }
  ];
  const functions: Function[] = [
    { id: 'fn-picker', roleId: 'picker', nombre: 'Picker' },
    { id: 'fn-picker-senior', roleId: 'picker', nombre: 'Picker Senior' },
    { id: 'fn-packing', roleId: 'packing', nombre: 'Packing' },
    { id: 'fn-packing-qa', roleId: 'packing', nombre: 'Packing QA' },
    { id: 'fn-supervisor', roleId: 'supervisor', nombre: 'Supervisor' },
    { id: 'fn-lider-turno', roleId: 'supervisor', nombre: 'Líder Turno' }
  ];
  const people: Person[] = [
    { id: 'p1', nombre: 'Ana Pérez', roleId: 'picker' },
    { id: 'p2', nombre: 'Luis Ríos', roleId: 'picker' },
    { id: 'p3', nombre: 'Marta Díaz', roleId: 'picker' },
    { id: 'p4', nombre: 'Sergio Mora', roleId: 'packing' },
    { id: 'p5', nombre: 'Nora Vega', roleId: 'packing' },
    { id: 'p6', nombre: 'Javier Sol', roleId: 'packing' },
    { id: 'p7', nombre: 'Carla Soto', roleId: 'supervisor' },
    { id: 'p8', nombre: 'Diego Paz', roleId: 'supervisor' }
  ];
  const weekStartISO = toISODate(startOfWeekMonday(new Date()));
  const personFunctionWeeks: PersonFunctionWeek[] = [
    { personId: 'p1', weekStartISO, functionId: 'fn-picker' },
    { personId: 'p2', weekStartISO, functionId: 'fn-picker-senior' },
    { personId: 'p3', weekStartISO, functionId: 'fn-picker' },
    { personId: 'p4', weekStartISO, functionId: 'fn-packing' },
    { personId: 'p5', weekStartISO, functionId: 'fn-packing-qa' },
    { personId: 'p6', weekStartISO, functionId: 'fn-packing' },
    { personId: 'p7', weekStartISO, functionId: 'fn-supervisor' },
    { personId: 'p8', weekStartISO, functionId: 'fn-lider-turno' }
  ];
  const templates = createDemoTemplates();
  const personSchedules: PersonSchedule[] = people.map((person, index) => ({
    personId: person.id,
    templateId: index % 3 === 0 ? templates[0].id : index % 3 === 1 ? templates[1].id : null
  }));
  if (people[2]) personSchedules[2] = { personId: people[2].id, templateId: templates[2].id };

  const weekStart = startOfWeekMonday(new Date());
  const overrides: ScheduleOverride[] = [
    { id: crypto.randomUUID(), personId: 'p1', dateISO: toISODate(addDays(weekStart, 3)), start: '06:00', end: '13:00', note: 'Sale 1h antes' },
    { id: crypto.randomUUID(), personId: 'p2', dateISO: toISODate(addDays(weekStart, 5)), start: null, end: null, note: 'Libre por ajuste' }
  ];

  return { roles, functions, people, personFunctionWeeks, templates, personSchedules, overrides };
};

const normalizeData = (raw: StorageData): StorageData => {
  const roles = (raw.roles ?? []).filter((r): r is Role => !!r && typeof r.id === 'string' && typeof r.nombre === 'string');
  const roleIds = new Set(roles.map((r) => r.id));
  const functions = (raw.functions ?? []).filter((f): f is Function => !!f && typeof f.id === 'string' && typeof f.nombre === 'string' && typeof f.roleId === 'string' && roleIds.has(f.roleId));
  const functionIds = new Set(functions.map((f) => f.id));
  const people = (raw.people ?? []).filter((p): p is Person => !!p && typeof p.id === 'string' && typeof p.nombre === 'string' && typeof p.roleId === 'string' && roleIds.has(p.roleId));
  const personIds = new Set(people.map((p) => p.id));

  const personFunctionWeeks = (raw.personFunctionWeeks ?? []).filter((p): p is PersonFunctionWeek => !!p
    && typeof p.personId === 'string'
    && personIds.has(p.personId)
    && typeof p.weekStartISO === 'string'
    && typeof p.functionId === 'string'
    && functionIds.has(p.functionId));

  const templates = (raw.templates ?? []).map(normalizeTemplate).filter((t): t is ScheduleTemplate => !!t);
  const templateIds = new Set(templates.map((t) => t.id));

  const personSchedules = (raw.personSchedules ?? []).filter((p): p is PersonSchedule => !!p
    && typeof p.personId === 'string'
    && personIds.has(p.personId)
    && (p.templateId === null || (typeof p.templateId === 'string' && templateIds.has(p.templateId))));

  const overrides = (raw.overrides ?? []).filter((item): item is ScheduleOverride => !!item
    && typeof item.id === 'string'
    && typeof item.personId === 'string'
    && personIds.has(item.personId)
    && typeof item.dateISO === 'string'
    && (item.start === null || typeof item.start === 'string')
    && (item.end === null || typeof item.end === 'string'));

  return { roles, functions, people, personFunctionWeeks, templates, personSchedules, overrides };
};

export const loadAll = (): StorageData => {
  const roles = parseJson<Role[]>(localStorage.getItem(ROLES_KEY), []);
  const functions = parseJson<Function[]>(localStorage.getItem(FUNCTIONS_KEY), []);
  const peopleRaw = parseJson<Array<Person & { functionId?: string }>>(localStorage.getItem(PEOPLE_KEY), []);
  const personFunctionWeeks = parseJson<PersonFunctionWeek[]>(localStorage.getItem(PERSON_FUNCTION_WEEKS_KEY), []);
  const templates = parseJson<unknown[]>(localStorage.getItem(TEMPLATES_KEY), []);
  const personSchedules = parseJson<PersonSchedule[]>(localStorage.getItem(PERSON_SCHEDULES_KEY), []);
  const overrides = parseJson<ScheduleOverride[]>(localStorage.getItem(OVERRIDES_KEY), []);

  const people: Person[] = peopleRaw.map((person) => {
    if (typeof person.roleId === 'string') return { id: person.id, nombre: person.nombre, roleId: person.roleId };
    const fallbackRoleId = functions.find((fn) => fn.id === person.functionId)?.roleId ?? roles[0]?.id ?? '';
    return { id: person.id, nombre: person.nombre, roleId: fallbackRoleId };
  }).filter((person) => person.roleId);

  const migratedWeeks = [...personFunctionWeeks];
  const currentWeekStartISO = toISODate(startOfWeekMonday(new Date()));
  peopleRaw.forEach((person) => {
    if (!person.functionId) return;
    const exists = migratedWeeks.some((row) => row.personId === person.id && row.weekStartISO === currentWeekStartISO);
    if (!exists) migratedWeeks.push({ personId: person.id, weekStartISO: currentWeekStartISO, functionId: person.functionId });
  });

  const normalized = normalizeData({ roles, functions, people, personFunctionWeeks: migratedWeeks, templates: templates as ScheduleTemplate[], personSchedules, overrides });

  if (normalized.roles.length === 0 || normalized.functions.length === 0 || normalized.people.length === 0) {
    const seeded = createDemoData();
    saveAll(seeded);
    return seeded;
  }

  saveAll(normalized);
  return normalized;
};

export const saveAll = (next: StorageData) => {
  localStorage.setItem(ROLES_KEY, JSON.stringify(next.roles));
  localStorage.setItem(FUNCTIONS_KEY, JSON.stringify(next.functions));
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(next.people));
  localStorage.setItem(PERSON_FUNCTION_WEEKS_KEY, JSON.stringify(next.personFunctionWeeks));
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(next.templates));
  localStorage.setItem(PERSON_SCHEDULES_KEY, JSON.stringify(next.personSchedules));
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next.overrides));
};
