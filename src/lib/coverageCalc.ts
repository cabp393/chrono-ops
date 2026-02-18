import type { CoverageBlock, Role, Shift, TimeScale } from '../types';
import { addDays } from './dateUtils';

type DayCoverage = {
  dayKey: string;
  blocks: CoverageBlock[];
};

const toDayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export const calculateCoverage = (
  weekStart: Date,
  shifts: Shift[],
  roles: Role[],
  scale: TimeScale,
  filteredRoleIds: string[]
): DayCoverage[] => {
  const blockMs = scale * 60 * 1000;
  const totalBlocks = (24 * 60) / scale;
  const roleSet = new Set(filteredRoleIds);

  return Array.from({ length: 7 }, (_, d) => {
    const dayStart = addDays(weekStart, d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);

    const counts = new Array(totalBlocks).fill(0);
    const roleCounts: Record<string, number[]> = {};
    roles.forEach((role) => (roleCounts[role.id] = new Array(totalBlocks).fill(0)));

    shifts.forEach((shift) => {
      const shiftStart = new Date(shift.startISO);
      const shiftEnd = new Date(shift.endISO);
      if (shiftEnd <= dayStart || shiftStart >= dayEnd) return;
      if (roleSet.size > 0 && !roleSet.has(shift.rolId)) return;

      const s = Math.max(dayStart.getTime(), shiftStart.getTime());
      const e = Math.min(dayEnd.getTime(), shiftEnd.getTime());
      const startIdx = Math.floor((s - dayStart.getTime()) / blockMs);
      const endIdx = Math.ceil((e - dayStart.getTime()) / blockMs) - 1;

      for (let i = Math.max(0, startIdx); i <= Math.min(totalBlocks - 1, endIdx); i++) {
        counts[i] += 1;
        if (roleCounts[shift.rolId]) roleCounts[shift.rolId][i] += 1;
      }
    });

    const blocks: CoverageBlock[] = counts.map((total, i) => {
      const start = new Date(dayStart.getTime() + i * blockMs);
      const end = new Date(start.getTime() + blockMs);
      const byRole: Record<string, number> = {};
      Object.keys(roleCounts).forEach((id) => {
        if (roleCounts[id][i] > 0) byRole[id] = roleCounts[id][i];
      });
      return { start, end, total, byRole };
    });

    return { dayKey: toDayKey(dayStart), blocks };
  });
};
