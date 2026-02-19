import { useMemo, useState } from 'react';
import { formatWeekRange, addDays, startOfWeekMonday } from '../../lib/dateUtils';
import { ChevronLeft, ChevronRight } from '../../lib/icons';
import { resolvePersonFunctionIdForWeek, toISODate } from '../../lib/scheduleUtils';
import type { Function, Person, PersonFunctionWeek, Role, StorageData } from '../../types';
import { TemplateModal } from './TemplateModal';
import { WeekScheduleTable } from './WeekScheduleTable';

const todayWeekStart = startOfWeekMonday(new Date());

type Props = {
  data: StorageData;
  onSaveAll: (next: StorageData) => void;
};

const findFirstFunctionId = (roleId: string, functions: Function[]) => functions.find((item) => item.roleId === roleId)?.id ?? null;

export const SchedulesPage = ({ data, onSaveAll }: Props) => {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(data.people[0]?.id ?? null);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const weekStartISO = toISODate(weekStart);

  const selectedPerson = data.people.find((item) => item.id === selectedPersonId) ?? null;

  const roleById = new Map(data.roles.map((item) => [item.id, item]));
  const functionById = new Map(data.functions.map((item) => [item.id, item]));

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.people.filter((person) => {
      const functionId = resolvePersonFunctionIdForWeek(person.id, person.roleId, weekStartISO, data.functions, data.personFunctionWeeks);
      const fnName = functionId ? functionById.get(functionId)?.nombre ?? '' : '';
      if (!term) return true;
      return person.nombre.toLowerCase().includes(term) || fnName.toLowerCase().includes(term);
    });
  }, [data.people, data.functions, data.personFunctionWeeks, weekStartISO, search]);

  const hasSelected = !!selectedPerson;

  const updatePerson = (personId: string, patch: Partial<Person>) => {
    const nextPeople = data.people.map((item) => item.id === personId ? { ...item, ...patch } : item);
    onSaveAll({ ...data, people: nextPeople });
  };

  const upsertWeekFunction = (personId: string, functionId: string) => {
    const existing = data.personFunctionWeeks.find((item) => item.personId === personId && item.weekStartISO === weekStartISO);
    const nextPersonFunctionWeeks: PersonFunctionWeek[] = existing
      ? data.personFunctionWeeks.map((item) => item.personId === personId && item.weekStartISO === weekStartISO ? { ...item, functionId } : item)
      : [...data.personFunctionWeeks, { personId, weekStartISO, functionId }];
    onSaveAll({ ...data, personFunctionWeeks: nextPersonFunctionWeeks });
  };

  const deletePerson = (personId: string) => {
    const ok = window.confirm('¿Eliminar persona y sus horarios asociados?');
    if (!ok) return;
    onSaveAll({
      ...data,
      people: data.people.filter((item) => item.id !== personId),
      personSchedules: data.personSchedules.filter((item) => item.personId !== personId),
      personFunctionWeeks: data.personFunctionWeeks.filter((item) => item.personId !== personId),
      overrides: data.overrides.filter((item) => item.personId !== personId)
    });
    const remaining = data.people.filter((item) => item.id !== personId);
    setSelectedPersonId(remaining[0]?.id ?? null);
  };

  const selectedFunctionId = selectedPerson
    ? resolvePersonFunctionIdForWeek(selectedPerson.id, selectedPerson.roleId, weekStartISO, data.functions, data.personFunctionWeeks)
    : null;

  const selectedRoleFunctions = selectedPerson ? data.functions.filter((item) => item.roleId === selectedPerson.roleId) : [];
  const assignment = selectedPerson ? data.personSchedules.find((item) => item.personId === selectedPerson.id) : undefined;
  const template = data.templates.find((item) => item.id === assignment?.templateId);

  return (
    <main className="dashboard-layout schedules-layout">
      <aside className="card schedules-people-list">
        <button className="primary" onClick={() => setPersonModalOpen(true)}>+ Persona</button>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona o función" />
        <div className="people-items">
          {filteredPeople.map((person) => {
            const selected = selectedPersonId === person.id;
            const role = roleById.get(person.roleId);
            const functionId = resolvePersonFunctionIdForWeek(person.id, person.roleId, weekStartISO, data.functions, data.personFunctionWeeks);
            const fn = functionId ? functionById.get(functionId) : null;
            const assigned = data.personSchedules.find((item) => item.personId === person.id);
            const assignedTemplate = data.templates.find((item) => item.id === assigned?.templateId);
            return (
              <button key={person.id} className={`person-item ${selected ? 'active' : ''}`} onClick={() => { setSelectedPersonId(person.id); setWorkerOpen(false); setScheduleOpen(true); }}>
                <div>
                  <strong>{person.nombre}</strong>
                  <p>{role?.nombre ?? 'Sin rol'} · {fn?.nombre ?? 'Sin función'}</p>
                </div>
                <div className="person-item-meta">
                  {assignedTemplate ? <span className="chip">{assignedTemplate.name}</span> : <span className="chip muted">Sin plantilla</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="schedule-editor-col">
        {!hasSelected ? <section className="card"><p>Selecciona una persona para editar horarios.</p></section> : null}
        {hasSelected && selectedPerson ? (
          <>
            <section className="card">
              <button className="accordion-toggle" onClick={() => setWorkerOpen((prev) => !prev)}>
                <strong>Trabajador</strong>
                <span>{workerOpen ? '−' : '+'}</span>
              </button>
              {workerOpen ? (
                <div className="accordion-content">
                  <label>Nombre
                    <input value={selectedPerson.nombre} onChange={(event) => updatePerson(selectedPerson.id, { nombre: event.target.value })} />
                  </label>
                  <label>Rol
                    <select
                      value={selectedPerson.roleId}
                      onChange={(event) => {
                        const nextRoleId = event.target.value;
                        if (nextRoleId === '__create__') {
                          const name = window.prompt('Nombre del rol');
                          if (!name) return;
                          const color = window.prompt('Color HEX opcional (ej: #60a5fa)') || undefined;
                          const newRole: Role = { id: crypto.randomUUID(), nombre: name, color };
                          onSaveAll({ ...data, roles: [...data.roles, newRole] });
                          updatePerson(selectedPerson.id, { roleId: newRole.id });
                          const fallback = findFirstFunctionId(newRole.id, data.functions);
                          if (fallback) upsertWeekFunction(selectedPerson.id, fallback);
                          return;
                        }
                        updatePerson(selectedPerson.id, { roleId: nextRoleId });
                        if (selectedFunctionId) {
                          const selectedFn = data.functions.find((item) => item.id === selectedFunctionId);
                          if (selectedFn?.roleId !== nextRoleId) {
                            const fallback = findFirstFunctionId(nextRoleId, data.functions);
                            if (fallback) upsertWeekFunction(selectedPerson.id, fallback);
                          }
                        }
                      }}
                    >
                      {data.roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
                      <option value="__create__">+ Crear rol</option>
                    </select>
                  </label>
                  <button onClick={() => deletePerson(selectedPerson.id)}>Eliminar persona</button>
                </div>
              ) : null}
            </section>

            <section className="card">
              <button className="accordion-toggle" onClick={() => setScheduleOpen((prev) => !prev)}>
                <strong>Horario</strong>
                <span>{scheduleOpen ? '−' : '+'}</span>
              </button>
              {scheduleOpen ? (
                <div className="accordion-content">
                  <div className="week-controls">
                    <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} /></button>
                    <span className="week-label">{formatWeekRange(weekStart)}</span>
                    <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></button>
                  </div>

                  <label>Función (esta semana)
                    <select value={selectedFunctionId ?? ''} onChange={(event) => {
                      if (event.target.value === '__create__') {
                        const name = window.prompt('Nombre de función');
                        if (!name) return;
                        const newFunction: Function = { id: crypto.randomUUID(), nombre: name, roleId: selectedPerson.roleId };
                        onSaveAll({ ...data, functions: [...data.functions, newFunction] });
                        upsertWeekFunction(selectedPerson.id, newFunction.id);
                        return;
                      }
                      if (event.target.value) upsertWeekFunction(selectedPerson.id, event.target.value);
                    }}>
                      <option value="">Sin función</option>
                      {selectedRoleFunctions.map((fn) => <option key={fn.id} value={fn.id}>{fn.nombre}</option>)}
                      <option value="__create__">+ Crear función</option>
                    </select>
                  </label>

                  <section className="template-assignment-card">
                    <h3>Plantilla asignada</h3>
                    <div className="template-assignment-row">
                      <select
                        value={assignment?.templateId ?? ''}
                        onChange={(event) => {
                          const nextTemplateId = event.target.value || null;
                          const existing = data.personSchedules.find((item) => item.personId === selectedPerson.id);
                          const nextSchedules = existing
                            ? data.personSchedules.map((item) => item.personId === selectedPerson.id ? { ...item, templateId: nextTemplateId } : item)
                            : [...data.personSchedules, { personId: selectedPerson.id, templateId: nextTemplateId }];
                          onSaveAll({ ...data, personSchedules: nextSchedules });
                        }}
                      >
                        <option value="">Sin plantilla</option>
                        {data.templates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                      </select>
                      <button onClick={() => setTemplateModalOpen(true)}>Gestionar plantillas</button>
                    </div>
                    <p>Actual: <strong>{template?.name ?? 'Sin plantilla'}</strong></p>
                  </section>

                  <WeekScheduleTable
                    personId={selectedPerson.id}
                    weekStart={weekStart}
                    template={template}
                    overrides={data.overrides}
                    onUpsertOverride={(dateISO, start, end) => {
                      const existing = data.overrides.find((item) => item.personId === selectedPerson.id && item.dateISO === dateISO);
                      const next = existing
                        ? data.overrides.map((item) => item.id === existing.id ? { ...item, start, end } : item)
                        : [...data.overrides, { id: crypto.randomUUID(), personId: selectedPerson.id, dateISO, start, end }];
                      onSaveAll({ ...data, overrides: next });
                    }}
                    onRevertOverride={(dateISO) => onSaveAll({ ...data, overrides: data.overrides.filter((item) => !(item.personId === selectedPerson.id && item.dateISO === dateISO)) })}
                  />
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </section>

      {personModalOpen ? (
        <CreatePersonModal
          roles={data.roles}
          functions={data.functions}
          templates={data.templates}
          weekStartISO={weekStartISO}
          onClose={() => setPersonModalOpen(false)}
          onCreate={(payload) => {
            onSaveAll({
              ...data,
              roles: payload.newRole ? [...data.roles, payload.newRole] : data.roles,
              functions: payload.newFunction ? [...data.functions, payload.newFunction] : data.functions,
              people: [...data.people, payload.person],
              personFunctionWeeks: payload.functionId ? [...data.personFunctionWeeks, { personId: payload.person.id, weekStartISO, functionId: payload.functionId }] : data.personFunctionWeeks,
              personSchedules: payload.templateId ? [...data.personSchedules, { personId: payload.person.id, templateId: payload.templateId }] : data.personSchedules
            });
            setSelectedPersonId(payload.person.id);
            setPersonModalOpen(false);
          }}
        />
      ) : null}

      <TemplateModal
        open={templateModalOpen}
        templates={data.templates}
        onClose={() => setTemplateModalOpen(false)}
        onSave={(templates) => {
          const sanitize = data.personSchedules.map((item) => templates.some((tpl) => tpl.id === item.templateId) ? item : { ...item, templateId: null });
          onSaveAll({ ...data, templates, personSchedules: sanitize });
        }}
      />
    </main>
  );
};

type CreatePersonPayload = {
  person: Person;
  templateId: string | null;
  functionId: string | null;
  newRole: Role | null;
  newFunction: Function | null;
};

const CreatePersonModal = ({ roles, functions, templates, weekStartISO, onClose, onCreate }: {
  roles: Role[];
  functions: Function[];
  templates: { id: string; name: string }[];
  weekStartISO: string;
  onClose: () => void;
  onCreate: (payload: CreatePersonPayload) => void;
}) => {
  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const [functionId, setFunctionId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');

  const roleFunctions = functions.filter((item) => item.roleId === roleId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h3>Nueva persona</h3>
        <label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Rol
          <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
          </select>
        </label>
        <label>Función inicial ({weekStartISO})
          <select value={functionId} onChange={(event) => setFunctionId(event.target.value)}>
            <option value="">Sin función</option>
            {roleFunctions.map((fn) => <option key={fn.id} value={fn.id}>{fn.nombre}</option>)}
          </select>
        </label>
        <label>Plantilla asignada
          <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">Sin plantilla</option>
            {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={() => {
            if (!name.trim() || !roleId) return;
            onCreate({ person: { id: crypto.randomUUID(), nombre: name.trim(), roleId }, functionId: functionId || null, templateId: templateId || null, newRole: null, newFunction: null });
          }}>Crear</button>
        </div>
      </div>
    </div>
  );
};
