import { addDays } from './dateUtils';
import { isValidSlot, resolveSchedule, toISODate } from './scheduleUtils';
import type { Function, Person, PersonWeekPlan, ScheduleBlock, ScheduleOverride, ScheduleTemplate, ShiftLabelMode } from '../types';

const buildLocalIso = (dateISO: string, timeHHMM: string) => `${dateISO}T${timeHHMM}:00`;

const endDateISO = (dateISO: string, start: string, end: string) => (end < start ? toISODate(addDays(new Date(`${dateISO}T00:00:00`), 1)) : dateISO);

export const buildWeekScheduleBlocks = (
  weekStart: Date,
  people: Person[],
  functions: Function[],
  templates: ScheduleTemplate[],
  personWeekPlans: PersonWeekPlan[],
  overrides: ScheduleOverride[],
  shiftLabelMode: ShiftLabelMode
): ScheduleBlock[] => {
  const weekStartISO = toISODate(weekStart);
  const functionsById = new Map(functions.map((fn) => [fn.id, fn]));
  const templatesById = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const planByPersonId = new Map(
    personWeekPlans
      .filter((item) => item.weekStartISO === weekStartISO)
      .map((item) => [item.personId, item])
  );

  return people.flatMap((person) => {
    const plan = planByPersonId.get(person.id);
    if (!plan) return [];
    const fn = plan.functionId ? functionsById.get(plan.functionId) : undefined;
    if (!fn) return [];

    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const dateISO = toISODate(date);
      const template = plan.templateId ? templatesById.get(plan.templateId) : undefined;
      const { slot } = resolveSchedule(person.id, dateISO, template, overrides);

      if (!isValidSlot(slot) || !slot.start || !slot.end) return null;

      const endISODate = endDateISO(dateISO, slot.start, slot.end);
      const labelText = shiftLabelMode === 'person' ? person.nombre : fn.nombre;

      return {
        id: `${person.id}_${dateISO}`,
        personId: person.id,
        dateISO,
        startISO: buildLocalIso(dateISO, slot.start),
        endISO: buildLocalIso(endISODate, slot.end),
        labelText,
        roleId: fn.roleId,
        functionId: fn.id
      } satisfies ScheduleBlock;
    }).filter((item): item is ScheduleBlock => !!item);
  });
};
