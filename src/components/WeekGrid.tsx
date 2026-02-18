import { useEffect, useMemo, useRef } from 'react';
import type { Function, Person, Role, Shift, ShiftLabelMode, TimeScale } from '../types';
import { addDays, formatDayHeader, isSameDay } from '../lib/dateUtils';
import { DayColumn } from './DayColumn';
import { TimeAxis } from './TimeAxis';

type Props = {
  weekStart: Date;
  shifts: Shift[];
  people: Person[];
  functions: Function[];
  roles: Role[];
  scale: TimeScale;
  coverageTotals: Record<string, number[]>;
  onShiftClick: (shift: Shift) => void;
  onDuplicateShift: (shift: Shift) => void;
  onlyGaps: boolean;
  focusBlock: { dayIndex: number; blockIndex: number } | null;
  showLabels: boolean;
  shiftLabelMode: ShiftLabelMode;
};

const BLOCK_HEIGHT: Record<TimeScale, number> = { 30: 30, 60: 25, 120: 21, 180: 19, 240: 17, 360: 16 };

export const WeekGrid = ({
  weekStart,
  shifts,
  people,
  functions,
  roles,
  scale,
  coverageTotals,
  onShiftClick,
  onDuplicateShift,
  onlyGaps,
  focusBlock,
  showLabels,
  shiftLabelMode
}: Props) => {
  const blockHeight = BLOCK_HEIGHT[scale];
  const gridRef = useRef<HTMLDivElement>(null);

  const dayShifts = useMemo(
    () => Array.from({ length: 7 }, (_, d) => {
      const day = addDays(weekStart, d);
      return shifts.filter((s) => isSameDay(new Date(s.startISO), day));
    }),
    [shifts, weekStart]
  );

  useEffect(() => {
    if (!focusBlock || !gridRef.current) return;
    gridRef.current.scrollTo({ top: focusBlock.blockIndex * blockHeight - 120, behavior: 'smooth' });
  }, [focusBlock, blockHeight]);

  return (
    <section className="card week-grid-card" ref={gridRef}>
      <div className="week-grid-layout" style={{ gridTemplateColumns: '78px repeat(7, minmax(180px, 1fr))' }}>
        <div className="sticky time-corner" />
        {Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          return (
            <div key={i} className={`sticky day-header ${isSameDay(date, new Date()) ? 'today' : ''}`}>
              <strong>{formatDayHeader(date)}</strong>
            </div>
          );
        })}

        <div className="sticky-left"><TimeAxis scale={scale} blockHeight={blockHeight} /></div>
        {dayShifts.map((list, dayIdx) => {
          const dayDate = addDays(weekStart, dayIdx);
          const key = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
          const coverage = coverageTotals[key] ?? [];
          return (
            <DayColumn
              key={dayIdx}
              dayShifts={list}
              dayDate={dayDate}
              people={people}
              functions={functions}
              roles={roles}
              scale={scale}
              blockHeight={blockHeight}
              coverage={coverage}
              onlyGaps={onlyGaps}
              focusBlockIndex={focusBlock?.dayIndex === dayIdx ? focusBlock.blockIndex : null}
              showLabels={showLabels}
              shiftLabelMode={shiftLabelMode}
              onShiftClick={onShiftClick}
              onDuplicateShift={onDuplicateShift}
            />
          );
        })}
      </div>
    </section>
  );
};
