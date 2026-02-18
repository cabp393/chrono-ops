import { addDays } from './dateUtils';
import type { PersonSchedule, ScheduleDayKey, ScheduleDaySlot, ScheduleOverride, ScheduleTemplate } from '../types';

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

export const formatSlot = (slot: ScheduleDaySlot) => {
  if (!slot.start || !slot.end) return 'Libre';
  return `${slot.start}–${slot.end}${isOvernight(slot) ? ' (+1)' : ''}`;
};

export type ScheduleResolutionData = {
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
};

export const findScheduleOverride = (
  personId: string,
  dateISO: string,
  overrides: ScheduleOverride[]
): ScheduleOverride | undefined => overrides.find((item) => item.personId === personId && item.dateISO === dateISO);

export const resolveSchedule = (
  personId: string,
  dateISO: string,
  data: ScheduleResolutionData
): { source: 'override' | 'template' | 'none'; slot: ScheduleDaySlot } => {
  const override = findScheduleOverride(personId, dateISO, data.overrides);
  if (override) {
    return { source: 'override', slot: { start: override.start, end: override.end } };
  }

  const assignment = data.personSchedules.find((item) => item.personId === personId);
  const template = data.templates.find((item) => item.id === assignment?.templateId);

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
