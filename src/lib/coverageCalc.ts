import type { CoverageBlock, Role, Shift, TimeScale } from '../types';
import { addDays } from './dateUtils';

type DayCoverage = {
  dayKey: string;
  dayDate: Date;
  blocks: CoverageBlock[];
};

const toDayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

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

  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const dayDate = addDays(weekStart, dayIndex);
    dayDate.setHours(0, 0, 0, 0);
    const totals = new Array(totalBlocks).fill(0);
    const byRole = Object.fromEntries(roleIds.map((id) => [id, new Array(totalBlocks).fill(0)])) as Record<string, number[]>;
    return { dayDate, totals, byRole };
  });

  shifts.forEach((shift) => {
    const shiftStart = new Date(shift.startISO).getTime();
    const shiftEnd = new Date(shift.endISO).getTime();
    if (shiftEnd <= shiftStart) return;
    const roleId = getRoleId(shift);

    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      const dayStart = days[dayIndex].dayDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      if (shiftEnd <= dayStart || shiftStart >= dayEnd) continue;

      const overlapStart = Math.max(shiftStart, dayStart);
      const overlapEnd = Math.min(shiftEnd, dayEnd);
      const startIdx = Math.floor((overlapStart - dayStart) / blockMs);
      const endIdx = Math.ceil((overlapEnd - dayStart) / blockMs) - 1;

      for (let i = Math.max(0, startIdx); i <= Math.min(totalBlocks - 1, endIdx); i += 1) {
        days[dayIndex].totals[i] += 1;
        if (roleId && days[dayIndex].byRole[roleId]) days[dayIndex].byRole[roleId][i] += 1;
      }
    }
  });

  return days.map(({ dayDate, totals, byRole }) => ({
    dayKey: toDayKey(dayDate),
    dayDate,
    blocks: totals.map((total, index) => {
      const start = new Date(dayDate.getTime() + index * blockMs);
      const end = new Date(start.getTime() + blockMs);
      const blockByRole: Record<string, number> = {};
      roleIds.forEach((roleId) => {
        const value = byRole[roleId][index];
        if (value > 0) blockByRole[roleId] = value;
      });
      return { start, end, total, byRole: blockByRole };
    })
  }));
};
