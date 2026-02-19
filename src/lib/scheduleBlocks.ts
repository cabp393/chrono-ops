import { addDays } from './dateUtils';
import { resolvePersonFunctionIdForWeek, resolveSchedule, toISODate } from './scheduleUtils';
import type { Function, Person, PersonFunctionWeek, PersonSchedule, ScheduleBlock, ScheduleOverride, ScheduleTemplate, ShiftLabelMode } from '../types';

const buildLocalIso = (dateISO: string, timeHHMM: string) => `${dateISO}T${timeHHMM}:00`;

const endDateISO = (dateISO: string, start: string, end: string) => (end < start ? toISODate(addDays(new Date(`${dateISO}T00:00:00`), 1)) : dateISO);

export const buildWeekScheduleBlocks = (
  weekStart: Date,
  people: Person[],
  functions: Function[],
  personFunctionWeeks: PersonFunctionWeek[],
  templates: ScheduleTemplate[],
  personSchedules: PersonSchedule[],
  overrides: ScheduleOverride[],
  shiftLabelMode: ShiftLabelMode
): ScheduleBlock[] => {
  const functionsById = new Map(functions.map((fn) => [fn.id, fn]));
  const templatesById = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const assignmentByPersonId = new Map(personSchedules.map((item) => [item.personId, item.templateId]));
  const weekStartISO = toISODate(weekStart);

  return people.flatMap((person) => {
    const functionId = resolvePersonFunctionIdForWeek(person.id, person.roleId, weekStartISO, functions, personFunctionWeeks);
    if (!functionId) return [];
    const fn = functionsById.get(functionId);
    if (!fn) return [];

    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const dateISO = toISODate(date);
      const templateId = assignmentByPersonId.get(person.id) ?? null;
      const template = templateId ? templatesById.get(templateId) : undefined;
      const { slot } = resolveSchedule(person.id, dateISO, template, overrides);

      if (!slot.start || !slot.end) return null;

      const endISODate = endDateISO(dateISO, slot.start, slot.end);
      const labelText = shiftLabelMode === 'person' ? person.nombre : fn.nombre;

      return {
        id: `${person.id}_${dateISO}`,
        personId: person.id,
        dateISO,
        startISO: buildLocalIso(dateISO, slot.start),
        endISO: buildLocalIso(endISODate, slot.end),
        labelText,
        roleId: person.roleId,
        functionId: fn.id
      } satisfies ScheduleBlock;
    }).filter((item): item is ScheduleBlock => !!item);
  });
};
