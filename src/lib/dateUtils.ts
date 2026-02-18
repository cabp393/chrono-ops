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

export const formatHour = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
