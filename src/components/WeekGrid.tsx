import { useEffect, useMemo, useRef } from 'react';
import type { Role, ScheduleBlock, ShiftDaySegment, ShiftLabelMode, TimeScale } from '../types';
import { addDays, formatDayHeader, isSameDay } from '../lib/dateUtils';
import { splitShiftByDay, toDayKey } from '../lib/shiftSegments';
import { DayColumn } from './DayColumn';
import { TimeAxis } from './TimeAxis';

type Props = {
  weekStart: Date;
  blocks: ScheduleBlock[];
  roles: Role[];
  scale: TimeScale;
  coverageTotals: Record<string, number[]>;
  focusBlock: { dayIndex: number; blockIndex: number } | null;
  shiftLabelMode: ShiftLabelMode;
};

const BLOCK_HEIGHT: Record<TimeScale, number> = { 30: 30, 60: 25, 120: 21, 180: 19, 240: 17, 360: 16 };

export const WeekGrid = ({
  weekStart,
  blocks,
  roles,
  scale,
  coverageTotals,
  focusBlock,
  shiftLabelMode
}: Props) => {
  const blockHeight = BLOCK_HEIGHT[scale];
  const gridRef = useRef<HTMLDivElement>(null);

  const dayShifts = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, dayIndex) => toDayKey(addDays(weekStart, dayIndex)));
    const byDay = new Map<string, ShiftDaySegment[]>(keys.map((key) => [key, []]));

    blocks.forEach((block) => {
      splitShiftByDay(block).forEach((segment) => {
        const slot = byDay.get(segment.dayKey);
        if (slot) slot.push(segment);
      });
    });

    return keys.map((key) => byDay.get(key) ?? []);
  }, [blocks, weekStart]);

  const blocksById = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);

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
          const key = toDayKey(dayDate);
          const coverage = coverageTotals[key] ?? [];
          return (
            <DayColumn
              key={dayIdx}
              daySegments={list}
              blocksById={blocksById}
              roles={roles}
              scale={scale}
              blockHeight={blockHeight}
              coverage={coverage}
              focusBlockIndex={focusBlock?.dayIndex === dayIdx ? focusBlock.blockIndex : null}
              shiftLabelMode={shiftLabelMode}
            />
          );
        })}
      </div>
    </section>
  );
};
