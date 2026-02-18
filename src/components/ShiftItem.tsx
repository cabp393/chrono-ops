import type { CSSProperties } from 'react';
import { formatHour } from '../lib/dateUtils';
import type { Function, Person, Role, Shift, ShiftLabelMode } from '../types';

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
  shiftLabelMode: ShiftLabelMode;
};

export const ShiftItem = ({ shift, person, functionInfo, role, compact, style, onClick, onDuplicate, showLabel, shiftLabelMode }: Props) => {
  const start = new Date(shift.startISO);
  const end = new Date(shift.endISO);
  const summaryText = shiftLabelMode === 'function'
    ? (functionInfo?.nombre ?? 'Sin función')
    : (person?.nombre ?? 'Sin persona');
  const title = `${person?.nombre ?? 'Sin persona'} · ${functionInfo?.nombre ?? 'Sin función'} · ${role?.nombre ?? 'Sin rol'} · ${formatHour(start)}-${formatHour(end)}${shift.etiqueta ? ` · ${shift.etiqueta}` : ''}`;

  return (
    <button
      className={`shift-item ${compact ? 'compact' : ''}`}
      style={{ ...style, '--shift-color': role?.color || '#93c5fd' } as CSSProperties}
      onClick={() => onClick(shift)}
      title={title}
    >
      <div className="shift-top">
        <strong>{summaryText}</strong>
        <details className="shift-menu" onClick={(e) => e.stopPropagation()}>
          <summary aria-label="Ver detalle del turno">⋯</summary>
          <div className="shift-menu-popover">
            <p><strong>Nombre:</strong> {person?.nombre ?? 'Sin persona'}</p>
            <p><strong>Función:</strong> {functionInfo?.nombre ?? 'Sin función'}</p>
            <p><strong>Rol:</strong> {role?.nombre ?? 'Sin rol'}</p>
            <p><strong>Horario:</strong> {formatHour(start)}–{formatHour(end)}</p>
            {shift.etiqueta && <p><strong>Etiqueta:</strong> {shift.etiqueta}</p>}
            <button onClick={() => onDuplicate(shift)}>Duplicar +1 día</button>
          </div>
        </details>
      </div>
      {!compact && showLabel && shift.etiqueta && <em>{shift.etiqueta}</em>}
    </button>
  );
};
