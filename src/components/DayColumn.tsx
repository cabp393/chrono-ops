import { useMemo } from 'react';
import type { Function, Person, Role, Shift, ShiftDaySegment, ShiftLabelMode, TimeScale } from '../types';
import { ShiftItem } from './ShiftItem';

type Props = {
  daySegments: ShiftDaySegment[];
  shiftsById: Map<string, Shift>;
  people: Person[];
  functions: Function[];
  roles: Role[];
  scale: TimeScale;
  blockHeight: number;
  coverage: number[];
  focusBlockIndex: number | null;
  shiftLabelMode: ShiftLabelMode;
  onShiftClick: (shift: Shift) => void;
};

export const DayColumn = ({
  daySegments,
  shiftsById,
  people,
  functions,
  roles,
  scale,
  blockHeight,
  coverage,
  focusBlockIndex,
  shiftLabelMode,
  onShiftClick
}: Props) => {
  const dayHeight = ((24 * 60) / scale) * blockHeight;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const functionsById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);
  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const withLayout = useMemo(() => {
    const sorted = [...daySegments].sort((a, b) => new Date(a.segStartISO).getTime() - new Date(b.segStartISO).getTime());
    const active: { end: number; lane: number }[] = [];
    return sorted.map((segment) => {
      const start = new Date(segment.segStartISO).getTime();
      const end = new Date(segment.segEndISO).getTime();
      for (let i = active.length - 1; i >= 0; i -= 1) if (active[i].end <= start) active.splice(i, 1);
      const occupied = new Set(active.map((slot) => slot.lane));
      let lane = 0;
      while (occupied.has(lane)) lane += 1;
      active.push({ end, lane });
      const overlap = active.length;
      return { segment, lane, overlap };
    });
  }, [daySegments]);

  return (
    <div className="day-column" style={{ height: dayHeight, gridTemplateRows: `repeat(${(24 * 60) / scale}, ${blockHeight}px)` }}>
      {coverage.map((_, blockIndex) => (
        <div
          key={blockIndex}
          className={`grid-slot ${focusBlockIndex === blockIndex ? 'focused' : ''}`}
        />
      ))}

      {withLayout.map(({ segment, lane, overlap }) => {
        const shift = shiftsById.get(segment.shiftId);
        if (!shift) return null;

        const start = new Date(segment.segStartISO);
        const end = new Date(segment.segEndISO);
        const top = ((start.getHours() * 60 + start.getMinutes()) / scale) * blockHeight;
        const height = Math.max((((end.getTime() - start.getTime()) / 60000) / scale) * blockHeight, blockHeight * 0.75);
        const width = `${100 / Math.max(overlap, 1)}%`;
        const left = `${(100 / Math.max(overlap, 1)) * lane}%`;
        const person = peopleById.get(shift.personId);
        const functionInfo = person ? functionsById.get(person.functionId) : undefined;
        const role = functionInfo ? rolesById.get(functionInfo.roleId) : undefined;

        return (
          <ShiftItem
            key={`${segment.shiftId}-${segment.segStartISO}`}
            shift={shift}
            person={person}
            functionInfo={functionInfo}
            role={role}
            compact={height < 48}
            onClick={onShiftClick}
            shiftLabelMode={shiftLabelMode}
            style={{ top, height, width, left }}
          />
        );
      })}
    </div>
  );
};
