import type { CoverageBlock, Role, Shift, TimeScale } from '../types';
import { addDays } from './dateUtils';
import { splitShiftByDay, toDayKey } from './shiftSegments';

type DayCoverage = {
  dayKey: string;
  dayDate: Date;
  blocks: CoverageBlock[];
};

export const calculateCoverage = (
  weekStart: Date,
  shifts: Shift[],
  roles: Role[],
  scale: TimeScale,
  getRoleId: (shift: Shift) => string | undefined
): DayCoverage[] => {
  const blockMs = scale * 60 * 1000;
  const totalBlocks = (24 * 60) / scale;
  const roleIds = roles.map((role) => role.id);
  const weekKeys = Array.from({ length: 7 }, (_, dayIndex) => toDayKey(addDays(weekStart, dayIndex)));
  const weekSet = new Set(weekKeys);
  const daySegments = new Map<string, ReturnType<typeof splitShiftByDay>>();

  shifts.forEach((shift) => {
    splitShiftByDay(shift).forEach((segment) => {
      if (!weekSet.has(segment.dayKey)) return;
      const list = daySegments.get(segment.dayKey) ?? [];
      list.push(segment);
      daySegments.set(segment.dayKey, list);
    });
  });

  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const dayDate = addDays(weekStart, dayIndex);
    dayDate.setHours(0, 0, 0, 0);
    const blocks = Array.from({ length: totalBlocks }, () => ({
      totalSet: new Set<string>(),
      byRoleSet: Object.fromEntries(roleIds.map((id) => [id, new Set<string>()])) as Record<string, Set<string>>
    }));
    return { dayDate, blocks };
  });

  days.forEach((day, dayIndex) => {
    const dayKey = weekKeys[dayIndex];
    const segments = daySegments.get(dayKey) ?? [];
    const dayStart = day.dayDate.getTime();

    segments.forEach((segment) => {
      const shift: Shift = {
        id: segment.shiftId,
        personId: segment.personId,
        startISO: segment.segStartISO,
        endISO: segment.segEndISO
      };
      const roleId = getRoleId(shift);
      const segStart = new Date(segment.segStartISO).getTime();
      const segEnd = new Date(segment.segEndISO).getTime();
      const startIdx = Math.floor((segStart - dayStart) / blockMs);
      const endIdx = Math.ceil((segEnd - dayStart) / blockMs) - 1;

      for (let i = Math.max(0, startIdx); i <= Math.min(totalBlocks - 1, endIdx); i += 1) {
        day.blocks[i].totalSet.add(segment.personId);
        if (roleId && day.blocks[i].byRoleSet[roleId]) day.blocks[i].byRoleSet[roleId].add(segment.personId);
      }
    });
  });

  return days.map(({ dayDate, blocks }) => ({
    dayKey: toDayKey(dayDate),
    dayDate,
    blocks: blocks.map((block, index) => {
      const start = new Date(dayDate.getTime() + index * blockMs);
      const end = new Date(start.getTime() + blockMs);
      const blockByRole: Record<string, number> = {};
      roleIds.forEach((roleId) => {
        const value = block.byRoleSet[roleId].size;
        if (value > 0) blockByRole[roleId] = value;
      });
      return { start, end, total: block.totalSet.size, byRole: blockByRole };
    })
  }));
};
