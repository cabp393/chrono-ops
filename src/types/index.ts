export type Minute = number;

/**
 * Represents a range of time in minutes (0 = 00:00, 1440 = 24:00).
 * If end < start, the range is considered to cross midnight.
 */
export interface TimeRange {
  start: Minute;
  end: Minute;
}

/** Base shift template definition. */
export interface Shift {
  id: string;
  name: string;
  color: string;
  workRange: TimeRange;
  breakRange: TimeRange | null;
}

/**
 * Specific assignment for a weekday row in the weekly timeline.
 * dayIndex: 0 = Monday, 6 = Sunday.
 */
export interface DayAssignment {
  dayIndex: number;
  shiftId: string;
  overrideWorkRange?: TimeRange;
  overrideBreakRange?: TimeRange;
}

export interface AppSettings {
  resolution: 15 | 30 | 60;
  weeklyTarget: number;
}

export interface AppUiState {
  selectedShiftId: string | null;
  selectedDayIndex: number | null;
}

export interface AppState {
  shifts: Shift[];
  schedule: Record<number, DayAssignment>;
  settings: AppSettings;
  ui: AppUiState;
}
