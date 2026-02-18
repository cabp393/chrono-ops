export type Role = {
  id: string;
  nombre: string;
  color?: string;
};

export type Person = {
  id: string;
  nombre: string;
  rolId: string;
};

export type Shift = {
  id: string;
  personId: string;
  rolId: string;
  startISO: string;
  endISO: string;
  etiqueta?: string;
};

export type TimeScale = 30 | 60 | 120 | 180 | 240 | 360;

export type AppData = {
  roles: Role[];
  people: Person[];
  shifts: Shift[];
};

export type CoverageBlock = {
  start: Date;
  end: Date;
  total: number;
  byRole: Record<string, number>;
};
