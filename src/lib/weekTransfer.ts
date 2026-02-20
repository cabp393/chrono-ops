import { addDays, parseHHmm, startOfWeekMonday } from './dateUtils';
import { DAY_KEYS, getDayKey, toISODate } from './scheduleUtils';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, Role, ScheduleDayKey, ScheduleDaySlot, ScheduleOverride, ScheduleTemplate } from '../types';

export const EXPORT_COLUMNS = [
  'fecha_semana_inicio',
  'persona',
  'rol',
  'funcion',
  'plantilla',
  'lun_entrada',
  'lun_salida',
  'mar_entrada',
  'mar_salida',
  'mie_entrada',
  'mie_salida',
  'jue_entrada',
  'jue_salida',
  'vie_entrada',
  'vie_salida',
  'sab_entrada',
  'sab_salida',
  'dom_entrada',
  'dom_salida'
] as const;

const DAY_COLUMN_MAP: Record<ScheduleDayKey, { start: string; end: string; label: string }> = {
  mon: { start: 'lun_entrada', end: 'lun_salida', label: 'Lun' },
  tue: { start: 'mar_entrada', end: 'mar_salida', label: 'Mar' },
  wed: { start: 'mie_entrada', end: 'mie_salida', label: 'Mié' },
  thu: { start: 'jue_entrada', end: 'jue_salida', label: 'Jue' },
  fri: { start: 'vie_entrada', end: 'vie_salida', label: 'Vie' },
  sat: { start: 'sab_entrada', end: 'sab_salida', label: 'Sáb' },
  sun: { start: 'dom_entrada', end: 'dom_salida', label: 'Dom' }
};

type ImportRow = {
  rowNumber: number;
  persona: string;
  rol: string;
  funcion: string;
  plantilla: string;
  slots: Record<ScheduleDayKey, ScheduleDaySlot>;
};

export type ImportError = { rowNumber: number; message: string };
export type ImportWarning = { rowNumber: number; dayKey: ScheduleDayKey; message: string };

export type ImportPreview = {
  importedWorkers: number;
  newPeople: string[];
  newRoles: string[];
  newFunctions: string[];
  newTemplates: string[];
  warnings: ImportWarning[];
  errors: ImportError[];
};

export type ImportApplyPayload = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
};

const normalize = (value: string) => value.trim().toLowerCase();

const normalizeCell = (value: unknown) => {
  if (value == null) return '';
  return String(value).trim();
};

const parseTimeCell = (value: unknown): { value: string | null; error: string | null } => {
  const normalized = normalizeCell(value);
  if (!normalized) return { value: null, error: null };
  const parsed = parseHHmm(normalized);
  if (!parsed) return { value: null, error: `Hora inválida "${normalized}". Debe usar formato hh:mm 24h.` };
  return { value: normalized, error: null };
};

const parseSlot = (startRaw: unknown, endRaw: unknown): { slot: ScheduleDaySlot; error: string | null } => {
  const start = parseTimeCell(startRaw);
  const end = parseTimeCell(endRaw);
  if (start.error) return { slot: { start: null, end: null }, error: start.error };
  if (end.error) return { slot: { start: null, end: null }, error: end.error };
  if ((start.value && !end.value) || (!start.value && end.value)) {
    return { slot: { start: start.value, end: end.value }, error: 'Debe indicar entrada y salida o dejar ambas vacías.' };
  }
  if (start.value && end.value && start.value === end.value) {
    return { slot: { start: start.value, end: end.value }, error: 'Entrada y salida no pueden ser iguales.' };
  }
  return { slot: { start: start.value, end: end.value }, error: null };
};

export const listWeeksWithData = (personWeekPlans: PersonWeekPlan[], personFunctionWeeks: PersonFunctionWeek[], overrides: ScheduleOverride[]) => {
  const weekSet = new Set<string>();
  personWeekPlans.forEach((item) => weekSet.add(item.weekStartISO));
  personFunctionWeeks.forEach((item) => weekSet.add(item.weekStartISO));
  overrides.forEach((item) => weekSet.add(toISODate(startOfWeekMonday(new Date(`${item.dateISO}T00:00:00`)))));
  return [...weekSet].sort();
};

