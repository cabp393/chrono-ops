import { useMemo, useState } from 'react';
import type { Function, Person, Role } from '../../types';

type Props = {
  people: Person[];
  roles: Role[];
  functions: Function[];
  onCreatePerson: () => void;
  onSavePerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
  onCreateRole: (name: string, color?: string) => string;
  onDeleteRole: (roleId: string) => boolean;
  onCreateFunction: (roleId: string, name: string) => void;
  onRenameFunction: (functionId: string, name: string) => void;
  onDeleteFunction: (functionId: string) => boolean;
};

export const PersonalPage = ({ people, roles, functions, onCreatePerson, onSavePerson, onDeletePerson, onCreateRole, onDeleteRole, onCreateFunction, onRenameFunction, onDeleteFunction }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [selectedRoleForFunctions, setSelectedRoleForFunctions] = useState<string>(roles[0]?.id ?? '');
  const person = people.find((item) => item.id === selectedPersonId) ?? null;
  const [draftName, setDraftName] = useState(person?.nombre ?? '');
  const [draftRoleId, setDraftRoleId] = useState(person?.roleId ?? roles[0]?.id ?? '');
  const roleById = new Map(roles.map((role) => [role.id, role]));
  const filteredPeople = useMemo(() => people.filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase())), [people, search]);

  return (
    <main className="dashboard-layout schedules-layout">
      <aside className="card schedules-people-list">
        <button className="primary" onClick={onCreatePerson}>+ Trabajador</button>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar trabajador" />
        <div className="people-items">
          {filteredPeople.map((item) => (
            <button key={item.id} className={`person-item ${item.id === selectedPersonId ? 'active' : ''}`} onClick={() => { setSelectedPersonId(item.id); setDraftName(item.nombre); setDraftRoleId(item.roleId); }}>
              <strong>{item.nombre}</strong>
              <p>{roleById.get(item.roleId)?.nombre ?? 'Sin rol'}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="schedule-editor-col">
        {person ? <section className="card">
          <h3>Trabajador</h3>
          <input value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Nombre" />
          <select value={draftRoleId} onChange={(event) => {
            if (event.target.value === '__new_role__') {
              const name = window.prompt('Nombre del rol');
              if (!name) return;
              const roleId = onCreateRole(name);
              setDraftRoleId(roleId);
              return;
            }
            setDraftRoleId(event.target.value);
          }}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
            <option value="__new_role__">+ Crear rol</option>
          </select>
          <div className="filters-footer-actions">
            <button className="primary" onClick={() => onSavePerson({ ...person, nombre: draftName, roleId: draftRoleId })}>Guardar cambios</button>
            <button className="ghost" onClick={() => window.confirm('¿Eliminar trabajador?') && onDeletePerson(person.id)}>Eliminar trabajador</button>
          </div>
        </section> : null}

        <section className="card">
          <h3>Roles y funciones</h3>
          <div className="template-assignment-row">
            <select value={selectedRoleForFunctions} onChange={(event) => setSelectedRoleForFunctions(event.target.value)}>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
            </select>
            <button className="ghost" onClick={() => !onDeleteRole(selectedRoleForFunctions) && window.alert('Reasigna trabajadores antes de eliminar')}>Eliminar rol</button>
            <button onClick={() => {
              const name = window.prompt('Nombre de la función');
              if (name) onCreateFunction(selectedRoleForFunctions, name);
            }}>+ Crear función</button>
          </div>
          <div className="people-items">
            {functions.filter((item) => item.roleId === selectedRoleForFunctions).map((item) => (
              <div className="person-item" key={item.id}>
                <strong>{item.nombre}</strong>
                <div className="filters-footer-actions">
                  <button className="ghost" onClick={() => {
                    const next = window.prompt('Nuevo nombre', item.nombre);
                    if (next) onRenameFunction(item.id, next);
                  }}>Editar</button>
                  <button className="ghost" onClick={() => !onDeleteFunction(item.id) && window.alert('La función está en uso en Horarios.')}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
};
