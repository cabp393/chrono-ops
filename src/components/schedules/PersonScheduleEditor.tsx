import { formatWeekRange } from '../../lib/dateUtils';
import { ChevronLeft, ChevronRight, Target } from '../../lib/icons';
import type { Function, Person, PersonSchedule, ScheduleOverride, ScheduleTemplate } from '../../types';
import { WeekScheduleTable } from './WeekScheduleTable';

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

export const PersonScheduleEditor = ({
  person,
  functions,
  templates,
  personSchedules,
  overrides,
  weekStart,
  isCurrentWeek,
  hasUnsavedChanges,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onTemplateChange,
  onOpenTemplateModal,
  onUpsertOverride,
  onRevertOverride,
  onReset,
  onSave
}: Props) => {
  if (!person) {
    return <section className="card"><p>Selecciona una persona para editar horarios.</p></section>;
  }

  const fn = functions.find((item) => item.id === person.functionId);
  const assignment = personSchedules.find((item) => item.personId === person.id);
  const template = templates.find((item) => item.id === assignment?.templateId);

  return (
    <section className="schedule-editor-col">
      <header className="card schedule-editor-header">
        <div>
          <h3>{person.nombre}</h3>
          <p>{fn?.nombre ?? 'Sin función'}</p>
        </div>
        <div className="week-controls">
          <button className={`icon-btn current-week-icon ${isCurrentWeek ? 'active' : ''}`} onClick={onCurrentWeek} title="Semana actual"><Target size={15} /></button>
          <button className="icon-btn" onClick={onPrevWeek}><ChevronLeft size={16} /></button>
          <span className="week-label">{formatWeekRange(weekStart)}</span>
          <button className="icon-btn" onClick={onNextWeek}><ChevronRight size={16} /></button>
        </div>
      </header>

      <section className="card template-assignment-card">
        <h3>Plantilla asignada</h3>
        <div className="template-assignment-row">
          <select value={assignment?.templateId ?? ''} onChange={(event) => onTemplateChange(event.target.value || null)}>
            <option value="">Sin plantilla</option>
            {templates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button onClick={onOpenTemplateModal}>Gestionar plantillas</button>
        </div>
        <p>Actual: <strong>{template?.name ?? 'Sin plantilla'}</strong></p>
      </section>

      <WeekScheduleTable
        personId={person.id}
        weekStart={weekStart}
        templates={templates}
        personSchedules={personSchedules}
        overrides={overrides}
        onUpsertOverride={onUpsertOverride}
        onRevertOverride={onRevertOverride}
      />

      <footer className="filters-footer schedule-footer">
        <div className="filters-footer-actions">
          <button className="footer-reset" onClick={onReset}>Reiniciar</button>
          <button className="primary footer-apply" onClick={onSave}>Guardar cambios</button>
        </div>
        {hasUnsavedChanges ? <span className="pending-badge">Cambios sin guardar</span> : null}
      </footer>
    </section>
  );
};
