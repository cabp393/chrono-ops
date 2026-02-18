export type Role = {
  id: string;
  nombre: string;
  color?: string;
};

export type Function = {
  id: string;
  roleId: string;
  nombre: string;
};

export type Person = {
  id: string;
  nombre: string;
  functionId: string;
};

export type Shift = {
  id: string;
  personId: string;
  startISO: string;
  endISO: string;
  etiqueta?: string;
};

export type TimeScale = 30 | 60 | 120 | 180 | 240 | 360;

export type ShiftLabelMode = 'person' | 'function';

export type AppData = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  shifts: Shift[];
};

export type CoverageBlock = {
  start: Date;
  end: Date;
  total: number;
  byRole: Record<string, number>;
};

export type AppliedFilters = {
  searchText: string;
  roleIds: string[];
  functionIds: string[];
};

export type AppliedViewState = AppliedFilters & {
  timeScale: TimeScale;
  shiftLabelMode: ShiftLabelMode;
};
