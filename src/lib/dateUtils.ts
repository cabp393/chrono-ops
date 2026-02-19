export const startOfWeekMonday = (input: Date) => {
  const date = new Date(input);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (date: Date, days: number) => {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const formatTime24 = (date: Date) => {
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const parseHHmm = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { h: hours, m: minutes };
};

export const formatHour = (date: Date) => formatTime24(date);

export const formatWeekRange = (weekStart: Date) => {
  const end = addDays(weekStart, 6);
  const left = weekStart.toLocaleDateString([], { day: '2-digit', month: 'short' });
  const right = end.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  return `${left} - ${right}`;
};

export const formatDayHeader = (date: Date) =>
  date.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: '2-digit' });

export const toLocalDatetimeInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toLocalDateInput = (iso: string) => toLocalDatetimeInput(iso).slice(0, 10);

export const toLocalTimeInput = (iso: string) => toLocalDatetimeInput(iso).slice(11, 16);

export const fromLocalDateAndTime = (dateISO: string, timeHHmm: string) => `${dateISO}T${timeHHmm}:00`;
