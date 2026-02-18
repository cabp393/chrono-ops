import type { CSSProperties } from 'react';
import type { Person, Role, Shift } from '../types';
import { formatHour } from '../lib/dateUtils';

type Props = {
  shift: Shift;
  person?: Person;
  role?: Role;
  style: CSSProperties;
  onClick: () => void;
};

export const ShiftBlock = ({ shift, person, role, style, onClick }: Props) => {
  const start = new Date(shift.startISO);
  const end = new Date(shift.endISO);
  return (
    <button
      className="shift-block"
      style={{ ...style, background: role?.color || '#bae6fd' }}
      onClick={onClick}
      title={`${person?.nombre ?? 'N/A'} - ${role?.nombre ?? ''}`}
    >
      <strong>{person?.nombre ?? 'Sin persona'}</strong>
      <span>{role?.nombre ?? 'Sin rol'}</span>
      <small>{formatHour(start)} - {formatHour(end)}</small>
    </button>
  );
};
