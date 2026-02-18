import type { Shift } from '../types';

type Props = {
  overlapCount: number;
  shifts: Shift[];
  onSelectShift: (shift: Shift) => void;
  onDuplicate: (shift: Shift) => void;
};

export const OverlapPopover = ({ overlapCount, shifts, onSelectShift, onDuplicate }: Props) => {
  if (overlapCount <= 1) return null;

  return (
    <details className="overlap-popover" onClick={(e) => e.stopPropagation()}>
      <summary>+{overlapCount - 1}</summary>
      <div className="overlap-popover-menu">
        {shifts.map((shift) => (
          <div key={shift.id} className="overlap-item">
            <button onClick={() => onSelectShift(shift)}>Editar</button>
            <button onClick={() => onDuplicate(shift)}>Duplicar</button>
          </div>
        ))}
      </div>
    </details>
  );
};
