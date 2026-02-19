import { addDays } from './dateUtils';
import type { ScheduleDayKey, ScheduleDaySlot, ScheduleOverride, ScheduleTemplate } from '../types';

export const DAY_KEYS: ScheduleDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<ScheduleDayKey, string> = {
  mon: 'Lun',
  tue: 'Mar',
  wed: 'Mié',
  thu: 'Jue',
  fri: 'Vie',
  sat: 'Sáb',
  sun: 'Dom'
};

export const createEmptyDaySlot = (): ScheduleDaySlot => ({ start: null, end: null });

export const createEmptyTemplateDays = () => ({
  mon: createEmptyDaySlot(),
  tue: createEmptyDaySlot(),
  wed: createEmptyDaySlot(),
  thu: createEmptyDaySlot(),
  fri: createEmptyDaySlot(),
  sat: createEmptyDaySlot(),
  sun: createEmptyDaySlot()
});

export const createTemplate = (name: string): ScheduleTemplate => ({
  id: crypto.randomUUID(),
  name,
  days: createEmptyTemplateDays()
});

export const toISODate = (date: Date) => {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getDayKey = (date: Date): ScheduleDayKey => DAY_KEYS[(date.getDay() + 6) % 7];

export const weekDates = (weekStart: Date) => DAY_KEYS.map((_, index) => addDays(weekStart, index));

export const formatDateCompact = (date: Date) => toISODate(date);

export const isOvernight = (slot: ScheduleDaySlot) => !!slot.start && !!slot.end && slot.end < slot.start;

export const slotValidationError = (slot: ScheduleDaySlot) => {
  const hasStart = !!slot.start;
  const hasEnd = !!slot.end;
  if (!hasStart && !hasEnd) return null;
  if (hasStart !== hasEnd) return 'Define hora de inicio y término.';
  if (slot.start === slot.end) return 'Inicio y término no pueden ser iguales.';
  return null;
};

export const isValidSlot = (slot: ScheduleDaySlot) => slotValidationError(slot) === null;

export const formatSlot = (slot: ScheduleDaySlot) => {
  if (!slot.start && !slot.end) return 'Libre';
  const error = slotValidationError(slot);
  if (error) return error;
  return `${slot.start}–${slot.end}${isOvernight(slot) ? ' (+1)' : ''}`;
};

export const resolveSchedule = (
  personId: string,
  dateISO: string,
  template: ScheduleTemplate | undefined,
  overrides: ScheduleOverride[]
): { source: 'override' | 'template' | 'none'; slot: ScheduleDaySlot } => {
  const override = overrides.find((item) => item.personId === personId && item.dateISO === dateISO);
  if (override) {
    return { source: 'override', slot: { start: override.start, end: override.end } };
  }

  if (template) {
    const [year, month, day] = dateISO.split('-').map(Number);
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return { source: 'template', slot: template.days[getDayKey(date)] };
  }

  return { source: 'none', slot: createEmptyDaySlot() };
};

export const cloneTemplate = (template: ScheduleTemplate): ScheduleTemplate => ({
  ...template,
  days: {
    mon: { ...template.days.mon },
    tue: { ...template.days.tue },
    wed: { ...template.days.wed },
    thu: { ...template.days.thu },
    fri: { ...template.days.fri },
    sat: { ...template.days.sat },
    sun: { ...template.days.sun }
  }
});
