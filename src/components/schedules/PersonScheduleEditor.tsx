import type { Function, Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../../types';

type Props = {
  person: Person | undefined;
  functions: Function[];
  templates: ScheduleTemplate[];
  personSchedules: PersonSchedule[];
  overrides: ScheduleOverride[];
  weekStart: Date;
  isCurrentWeek: boolean;
  hasUnsavedChanges: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onTemplateChange: (templateId: string | null) => void;
  onOpenTemplateModal: () => void;
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
  onRevertOverride: (dateISO: string) => void;
  onReset: () => void;
  onSave: () => void;
};

export const PersonScheduleEditor = ({ person }: Props) => {
  if (!person) return <section className="card"><p>Selecciona una persona para editar horarios.</p></section>;
  return <section className="card"><h3>{person.nombre}</h3></section>;
};
