import { useEffect, useMemo, useState } from 'react';
import { Check, Palette, Pencil, Plus, Save, Search, Trash2 } from '../../lib/lucide';
import type { Function, Person, Role } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AppModal } from '../ui/AppModal';
import { IconButton } from '../ui/IconButton';
import { Pill } from '../ui/Pill';
import { SectionHeader } from '../ui/SectionHeader';

type Props = {
  people: Person[];
  roles: Role[];
  functions: Function[];
  onCreatePerson: () => void;
  onSavePerson: (person: Person) => void;
  onDeletePerson: (personId: string) => void;
  onCreateRole: (name: string, color?: string) => string;
  onUpdateRole: (roleId: string, updates: { nombre: string; color: string }) => void;
  onDeleteRole: (roleId: string) => boolean;
  onCreateFunction: (roleId: string, name: string) => void;
  onRenameFunction: (functionId: string, name: string) => void;
  onDeleteFunction: (functionId: string) => boolean;
};

const FALLBACK_ROLE_COLOR = '#94a3b8';

export const PersonalPage = ({ people, roles, functions, onCreatePerson, onSavePerson, onDeletePerson, onCreateRole, onUpdateRole, onDeleteRole, onCreateFunction, onRenameFunction, onDeleteFunction }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(people[0]?.id ?? null);
  const [selectedRoleForFunctions, setSelectedRoleForFunctions] = useState<string>(roles[0]?.id ?? '');
  const [personModalOpen, setPersonModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'person' | 'role' | 'function'; id: string } | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftRoleId, setDraftRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState(FALLBACK_ROLE_COLOR);
  const [functionName, setFunctionName] = useState('');
  const [editingFunctionId, setEditingFunctionId] = useState<string | null>(null);

  const roleById = new Map(roles.map((role) => [role.id, role]));
  const person = people.find((item) => item.id === selectedPersonId) ?? null;
  const filteredPeople = useMemo(() => people.filter((item) => item.nombre.toLowerCase().includes(search.toLowerCase())), [people, search]);

  useEffect(() => {
    if (person) {
      setDraftName(person.nombre);
      setDraftRoleId(person.roleId);
    }
  }, [person?.id]);

  const selectedRole = roles.find((role) => role.id === selectedRoleForFunctions);

  return (
    <main className="dashboard-layout schedules-layout">
      <aside className="card schedules-people-list">
        <button className="primary" onClick={() => { onCreatePerson(); }}><Plus size={16} />Trabajador</button>
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar trabajador" />
        </div>
        <div className="people-items">
          {filteredPeople.map((item) => (
            <button key={item.id} className={`person-item ${item.id === selectedPersonId ? 'active' : ''}`} onClick={() => setSelectedPersonId(item.id)}>
              <strong>{item.nombre}</strong>
              <p>{roleById.get(item.roleId)?.nombre ?? 'Sin rol'}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="schedule-editor-col">
        {person ? <section className="card">
          <SectionHeader
            title="Trabajador"
            actions={<div className="header-actions"><IconButton label="Editar trabajador" onClick={() => setPersonModalOpen(true)}><Pencil size={16} /></IconButton><IconButton label="Eliminar trabajador" onClick={() => setConfirm({ kind: 'person', id: person.id })}><Trash2 size={16} /></IconButton></div>}
          />
          <Pill>{roleById.get(person.roleId)?.nombre ?? 'Sin rol'}</Pill>
        </section> : null}

        <section className="card">
          <SectionHeader
            title="Roles y funciones"
            actions={<div className="header-actions"><IconButton label="Nuevo rol" onClick={() => { setEditingRoleId(null); setRoleName(''); setRoleColor(FALLBACK_ROLE_COLOR); setRoleModalOpen(true); }}><Plus size={16} /></IconButton></div>}
          />
          <div className="template-assignment-row">
            <select value={selectedRoleForFunctions} onChange={(event) => setSelectedRoleForFunctions(event.target.value)}>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
            </select>
            <IconButton label="Editar rol" onClick={() => {
              setEditingRoleId(selectedRole?.id ?? null);
              setRoleName(selectedRole?.nombre ?? '');
              setRoleColor(selectedRole?.color ?? FALLBACK_ROLE_COLOR);
              setRoleModalOpen(true);
            }}><Palette size={16} /></IconButton>
            <IconButton label="Eliminar rol" onClick={() => setConfirm({ kind: 'role', id: selectedRoleForFunctions })}><Trash2 size={16} /></IconButton>
            <button onClick={() => { setFunctionName(''); setEditingFunctionId(null); setFunctionModalOpen(true); }}><Plus size={16} />Función</button>
          </div>
          <div className="people-items">
            {functions.filter((item) => item.roleId === selectedRoleForFunctions).map((item) => (
              <div className="person-item" key={item.id}>
                <strong>{item.nombre}</strong>
                <div className="filters-footer-actions">
                  <IconButton label="Editar función" onClick={() => { setFunctionName(item.nombre); setEditingFunctionId(item.id); setFunctionModalOpen(true); }}><Pencil size={16} /></IconButton>
                  <IconButton label="Eliminar función" onClick={() => setConfirm({ kind: 'function', id: item.id })}><Trash2 size={16} /></IconButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <AppModal
        open={personModalOpen}
        onOpenChange={setPersonModalOpen}
        title="Editar trabajador"
        icon={<Pencil size={16} />}
        footer={<><button className="ghost" onClick={() => setPersonModalOpen(false)}>Cancelar</button><button className="primary" onClick={() => { if (!person) return; onSavePerson({ ...person, nombre: draftName, roleId: draftRoleId }); setPersonModalOpen(false); }}><Save size={16} />Guardar</button></>}
      >
        <label>Nombre<input value={draftName} onChange={(event) => setDraftName(event.target.value)} /></label>
        <label>Rol<select value={draftRoleId} onChange={(event) => setDraftRoleId(event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}</select></label>
      </AppModal>

      <AppModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        title={editingRoleId ? 'Editar rol' : 'Crear rol'}
        icon={<Palette size={16} />}
        footer={<><button className="ghost" onClick={() => setRoleModalOpen(false)}>Cancelar</button><button className="primary" onClick={() => {
          if (!roleName.trim()) return;
          if (editingRoleId) {
            onUpdateRole(editingRoleId, { nombre: roleName.trim(), color: roleColor });
          } else {
            const id = onCreateRole(roleName.trim(), roleColor);
            setSelectedRoleForFunctions(id);
          }
          setRoleModalOpen(false);
        }}><Check size={16} />Guardar</button></>}
      >
        <label>Nombre<input value={roleName} onChange={(event) => setRoleName(event.target.value)} /></label>
        <label>Color<div className="color-field"><input type="color" value={roleColor} onChange={(event) => setRoleColor(event.target.value)} /><span>{roleColor.toUpperCase()}</span></div></label>
      </AppModal>

      <AppModal
        open={functionModalOpen}
        onOpenChange={setFunctionModalOpen}
        title={editingFunctionId ? 'Editar función' : 'Crear función'}
        icon={<Pencil size={16} />}
        footer={<><button className="ghost" onClick={() => setFunctionModalOpen(false)}>Cancelar</button><button className="primary" onClick={() => {
          if (!functionName.trim()) return;
          if (editingFunctionId) onRenameFunction(editingFunctionId, functionName.trim());
          else onCreateFunction(selectedRoleForFunctions, functionName.trim());
          setFunctionModalOpen(false);
        }}><Save size={16} />Guardar</button></>}
      >
        <label>Nombre<input value={functionName} onChange={(event) => setFunctionName(event.target.value)} /></label>
      </AppModal>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Confirmar eliminación"
        description={confirm?.kind === 'person' ? 'Se eliminará el trabajador seleccionado.' : confirm?.kind === 'role' ? 'Se eliminará el rol y sus referencias disponibles.' : 'Se eliminará la función seleccionada.'}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === 'person') onDeletePerson(confirm.id);
          if (confirm.kind === 'role') onDeleteRole(confirm.id);
          if (confirm.kind === 'function') onDeleteFunction(confirm.id);
          setConfirm(null);
        }}
      />
    </main>
  );
};
