import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Role } from '../../types';

type Props = {
  open: boolean;
  roles: Role[];
  onClose: () => void;
  onSave: (payload: { nombre: string; roleId: string }) => void;
};

export const WorkerModal = ({ open, roles, onClose, onSave }: Props) => {
  const [nombre, setNombre] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');

  useEffect(() => {
    if (!open) return;
    setNombre('');
    setRoleId(roles[0]?.id ?? '');
  }, [open, roles]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="modal compact-modal">
        <h3>Añadir trabajador</h3>
        <input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre" />
        <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
          {roles.map((role) => <option key={role.id} value={role.id}>{role.nombre}</option>)}
        </select>
        <div className="modal-actions">
          <button className="icon-btn" onClick={onClose} aria-label="Cancelar" title="Cancelar"><X size={14} /></button>
          <button
            className="icon-btn primary"
            onClick={() => onSave({ nombre: nombre.trim(), roleId })}
            disabled={!nombre.trim() || !roleId}
            aria-label="Guardar trabajador"
            title="Guardar trabajador"
          >
            <Check size={14} />
          </button>
        </div>
      </section>
    </div>
  );
};
