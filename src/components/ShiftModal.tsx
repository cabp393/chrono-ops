import { useEffect, useMemo, useState } from 'react';
import { fromLocalDateAndTime, toLocalDateInput, toLocalTimeInput } from '../lib/dateUtils';
import type { Function, Person, Role, Shift } from '../types';
import { TimeInput24 } from './TimeInput24';

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
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPersonId(editing.personId);
      setStartDate(toLocalDateInput(editing.startISO));
      setStartTime(toLocalTimeInput(editing.startISO));
      setEndDate(toLocalDateInput(editing.endISO));
      setEndTime(toLocalTimeInput(editing.endISO));
    } else {
      const base = defaultStart ?? new Date();
      const end = new Date(base.getTime() + 4 * 60 * 60 * 1000);
      setPersonId(people[0]?.id ?? '');
      setStartDate(toLocalDateInput(base.toISOString()));
      setStartTime(toLocalTimeInput(base.toISOString()));
      setEndDate(toLocalDateInput(end.toISOString()));
      setEndTime(toLocalTimeInput(end.toISOString()));
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
    const start = new Date(fromLocalDateAndTime(startDate, startTime));
    const end = new Date(fromLocalDateAndTime(endDate, endTime));
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

        <label>Fecha inicio<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setError(''); }} /></label>
        <label>Hora inicio<TimeInput24 value={startTime} onChange={(value) => { setStartTime(value); setError(''); }} step={60} /></label>
        <label>Fecha fin<input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setError(''); }} /></label>
        <label>Hora fin<TimeInput24 value={endTime} onChange={(value) => { setEndTime(value); setError(''); }} step={60} /></label>
        <div className="modal-actions">
          {editing && onDuplicate && <button onClick={() => onDuplicate({ id: editing.id, personId, startISO: new Date(fromLocalDateAndTime(startDate, startTime)).toISOString(), endISO: new Date(fromLocalDateAndTime(endDate, endTime)).toISOString() }, 1)}>Duplicar +1 día</button>}
          <button onClick={onClose}>Cancelar</button>
          <button className="primary" onClick={submit}>Guardar</button>
        </div>
      </div>
    </div>
  );
};
