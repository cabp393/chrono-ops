import type { Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../types';
import { addDays, startOfWeekMonday } from './dateUtils';
import { createEmptyTemplateDays, toISODate } from './scheduleUtils';

const TEMPLATES_KEY = 'shiftboard_templates';
const PERSON_SCHEDULES_KEY = 'shiftboard_personSchedules';
const OVERRIDES_KEY = 'shiftboard_overrides';

export type ScheduleData = {
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
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
  const normalized = {
    mon: isSlotValue(days.mon) ? { ...days.mon } : fallback.mon,
    tue: isSlotValue(days.tue) ? { ...days.tue } : fallback.tue,
    wed: isSlotValue(days.wed) ? { ...days.wed } : fallback.wed,
    thu: isSlotValue(days.thu) ? { ...days.thu } : fallback.thu,
    fri: isSlotValue(days.fri) ? { ...days.fri } : fallback.fri,
    sat: isSlotValue(days.sat) ? { ...days.sat } : fallback.sat,
    sun: isSlotValue(days.sun) ? { ...days.sun } : fallback.sun
  };
  return { id: row.id, name: row.name, days: normalized };
};

const parseJson = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
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

  return [
    make('Mañana', '06:00', '14:00'),
    make('Tarde', '14:00', '22:00'),
    make('Noche', '22:00', '06:00')
  ];
};

const createDemoScheduleData = (people: Person[]): ScheduleData => {
  const templates = createDemoTemplates();
  const personSchedules: PersonSchedule[] = people.map((person, index) => ({
    personId: person.id,
    templateId: index % 3 === 0 ? templates[0].id : index % 3 === 1 ? templates[1].id : null
  }));

  if (people[2]) personSchedules[2] = { personId: people[2].id, templateId: templates[2].id };

  const weekStart = startOfWeekMonday(new Date());
  const thursday = toISODate(addDays(weekStart, 3));
  const saturday = toISODate(addDays(weekStart, 5));

  const overrides: ScheduleOverride[] = [];
  if (people[0]) {
    overrides.push({
      id: crypto.randomUUID(),
      personId: people[0].id,
      dateISO: thursday,
      start: '06:00',
      end: '13:00',
      note: 'Sale 1h antes'
    });
  }
  if (people[1]) {
    overrides.push({
      id: crypto.randomUUID(),
      personId: people[1].id,
      dateISO: saturday,
      start: null,
      end: null,
      note: 'Libre por ajuste'
    });
  }

  return { templates, personSchedules, overrides };
};

export const loadScheduleData = (people: Person[]): ScheduleData => {
  const rawTemplates = parseJson<unknown[]>(localStorage.getItem(TEMPLATES_KEY), []);
  const rawPersonSchedules = parseJson<PersonSchedule[]>(localStorage.getItem(PERSON_SCHEDULES_KEY), []);
  const rawOverrides = parseJson<ScheduleOverride[]>(localStorage.getItem(OVERRIDES_KEY), []);

  const templates = rawTemplates.map(normalizeTemplate).filter((item): item is ScheduleTemplate => !!item);
  const personIds = new Set(people.map((item) => item.id));

  const personSchedules = rawPersonSchedules
    .filter((item) => item && typeof item.personId === 'string' && personIds.has(item.personId))
    .map((item) => ({ personId: item.personId, templateId: typeof item.templateId === 'string' ? item.templateId : null }));

  const overrides = rawOverrides.filter((item) => item
    && typeof item.id === 'string'
    && typeof item.personId === 'string'
    && personIds.has(item.personId)
    && typeof item.dateISO === 'string'
    && (item.start === null || typeof item.start === 'string')
    && (item.end === null || typeof item.end === 'string'));

  if (templates.length === 0 && personSchedules.length === 0 && overrides.length === 0) {
    const demo = createDemoScheduleData(people);
    saveScheduleData(demo);
    return demo;
  }

  return { templates, personSchedules, overrides };
};

export const saveScheduleData = ({ templates, personSchedules, overrides }: ScheduleData) => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  localStorage.setItem(PERSON_SCHEDULES_KEY, JSON.stringify(personSchedules));
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
};
