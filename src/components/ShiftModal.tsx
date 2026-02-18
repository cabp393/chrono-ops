import { useEffect, useMemo, useState } from 'react';
import { toLocalDatetimeInput } from '../lib/dateUtils';
import type { Function, Person, Role, Shift } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (s: Shift) => void;
  onDuplicate?: (s: Shift, dayOffset: number) => void;
  editing?: Shift | null;
  people: Person[];
  functions: Function[];
  roles: Role[];
  defaultStart?: Date;
};

export const ShiftModal = ({ open, onClose, onSave, onDuplicate, editing, people, functions, roles, defaultStart }: Props) => {
  const [personId, setPersonId] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [startISO, setStartISO] = useState('');
  const [endISO, setEndISO] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPersonId(editing.personId);
      setStartISO(toLocalDatetimeInput(editing.startISO));
      setEndISO(toLocalDatetimeInput(editing.endISO));
    } else {
      const base = defaultStart ?? new Date();
      const end = new Date(base.getTime() + 4 * 60 * 60 * 1000);
      setPersonId(people[0]?.id ?? '');
      setStartISO(toLocalDatetimeInput(base.toISOString()));
      setEndISO(toLocalDatetimeInput(end.toISOString()));
    }
    setPersonQuery('');
    setError('');
  }, [open, editing, people, defaultStart]);

  const selectedPerson = useMemo(() => people.find((p) => p.id === personId), [personId, people]);
  const selectedFunction = useMemo(
    () => functions.find((fn) => fn.id === selectedPerson?.functionId),
    [functions, selectedPerson?.functionId]
  );
  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedFunction?.roleId),
    [roles, selectedFunction?.roleId]
  );

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => person.nombre.toLowerCase().includes(q));
  }, [people, personQuery]);

  if (!open) return null;

  const submit = () => {
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (!(start < end)) {
      setError('La hora de fin debe ser mayor al inicio.');
      return;
    }
    if (!personId) {
      setError('Debes seleccionar una persona.');
      return;
    }
    onSave({ id: editing?.id ?? crypto.randomUUID(), personId, startISO: start.toISOString(), endISO: end.toISOString() });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Editar turno' : 'Agregar turno'}</h3>
        {error && <p className="error">{error}</p>}

        <label>Buscar persona
          <input value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Buscar persona..." />
        </label>

        <label>Persona
          <select value={personId} onChange={(e) => { setPersonId(e.target.value); setError(''); }}>
            {filteredPeople.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>

        <div className="derived-meta">
          <span><strong>Función:</strong> {selectedFunction?.nombre ?? 'Sin función'}</span>
          <span><strong>Rol:</strong> {selectedRole?.nombre ?? 'Sin rol'}</span>
        </div>

        <label>Inicio<input type="datetime-local" value={startISO} onChange={(e) => { setStartISO(e.target.value); setError(''); }} /></label>
        <label>Fin<input type="datetime-local" value={endISO} onChange={(e) => { setEndISO(e.target.value); setError(''); }} /></label>
        <div className="modal-actions">
          {editing && onDuplicate && <button onClick={() => onDuplicate({ id: editing.id, personId, startISO: new Date(startISO).toISOString(), endISO: new Date(endISO).toISOString() }, 1)}>Duplicar +1 día</button>}
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={submit}>Guardar</button>
        </div>
      </div>
    </div>
  );
};
