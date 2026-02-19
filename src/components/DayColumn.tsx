import { useMemo } from 'react';
import type { Role, ScheduleBlock, ShiftDaySegment, ShiftLabelMode, TimeScale } from '../types';
import { ShiftItem } from './ShiftItem';

type Props = {
  daySegments: ShiftDaySegment[];
  blocksById: Map<string, ScheduleBlock>;
  roles: Role[];
  scale: TimeScale;
  blockHeight: number;
  coverage: number[];
  focusBlockIndex: number | null;
  shiftLabelMode: ShiftLabelMode;
};

const SHIFT_BLOCK_WIDTH_PX = 26;

export const DayColumn = ({
  daySegments,
  blocksById,
  roles,
  scale,
  blockHeight,
  coverage,
  focusBlockIndex
}: Props) => {
  const dayHeight = ((24 * 60) / scale) * blockHeight;
  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const withLayout = useMemo(() => {
    const sorted = [...daySegments].sort((a, b) => {
      const startDiff = new Date(a.segStartISO).getTime() - new Date(b.segStartISO).getTime();
      if (startDiff !== 0) return startDiff;
      return new Date(a.segEndISO).getTime() - new Date(b.segEndISO).getTime();
    });

    const columnEnds: number[] = [];

    return sorted.map((segment) => {
      const start = new Date(segment.segStartISO).getTime();
      const end = new Date(segment.segEndISO).getTime();

      let columnIndex = columnEnds.findIndex((lastEnd) => start >= lastEnd);
      if (columnIndex === -1) {
        columnIndex = columnEnds.length;
        columnEnds.push(end);
      } else {
        columnEnds[columnIndex] = end;
      }

      return { segment, columnIndex };
    });
  }, [daySegments]);

  const columnCount = Math.max(withLayout.reduce((max, item) => Math.max(max, item.columnIndex + 1), 0), 1);
  const tracksWidth = columnCount * SHIFT_BLOCK_WIDTH_PX;

  return (
    <div className="day-column" style={{ height: dayHeight }}>
      <div className="day-viewport" style={{ height: dayHeight }}>
        <div className="day-tracks" style={{ minWidth: tracksWidth, height: dayHeight }}>
          <div className="day-grid-slots" style={{ gridTemplateRows: `repeat(${(24 * 60) / scale}, ${blockHeight}px)` }}>
            {coverage.map((_, blockIndex) => (
              <div
                key={blockIndex}
                className={`grid-slot ${focusBlockIndex === blockIndex ? 'focused' : ''}`}
              />
            ))}
          </div>

          {withLayout.map(({ segment, columnIndex }) => {
            const block = blocksById.get(segment.shiftId);
            if (!block) return null;

            const start = new Date(segment.segStartISO);
            const end = new Date(segment.segEndISO);
            const top = ((start.getHours() * 60 + start.getMinutes()) / scale) * blockHeight;
            const height = Math.max((((end.getTime() - start.getTime()) / 60000) / scale) * blockHeight, blockHeight * 0.75);
            const role = rolesById.get(block.roleId);

            return (
              <ShiftItem
                key={`${segment.shiftId}-${segment.segStartISO}`}
                block={block}
                role={role}
                compact={height < 48}
                style={{ top, height, width: SHIFT_BLOCK_WIDTH_PX, left: columnIndex * SHIFT_BLOCK_WIDTH_PX }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
