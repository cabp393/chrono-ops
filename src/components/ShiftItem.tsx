import type { CSSProperties } from 'react';
import type { Function, Person, Role, Shift } from '../types';
import { formatHour } from '../lib/dateUtils';

type Props = {
  shift: Shift;
  person?: Person;
  functionInfo?: Function;
  role?: Role;
  compact: boolean;
  style: CSSProperties;
  onClick: (shift: Shift) => void;
  onDuplicate: (shift: Shift) => void;
  showLabel: boolean;
};

const initials = (name?: string) => (name || 'SP').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const ShiftItem = ({ shift, person, functionInfo, role, compact, style, onClick, onDuplicate, showLabel }: Props) => {
  const start = new Date(shift.startISO);
  const end = new Date(shift.endISO);
  const title = `${person?.nombre ?? 'Sin persona'} · ${functionInfo?.nombre ?? 'Sin función'} · ${formatHour(start)}-${formatHour(end)}`;

  return (
    <button
      className={`shift-item ${compact ? 'compact' : ''}`}
      style={{ ...style, '--shift-color': role?.color || '#93c5fd' } as CSSProperties}
      onClick={() => onClick(shift)}
      title={title}
    >
      <div className="shift-top">
        <strong>{compact ? initials(person?.nombre) : (person?.nombre ?? 'Sin persona')}</strong>
        <details className="shift-menu" onClick={(e) => e.stopPropagation()}>
          <summary>⋯</summary>
          <div className="shift-menu-popover">
            <button onClick={() => onDuplicate(shift)}>Duplicar +1 día</button>
          </div>
        </details>
      </div>
      {!compact && <span>{functionInfo?.nombre ?? 'Sin función'}</span>}
      {!compact && <small>{formatHour(start)}–{formatHour(end)}</small>}
      {!compact && showLabel && shift.etiqueta && <em>{shift.etiqueta}</em>}
    </button>
  );
};
