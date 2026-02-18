import type { Shift, ShiftDaySegment } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => `${value}`.padStart(2, '0');

export const toDayKey = (date: Date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
);

const startOfDay = (date: Date) => {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
};

export const splitShiftByDay = (shift: Shift): ShiftDaySegment[] => {
  const startMs = new Date(shift.startISO).getTime();
  const endMs = new Date(shift.endISO).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];

  const segments: ShiftDaySegment[] = [];
  let cursor = startOfDay(new Date(startMs));

  while (cursor.getTime() < endMs) {
    const dayStartMs = cursor.getTime();
    const dayEndMs = dayStartMs + DAY_MS;
    const segStartMs = Math.max(startMs, dayStartMs);
    const segEndMs = Math.min(endMs, dayEndMs);

    if (segEndMs > segStartMs) {
      segments.push({
        shiftId: shift.id,
        personId: shift.personId,
        dayKey: toDayKey(cursor),
        segStartISO: new Date(segStartMs).toISOString(),
        segEndISO: new Date(segEndMs).toISOString()
      });
    }

    cursor = new Date(dayEndMs);
  }

  return segments;
};