export const copyWeekData = ({
  sourceWeekISO,
  targetWeekISO,
  personWeekPlans,
  personFunctionWeeks,
  overrides
}: {
  sourceWeekISO: string;
  targetWeekISO: string;
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
}) => {
  const cleanWeekPlans = personWeekPlans.filter((item) => item.weekStartISO !== targetWeekISO);
  const cleanFunctionWeeks = personFunctionWeeks.filter((item) => item.weekStartISO !== targetWeekISO);
  const targetDates = new Set(Array.from({ length: 7 }, (_, index) => toISODate(addDays(new Date(`${targetWeekISO}T00:00:00`), index))));
  const cleanOverrides = overrides.filter((item) => !targetDates.has(item.dateISO));

  const sourcePlans = personWeekPlans
    .filter((item) => item.weekStartISO === sourceWeekISO)
    .map((item) => ({ ...item, weekStartISO: targetWeekISO }));
  const sourceFunctions = personFunctionWeeks
    .filter((item) => item.weekStartISO === sourceWeekISO)
    .map((item) => ({ ...item, weekStartISO: targetWeekISO }));

  const sourceStart = new Date(`${sourceWeekISO}T00:00:00`);
  const targetStart = new Date(`${targetWeekISO}T00:00:00`);
  const sourceOverrides = overrides
    .filter((item) => {
      const weekISO = toISODate(startOfWeekMonday(new Date(`${item.dateISO}T00:00:00`)));
      return weekISO === sourceWeekISO;
    })
    .map((item) => {
      const sourceDate = new Date(`${item.dateISO}T00:00:00`);
      const dayIndex = Math.round((sourceDate.getTime() - sourceStart.getTime()) / (24 * 60 * 60 * 1000));
      return {
        ...item,
        id: crypto.randomUUID(),
        dateISO: toISODate(addDays(targetStart, dayIndex))
      };
    });

  return {
    personWeekPlans: [...cleanWeekPlans, ...sourcePlans],
    personFunctionWeeks: [...cleanFunctionWeeks, ...sourceFunctions],
    overrides: [...cleanOverrides, ...sourceOverrides]
  };
};

export const buildWeekExportRows = ({
  weekStartISO,
  people,
  roles,
  functions,
  templates,
  personWeekPlans,
  personFunctionWeeks,
  overrides
}: {
  weekStartISO: string;
  people: Person[];
  roles: Role[];
  functions: Function[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
}) => people
  .slice()
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  .map((person) => {
    const role = roles.find((item) => item.id === person.roleId);
    const weekPlan = personWeekPlans.find((item) => item.personId === person.id && item.weekStartISO === weekStartISO);
    const functionWeek = personFunctionWeeks.find((item) => item.personId === person.id && item.weekStartISO === weekStartISO);
    const template = templates.find((item) => item.id === weekPlan?.templateId);
    const fn = functions.find((item) => item.id === functionWeek?.functionId);

    const row: Record<string, string> = {
      fecha_semana_inicio: weekStartISO,
      persona: person.nombre,
      rol: role?.nombre ?? '',
      funcion: fn?.nombre ?? '',
      plantilla: template?.name ?? ''
    };

    DAY_KEYS.forEach((dayKey, index) => {
      const dateISO = toISODate(addDays(new Date(`${weekStartISO}T00:00:00`), index));
      const override = overrides.find((item) => item.personId === person.id && item.dateISO === dateISO);
      const baseSlot = template?.days[dayKey] ?? { start: null, end: null };
      const slot = override ? { start: override.start, end: override.end } : baseSlot;
      row[DAY_COLUMN_MAP[dayKey].start] = slot.start ?? '';
      row[DAY_COLUMN_MAP[dayKey].end] = slot.end ?? '';
    });

    return row;
  });

export const parseImportSheet = (rows: Record<string, unknown>[]) => {
  const errors: ImportError[] = [];
  const parsedRows: ImportRow[] = [];

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const persona = normalizeCell(rawRow.persona);
    const rol = normalizeCell(rawRow.rol);
    const funcion = normalizeCell(rawRow.funcion);
    const plantilla = normalizeCell(rawRow.plantilla);

    const isCompletelyEmpty = !persona && !rol && !funcion && !plantilla && DAY_KEYS.every((dayKey) => {
      const cols = DAY_COLUMN_MAP[dayKey];
      return !normalizeCell(rawRow[cols.start]) && !normalizeCell(rawRow[cols.end]);
    });

    if (isCompletelyEmpty) return;

    if (!persona) errors.push({ rowNumber, message: 'Persona es obligatoria.' });
    if (!rol) errors.push({ rowNumber, message: 'Rol es obligatorio.' });

    const slots = {} as Record<ScheduleDayKey, ScheduleDaySlot>;
    DAY_KEYS.forEach((dayKey) => {
      const cols = DAY_COLUMN_MAP[dayKey];
      const { slot, error } = parseSlot(rawRow[cols.start], rawRow[cols.end]);
      slots[dayKey] = slot;
      if (error) {
        errors.push({ rowNumber, message: `${cols.label}: ${error}` });
      }
    });

    parsedRows.push({ rowNumber, persona, rol, funcion, plantilla, slots });
  });

  return { parsedRows, errors };
};

