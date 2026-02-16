import type { TimeRange } from '../types';

export const MINUTES_PER_DAY = 24 * 60;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface TimeSegment {
  start: number;
  end: number;
}

function assertFiniteMinute(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${label} must be a finite integer minute value`);
  }
}

function normalizeMinuteInDay(value: number): number {
  const mod = value % MINUTES_PER_DAY;
  return mod < 0 ? mod + MINUTES_PER_DAY : mod;
}

function normalizeRange(range: TimeRange): TimeRange {
  assertFiniteMinute(range.start, 'range.start');
  assertFiniteMinute(range.end, 'range.end');

  return {
    start: normalizeMinuteInDay(range.start),
    end: normalizeMinuteInDay(range.end)
  };
}

export function minutesToTime(minutes: number): string {
  assertFiniteMinute(minutes, 'minutes');

  if (minutes === MINUTES_PER_DAY) {
    return '24:00';
  }

  const normalized = normalizeMinuteInDay(minutes);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeToMinutes(value: string): number {
  if (value === '24:00') {
    return MINUTES_PER_DAY;
  }

  const match = TIME_24H_REGEX.exec(value);
  if (!match) {
    throw new Error(`Invalid time format: "${value}". Expected HH:MM in 24h format.`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours * 60 + minutes;
}

export function calculateDuration(range: TimeRange): number {
  const normalized = normalizeRange(range);

  if (normalized.end === normalized.start) {
    return 0;
  }

  if (normalized.end > normalized.start) {
    return normalized.end - normalized.start;
  }

  return MINUTES_PER_DAY - normalized.start + normalized.end;
}

export function getShiftSegments(range: TimeRange): TimeSegment[] {
  const normalized = normalizeRange(range);

  if (normalized.end === normalized.start) {
    return [];
  }

  if (normalized.end > normalized.start) {
    return [{ start: normalized.start, end: normalized.end }];
  }

  return [
    { start: normalized.start, end: MINUTES_PER_DAY },
    { start: 0, end: normalized.end }
  ];
}

/**
 * Validates that `inner` is fully contained by `outer`, including
 * ranges that cross midnight.
 */
export function isRangeValid(inner: TimeRange, outer: TimeRange): boolean {
  const innerDuration = calculateDuration(inner);
  const outerDuration = calculateDuration(outer);

  if (innerDuration === 0) return true;
  if (outerDuration === 0) return false;

  const innerSegments = getShiftSegments(inner);
  const outerSegments = getShiftSegments(outer);

  return innerSegments.every((innerSegment) =>
    outerSegments.some(
      (outerSegment) =>
        innerSegment.start >= outerSegment.start && innerSegment.end <= outerSegment.end
    )
  );
}
