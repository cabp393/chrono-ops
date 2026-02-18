import { useEffect, useMemo, useState } from 'react';
import { toLocalDatetimeInput } from '../lib/dateUtils';
import type { Person, Role, Shift } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (s: Shift) => void;
  onDuplicate?: (s: Shift, dayOffset: number) => void;
  editing?: Shift | null;
  people: Person[];
  roles: Role[];
  defaultStart?: Date;
};

export const ShiftModal = ({ open, onClose, onSave, onDuplicate, editing, people, roles, defaultStart }: Props) => {
  const [personId, setPersonId] = useState('');
  const [rolId, setRolId] = useState('');
  const [startISO, setStartISO] = useState('');
  const [endISO, setEndISO] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPersonId(editing.personId);
      setRolId(editing.rolId);
      setStartISO(toLocalDatetimeInput(editing.startISO));
      setEndISO(toLocalDatetimeInput(editing.endISO));
    } else {
      const base = defaultStart ?? new Date();
      const end = new Date(base.getTime() + 4 * 60 * 60 * 1000);
      setPersonId(people[0]?.id ?? '');
      setRolId(people[0]?.rolId ?? roles[0]?.id ?? '');
      setStartISO(toLocalDatetimeInput(base.toISOString()));
      setEndISO(toLocalDatetimeInput(end.toISOString()));
    }
  }, [open, editing, people, roles, defaultStart]);

  const selectedPerson = useMemo(() => people.find((p) => p.id === personId), [personId, people]);

  useEffect(() => {
    if (selectedPerson) setRolId(selectedPerson.rolId);
  }, [selectedPerson]);

  if (!open) return null;

  const submit = () => {
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (!(start < end)) {
      setError('La hora de fin debe ser mayor al inicio.');
      return;
    }
    if (!personId || !rolId) {
      setError('Debes seleccionar persona y rol.');
      return;
    }
    onSave({ id: editing?.id ?? crypto.randomUUID(), personId, rolId, startISO: start.toISOString(), endISO: end.toISOString() });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{editing ? 'Editar turno' : 'Agregar turno'}</h3>
        {error && <p className="error">{error}</p>}
        <label>Persona
          <select value={personId} onChange={(e) => { setPersonId(e.target.value); setError(''); }}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label>Rol
          <select value={rolId} onChange={(e) => { setRolId(e.target.value); setError(''); }}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        <label>Inicio<input type="datetime-local" value={startISO} onChange={(e) => { setStartISO(e.target.value); setError(''); }} /></label>
        <label>Fin<input type="datetime-local" value={endISO} onChange={(e) => { setEndISO(e.target.value); setError(''); }} /></label>
        <div className="modal-actions">
          {editing && onDuplicate && <button onClick={() => onDuplicate({ id: editing.id, personId, rolId, startISO: new Date(startISO).toISOString(), endISO: new Date(endISO).toISOString() }, 1)}>Duplicar +1 día</button>}
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={submit}>Guardar</button>
        </div>
      </div>
    </div>
  );
};
