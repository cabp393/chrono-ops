import { formatWeekRange } from '../../lib/dateUtils';
import { ChevronLeft, ChevronRight, Target } from '../../lib/icons';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, ScheduleOverride, ScheduleTemplate } from '../../types';
import { WeekScheduleTable } from './WeekScheduleTable';

type Props = {
  person: Person | undefined;
  functions: Function[];
  templates: ScheduleTemplate[];
  weekPlan: PersonWeekPlan | undefined;
  functionWeek: PersonFunctionWeek | undefined;
  overrides: ScheduleOverride[];
  weekStart: Date;
  isCurrentWeek: boolean;
  hasUnsavedChanges: boolean;
  hasInvalidSlots: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onTemplateChange: (templateId: string | null) => void;
  onFunctionChange: (functionId: string | null) => void;
  onOpenTemplateModal: () => void;
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
  onRevertOverride: (dateISO: string) => void;
  onReset: () => void;
  onSave: () => void;
};

export const PersonScheduleEditor = ({ person, functions, templates, weekPlan, functionWeek, overrides, weekStart, isCurrentWeek, hasUnsavedChanges, hasInvalidSlots, onPrevWeek, onNextWeek, onCurrentWeek, onTemplateChange, onFunctionChange, onOpenTemplateModal, onUpsertOverride, onRevertOverride, onReset, onSave }: Props) => {
  if (!person) return <section className="card"><p>Selecciona una persona para editar horarios.</p></section>;

  const roleFunctions = functions.filter((item) => item.roleId === person.roleId);
  const selectedFunction = roleFunctions.find((item) => item.id === functionWeek?.functionId);
  const selectedTemplate = templates.find((item) => item.id === weekPlan?.templateId);

  return (
    <section className="schedule-editor-col">
      <header className="card schedule-editor-header">
        <div>
          <h3>{person.nombre}</h3>
          <p>{selectedFunction?.nombre ?? 'Sin función asignada esta semana'}</p>
        </div>
        <div className="week-controls">
          <button className={`icon-btn current-week-icon ${isCurrentWeek ? 'active' : ''}`} onClick={onCurrentWeek} title="Semana actual"><Target size={15} /></button>
          <button className="icon-btn" onClick={onPrevWeek}><ChevronLeft size={16} /></button>
          <span className="week-label">{formatWeekRange(weekStart)}</span>
          <button className="icon-btn" onClick={onNextWeek}><ChevronRight size={16} /></button>
        </div>
      </header>

      <section className="card template-assignment-card">
        <h3>Asignación semanal</h3>
        {!weekPlan ? <p className="empty-state">Semana sin asignación. Selecciona función y plantilla, luego guarda cambios.</p> : null}
        <div className="template-assignment-row">
          <select value={functionWeek?.functionId ?? ''} onChange={(event) => onFunctionChange(event.target.value || null)}>
            <option value="">Sin función</option>
            {roleFunctions.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}
          </select>
          {roleFunctions.length === 0 ? <p className="empty-state">No hay funciones para este rol. Créelas en la pestaña Personal.</p> : null}
          <select value={weekPlan?.templateId ?? ''} onChange={(event) => onTemplateChange(event.target.value || null)}>
            <option value="">Sin plantilla</option>
            {templates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
          <button onClick={onOpenTemplateModal}>Gestionar plantillas</button>
        </div>
      </section>

      <WeekScheduleTable personId={person.id} weekStart={weekStart} template={selectedTemplate} overrides={overrides} weekAssigned={!!weekPlan} onUpsertOverride={onUpsertOverride} onRevertOverride={onRevertOverride} />

      <footer className="filters-footer schedule-footer">
        <div className="filters-footer-actions">
          <button className="footer-reset" onClick={onReset}>Reiniciar</button>
          <button className="primary footer-apply" disabled={hasInvalidSlots} onClick={onSave}>Guardar cambios</button>
        </div>
        {hasInvalidSlots ? <span className="error">Corrige horarios inválidos antes de guardar.</span> : null}
        {hasUnsavedChanges ? <span className="pending-badge">Cambios sin guardar</span> : null}
      </footer>
    </section>
  );
};
