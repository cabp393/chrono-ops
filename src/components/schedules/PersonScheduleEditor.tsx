import { Save, X } from 'lucide-react';
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
  hasUnsavedChanges: boolean;
  hasInvalidSlots: boolean;
  onTemplateChange: (templateId: string | null) => void;
  onFunctionChange: (functionId: string | null) => void;
  onOpenTemplateModal: () => void;
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
  onReset: () => void;
  onSave: () => void;
};

export const PersonScheduleEditor = ({ person, functions, templates, weekPlan, functionWeek, overrides, weekStart, hasUnsavedChanges, hasInvalidSlots, onTemplateChange, onFunctionChange, onOpenTemplateModal, onUpsertOverride, onReset, onSave }: Props) => {
  if (!person) return null;

  const roleFunctions = functions.filter((item) => item.roleId === person.roleId);
  const selectedTemplate = templates.find((item) => item.id === weekPlan?.templateId);

  return (
    <section className="schedule-editor-col">
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

      <WeekScheduleTable personId={person.id} weekStart={weekStart} template={selectedTemplate} overrides={overrides} weekAssigned={!!weekPlan} onUpsertOverride={onUpsertOverride} />

      <footer className="filters-footer schedule-footer">
        <div className="filters-footer-actions schedule-footer-actions">
          <button className="icon-btn schedule-action-btn" onClick={onReset} aria-label="Cancelar" title="Cancelar">
            <X size={16} />
          </button>
          <button className="icon-btn primary schedule-action-btn" disabled={hasInvalidSlots} onClick={onSave} aria-label="Guardar" title="Guardar">
            <Save size={16} />
          </button>
        </div>
        {hasInvalidSlots ? <span className="error">Corrige horarios inválidos antes de guardar.</span> : null}
        {hasUnsavedChanges ? <span className="pending-badge">Cambios sin guardar</span> : null}
      </footer>
    </section>
  );
};