const sameSlot = (a: ScheduleDaySlot, b: ScheduleDaySlot) => a.start === b.start && a.end === b.end;

export const buildImportPreview = ({
  rows,
  weekStartISO,
  roles,
  functions,
  people,
  templates,
  personWeekPlans,
  personFunctionWeeks,
  overrides,
  parseErrors
}: {
  rows: ImportRow[];
  weekStartISO: string;
  roles: Role[];
  functions: Function[];
  people: Person[];
  templates: ScheduleTemplate[];
  personWeekPlans: PersonWeekPlan[];
  personFunctionWeeks: PersonFunctionWeek[];
  overrides: ScheduleOverride[];
  parseErrors: ImportError[];
}): { preview: ImportPreview; applyPayload: ImportApplyPayload } => {
  const errors = [...parseErrors];
  const warnings: ImportWarning[] = [];

  const roleByKey = new Map(roles.map((role) => [normalize(role.nombre), role]));
  const functionByKey = new Map(functions.map((fn) => [normalize(fn.nombre), fn]));
  const peopleByKey = new Map(people.map((person) => [normalize(person.nombre), person]));
  const templateByKey = new Map(templates.map((template) => [normalize(template.name), template]));

  const nextRoles = [...roles];
  const nextFunctions = [...functions];
  const nextPeople = [...people];
  const nextTemplates = templates.map((template) => ({
    ...template,
    days: {
      mon: { ...template.days.mon }, tue: { ...template.days.tue }, wed: { ...template.days.wed },
      thu: { ...template.days.thu }, fri: { ...template.days.fri }, sat: { ...template.days.sat }, sun: { ...template.days.sun }
    }
  }));

  const newRoleNames = new Set<string>();
  const newFunctionNames = new Set<string>();
  const newPersonNames = new Set<string>();
  const newTemplateNames = new Set<string>();

  const rowAssignments: Array<{ row: ImportRow; personId: string; functionId: string | null; templateId: string | null; rowSlots: Record<ScheduleDayKey, ScheduleDaySlot> }> = [];

  rows.forEach((row) => {
    const roleKey = normalize(row.rol);
    let role = roleByKey.get(roleKey);
    if (!role) {
      role = { id: crypto.randomUUID(), nombre: row.rol };
      roleByKey.set(roleKey, role);
      nextRoles.push(role);
      newRoleNames.add(role.nombre);
    }

    let fnId: string | null = null;
    if (row.funcion) {
      const functionKey = normalize(row.funcion);
      let fn = functionByKey.get(functionKey);
      if (fn && fn.roleId !== role.id) {
        errors.push({ rowNumber: row.rowNumber, message: `La función "${row.funcion}" no pertenece al rol "${row.rol}".` });
      } else {
        if (!fn) {
          fn = { id: crypto.randomUUID(), nombre: row.funcion, roleId: role.id };
          functionByKey.set(functionKey, fn);
          nextFunctions.push(fn);
          newFunctionNames.add(fn.nombre);
        }
        fnId = fn.id;
      }
    }

    const personKey = normalize(row.persona);
    let person = peopleByKey.get(personKey);
    if (person && person.roleId !== role.id) {
      errors.push({ rowNumber: row.rowNumber, message: `La persona "${row.persona}" existe con un rol distinto.` });
      return;
    }
    if (!person) {
      person = { id: crypto.randomUUID(), nombre: row.persona, roleId: role.id };
      peopleByKey.set(personKey, person);
      nextPeople.push(person);
      newPersonNames.add(person.nombre);
    }

    let templateId: string | null = null;
    if (row.plantilla) {
      const templateKey = normalize(row.plantilla);
      let template = templateByKey.get(templateKey);
      if (!template) {
        template = {
          id: crypto.randomUUID(),
          name: row.plantilla,
          days: {
            mon: { ...row.slots.mon }, tue: { ...row.slots.tue }, wed: { ...row.slots.wed },
            thu: { ...row.slots.thu }, fri: { ...row.slots.fri }, sat: { ...row.slots.sat }, sun: { ...row.slots.sun }
          }
        };
        templateByKey.set(templateKey, template);
        nextTemplates.push(template);
        newTemplateNames.add(template.name);
      }
      templateId = template.id;
      DAY_KEYS.forEach((dayKey) => {
        if (!sameSlot(template.days[dayKey], row.slots[dayKey])) {
          warnings.push({ rowNumber: row.rowNumber, dayKey, message: `${row.persona} (${DAY_COLUMN_MAP[dayKey].label}) será ajuste respecto a plantilla "${template.name}".` });
        }
      });
    }

    rowAssignments.push({ row, personId: person.id, functionId: fnId, templateId, rowSlots: row.slots });
  });

  const weekDates = DAY_KEYS.map((_, index) => toISODate(addDays(new Date(`${weekStartISO}T00:00:00`), index)));
  const cleanWeekPlans = personWeekPlans.filter((item) => item.weekStartISO !== weekStartISO);
  const cleanFunctionWeeks = personFunctionWeeks.filter((item) => item.weekStartISO !== weekStartISO);
  const cleanOverrides = overrides.filter((item) => !weekDates.includes(item.dateISO));

  const nextWeekPlans = [...cleanWeekPlans];
  const nextFunctionWeeks = [...cleanFunctionWeeks];
  const nextOverrides = [...cleanOverrides];

  rowAssignments.forEach(({ personId, functionId, templateId, rowSlots }) => {
    nextWeekPlans.push({ personId, weekStartISO, templateId });
    nextFunctionWeeks.push({ personId, weekStartISO, functionId });

    DAY_KEYS.forEach((dayKey, index) => {
      const dateISO = weekDates[index];
      const slot = rowSlots[dayKey];
      if (!templateId) {
        if (slot.start || slot.end) {
          nextOverrides.push({ id: crypto.randomUUID(), personId, dateISO, start: slot.start, end: slot.end });
        }
        return;
      }
      const template = nextTemplates.find((item) => item.id === templateId);
      if (!template) return;
      if (!sameSlot(slot, template.days[dayKey])) {
        nextOverrides.push({ id: crypto.randomUUID(), personId, dateISO, start: slot.start, end: slot.end });
      }
    });
  });

  return {
    preview: {
      importedWorkers: rowAssignments.length,
      newPeople: [...newPersonNames],
      newRoles: [...newRoleNames],
      newFunctions: [...newFunctionNames],
      newTemplates: [...newTemplateNames],
      warnings,
      errors
    },
    applyPayload: {
      roles: nextRoles,
      functions: nextFunctions,
      people: nextPeople,
      templates: nextTemplates,
      personWeekPlans: nextWeekPlans,
      personFunctionWeeks: nextFunctionWeeks,
      overrides: nextOverrides
    }
  };
};
