import { useMemo } from 'react';
import type { Function, Person, Role, Shift, TimeScale } from '../types';
import { ShiftItem } from './ShiftItem';

type Props = {
  dayShifts: Shift[];
  dayDate: Date;
  people: Person[];
  functions: Function[];
  roles: Role[];
  scale: TimeScale;
  blockHeight: number;
  coverage: number[];
  onlyGaps: boolean;
  focusBlockIndex: number | null;
  showLabels: boolean;
  onShiftClick: (shift: Shift) => void;
  onDuplicateShift: (shift: Shift) => void;
};

export const DayColumn = ({
  dayShifts,
  people,
  functions,
  roles,
  scale,
  blockHeight,
  coverage,
  onlyGaps,
  focusBlockIndex,
  showLabels,
  onShiftClick,
  onDuplicateShift
}: Props) => {
  const dayHeight = ((24 * 60) / scale) * blockHeight;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const functionsById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);
  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const withLayout = useMemo(() => {
    const sorted = [...dayShifts].sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());
    const active: { end: number; lane: number }[] = [];
    return sorted.map((shift) => {
      const start = new Date(shift.startISO).getTime();
      const end = new Date(shift.endISO).getTime();
      for (let i = active.length - 1; i >= 0; i -= 1) if (active[i].end <= start) active.splice(i, 1);
      const occupied = new Set(active.map((slot) => slot.lane));
      let lane = 0;
      while (occupied.has(lane)) lane += 1;
      active.push({ end, lane });
      const overlap = active.length;
      return { shift, lane, overlap };
    });
  }, [dayShifts]);

  return (
    <div className="day-column" style={{ height: dayHeight, gridTemplateRows: `repeat(${(24 * 60) / scale}, ${blockHeight}px)` }}>
      {coverage.map((count, blockIndex) => {
        const isGap = count === 0;
        return (
          <div
            key={blockIndex}
            className={`grid-slot ${onlyGaps && !isGap ? 'muted' : ''} ${focusBlockIndex === blockIndex ? 'focused' : ''}`}
          />
        );
      })}

      {withLayout.map(({ shift, lane, overlap }) => {
        const start = new Date(shift.startISO);
        const end = new Date(shift.endISO);
        const top = ((start.getHours() * 60 + start.getMinutes()) / scale) * blockHeight;
        const height = Math.max((((end.getTime() - start.getTime()) / 60000) / scale) * blockHeight, blockHeight * 0.75);
        const width = `${100 / Math.max(overlap, 1)}%`;
        const left = `${(100 / Math.max(overlap, 1)) * lane}%`;
        const person = peopleById.get(shift.personId);
        const functionInfo = person ? functionsById.get(person.functionId) : undefined;
        const role = functionInfo ? rolesById.get(functionInfo.roleId) : undefined;

        return (
          <ShiftItem
            key={shift.id}
            shift={shift}
            person={person}
            functionInfo={functionInfo}
            role={role}
            compact={height < 48}
            onClick={onShiftClick}
            onDuplicate={onDuplicateShift}
            showLabel={showLabels}
            style={{ top, height, width, left }}
          />
        );
      })}
    </div>
  );
};
