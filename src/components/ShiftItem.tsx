import type { CSSProperties } from 'react';
import type { Function, Person, Role, Shift, ShiftLabelMode } from '../types';

type Props = {
  shift: Shift;
  person?: Person;
  functionInfo?: Function;
  role?: Role;
  compact: boolean;
  style: CSSProperties;
  onClick: (shift: Shift) => void;
  shiftLabelMode: ShiftLabelMode;
};

export const ShiftItem = ({ shift, person, functionInfo, role, compact, style, onClick, shiftLabelMode }: Props) => {
  const summaryText = shiftLabelMode === 'function'
    ? (functionInfo?.nombre ?? 'Sin función')
    : (person?.nombre ?? 'Sin persona');

  return (
    <button
      className={`shift-item ${compact ? 'compact' : ''}`}
      style={{ ...style, '--shift-color': role?.color || '#93c5fd' } as CSSProperties}
      onClick={() => onClick(shift)}
      title={summaryText}
    >
      <strong>{summaryText}</strong>
    </button>
  );
};
