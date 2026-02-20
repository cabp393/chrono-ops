import { ChevronDown, ChevronUp, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Function, Person, PersonFunctionWeek, PersonWeekPlan, Role, ScheduleOverride, ScheduleTemplate } from '../../types';
import { WeekScheduleTable } from './WeekScheduleTable';

type Props = {
  person: Person | undefined;
  roles: Role[];
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
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
  onClearOverride: (dateISO: string) => void;
  onPersonDraftChange: (draft: { nombre: string; roleId: string }) => void;
  onDeletePerson: (personId: string) => void;
  onReset: () => void;
  onSave: () => void;
};

export const PersonScheduleEditor = ({ person, roles, functions, templates, weekPlan, functionWeek, overrides, weekStart, hasUnsavedChanges, hasInvalidSlots, onTemplateChange, onFunctionChange, onUpsertOverride, onClearOverride, onPersonDraftChange, onDeletePerson, onReset, onSave }: Props) => {
  const [workerExpanded, setWorkerExpanded] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState(person?.nombre ?? '');
  const [draftRoleId, setDraftRoleId] = useState(person?.roleId ?? roles[0]?.id ?? '');

  useEffect(() => {
    setWorkerExpanded(false);
    setConfirmDeleteOpen(false);
    setDraftName(person?.nombre ?? '');
    setDraftRoleId(person?.roleId ?? roles[0]?.id ?? '');
  }, [person?.id, person?.nombre, person?.roleId, roles]);

  if (!person) return null;

  const roleFunctions = functions.filter((item) => item.roleId === draftRoleId);
  const selectedTemplate = templates.find((item) => item.id === weekPlan?.templateId);

  return (
    <section className="schedule-editor-col">
      <section className="card template-assignment-card">
        <h3>Asignación semanal</h3>
        {!weekPlan ? <p className="empty-state">Semana sin asignación. Selecciona función y plantilla, luego guarda cambios.</p> : null}
        <div className="template-assignment-row compact-two">
          <select value={functionWeek?.functionId ?? ''} onChange={(event) => onFunctionChange(event.target.value || null)}>
            <option value="">Sin función</option>
            {roleFunctions.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}
          </select>
          {roleFunctions.length === 0 ? <p className="empty-state">No hay funciones para este rol. Créelas en la pestaña Personal.</p> : null}
          <select value={weekPlan?.templateId ?? ''} onChange={(event) => onTemplateChange(event.target.value || null)}>
            <option value="">Sin plantilla</option>
            {templates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
          </select>
        </div>
      </section>

      <WeekScheduleTable
        personId={person.id}
        weekStart={weekStart}
        template={selectedTemplate}
        overrides={overrides}
        weekAssigned={!!weekPlan}
        onUpsertOverride={onUpsertOverride}
        onClearOverride={onClearOverride}
      />

      <section className="card schedule-worker-card">
        <button className="week-section-toggle" onClick={() => setWorkerExpanded((current) => !current)} aria-label="Expandir sección trabajador">
          <span>Trabajador</span>
          {workerExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {workerExpanded ? <div className="worker-edit-grid">
          <input
            value={draftName}
            onChange={(event) => {
              const nombre = event.target.value;
              setDraftName(nombre);
              onPersonDraftChange({ nombre, roleId: draftRoleId });
            }}
            placeholder="Nombre"
          />
          <select
            value={draftRoleId}
            onChange={(event) => {
              const roleId = event.target.value;
              setDraftRoleId(roleId);
              onPersonDraftChange({ nombre: draftName, roleId });
            }}
          >
            {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select>
          <div className="worker-card-actions">
            <button className="icon-btn danger-icon" onClick={() => setConfirmDeleteOpen(true)} aria-label="Eliminar trabajador" title="Eliminar trabajador"><Trash2 size={14} /></button>
          </div>
        </div> : null}
      </section>

      {hasInvalidSlots ? <p className="error schedule-inline-error">Corrige horarios inválidos antes de guardar.</p> : null}

      <footer className="schedule-footer">
        <span className="schedule-unsaved-note">{hasUnsavedChanges ? 'Cambios sin guardar' : ''}</span>
        <div className="schedule-footer-actions">
          <button className="icon-btn schedule-action-btn" onClick={onReset} aria-label="Cancelar" title="Cancelar">
            <X size={16} />
          </button>
          <button className="icon-btn primary schedule-action-btn" disabled={hasInvalidSlots} onClick={onSave} aria-label="Guardar" title="Guardar">
            <Save size={16} />
          </button>
        </div>
      </footer>

      {confirmDeleteOpen ? <div className="modal-backdrop" role="dialog" aria-modal="true">
        <section className="modal compact-modal">
          <h3>Eliminar trabajador</h3>
          <p>Esta acción eliminará sus asignaciones y ajustes semanales.</p>
          <div className="modal-actions">
            <button className="icon-btn" onClick={() => setConfirmDeleteOpen(false)} aria-label="Cancelar" title="Cancelar"><X size={14} /></button>
            <button className="icon-btn danger-icon" onClick={() => onDeletePerson(person.id)} aria-label="Confirmar eliminación" title="Confirmar eliminación"><Trash2 size={14} /></button>
          </div>
        </section>
      </div> : null}
    </section>
  );
};
