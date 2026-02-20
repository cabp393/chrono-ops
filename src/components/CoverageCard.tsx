import { useEffect, useMemo, useRef, useState } from 'react';
import type { Function, Role, ScheduleBlock, TimeScale } from '../types';

type WeekBlock = {
  start: Date;
  end: Date;
  dayDate: Date;
  dayIndex: number;
  blockIndex: number;
  total: number;
  byRole: Record<string, number>;
  byFunction: Record<string, number>;
};

type SampledBar = {
  value: number;
  key: string;
};

type HeatbarRowProps = {
  blocks: WeekBlock[];
  color: string;
  maxValue: number;
  valueFromBlock: (block: WeekBlock) => number;
};

type Props = {
  roles: Role[];
  functions: Function[];
  scheduleBlocks: ScheduleBlock[];
  weekStart: Date;
  scale: TimeScale;
  activePeople: number;
};

const BAR_WIDTH = 3;
const BAR_GAP = 1;

const sampleWeekBlocks = (blocks: WeekBlock[], barsCount: number, valueFromBlock: (block: WeekBlock) => number): SampledBar[] => {
  if (blocks.length === 0 || barsCount <= 0) return [];

  if (blocks.length <= barsCount) {
    return blocks.map((block) => ({
      value: valueFromBlock(block),
      key: `${block.dayIndex}-${block.blockIndex}`
    }));
  }

  const sampled: SampledBar[] = [];
  for (let i = 0; i < barsCount; i += 1) {
    const start = Math.floor((i * blocks.length) / barsCount);
    const end = Math.max(start, Math.floor(((i + 1) * blocks.length) / barsCount) - 1);
    const chunk = blocks.slice(start, end + 1);
    const avg = chunk.reduce((sum, block) => sum + valueFromBlock(block), 0) / chunk.length;
    const middle = chunk[Math.floor(chunk.length / 2)] ?? chunk[0];

    sampled.push({
      value: avg,
      key: `${middle.dayIndex}-${middle.blockIndex}`
    });
  }

  return sampled;
};

const HeatbarRow = ({ blocks, color, maxValue, valueFromBlock }: HeatbarRowProps) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [barsCount, setBarsCount] = useState(() => blocks.length || 1);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;

    const updateBarsCount = () => {
      const width = element.clientWidth;
      const nextCount = Math.max(1, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
      setBarsCount(nextCount);
    };

    updateBarsCount();

    const observer = new ResizeObserver(() => updateBarsCount());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const bars = useMemo(() => sampleWeekBlocks(blocks, barsCount, valueFromBlock), [blocks, barsCount, valueFromBlock]);

  return (
    <div className="heatbar-line" ref={rowRef}>
      {bars.map((bar, index) => (
        <span
          key={`${bar.key}-${index}`}
          className="heatbar-segment"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            opacity: bar.value === 0 ? 0.1 : 0.15 + (bar.value / Math.max(maxValue, 1)) * 0.85,
            backgroundColor: color
          }}
        />
      ))}
    </div>
  );
};

export const CoverageCard = ({ roles, functions, scheduleBlocks, weekStart, scale, activePeople }: Props) => {
  const [view, setView] = useState<'role' | 'function'>('role');

  const weekBlocks = useMemo(() => {
    const totalBlocks = (24 * 60) / scale;
    const blockMs = scale * 60 * 1000;

    const matrix = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      dayDate.setHours(0, 0, 0, 0);
      return Array.from({ length: totalBlocks }, (_, blockIndex) => ({
        start: new Date(dayDate.getTime() + blockIndex * blockMs),
        end: new Date(dayDate.getTime() + (blockIndex + 1) * blockMs),
        dayDate,
        dayIndex,
        blockIndex,
        totalSet: new Set<string>(),
        byRoleSet: {} as Record<string, Set<string>>,
        byFunctionSet: {} as Record<string, Set<string>>
      }));
    });

    scheduleBlocks.forEach((scheduleBlock) => {
      const shiftStart = new Date(scheduleBlock.startISO).getTime();
      const shiftEnd = new Date(scheduleBlock.endISO).getTime();
      if (shiftEnd <= shiftStart) return;

      for (let dayIndex = 0; dayIndex < matrix.length; dayIndex += 1) {
        const dayStart = matrix[dayIndex][0].dayDate.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        if (shiftEnd <= dayStart || shiftStart >= dayEnd) continue;

        const overlapStart = Math.max(shiftStart, dayStart);
        const overlapEnd = Math.min(shiftEnd, dayEnd);
        const startIdx = Math.floor((overlapStart - dayStart) / blockMs);
        const endIdx = Math.ceil((overlapEnd - dayStart) / blockMs) - 1;

        for (let i = Math.max(0, startIdx); i <= Math.min(totalBlocks - 1, endIdx); i += 1) {
          const matrixBlock = matrix[dayIndex][i];
          matrixBlock.totalSet.add(scheduleBlock.personId);
          matrixBlock.byRoleSet[scheduleBlock.roleId] = matrixBlock.byRoleSet[scheduleBlock.roleId] || new Set<string>();
          matrixBlock.byFunctionSet[scheduleBlock.functionId] = matrixBlock.byFunctionSet[scheduleBlock.functionId] || new Set<string>();
          matrixBlock.byRoleSet[scheduleBlock.roleId].add(scheduleBlock.personId);
          matrixBlock.byFunctionSet[scheduleBlock.functionId].add(scheduleBlock.personId);
        }
      }
    });

    return matrix.flat().map((block) => ({
      start: block.start,
      end: block.end,
      dayDate: block.dayDate,
      dayIndex: block.dayIndex,
      blockIndex: block.blockIndex,
      total: block.totalSet.size,
      byRole: Object.fromEntries(Object.entries(block.byRoleSet).map(([id, set]) => [id, set.size])),
      byFunction: Object.fromEntries(Object.entries(block.byFunctionSet).map(([id, set]) => [id, set.size]))
    }));
  }, [scheduleBlocks, weekStart, scale]);

  const groupedFunctions = useMemo(() => {
    const byRole: Record<string, Function[]> = {};
    functions.forEach((fn) => {
      byRole[fn.roleId] = byRole[fn.roleId] || [];
      byRole[fn.roleId].push(fn);
    });
    return byRole;
  }, [functions]);

  return (
    <section className="card coverage-card">
      <div className="coverage-head">
        <div>
          <h3>Resumen de cobertura</h3>
          <p>{activePeople} personas activas</p>
        </div>
        <div className="segmented">
          <button className={view === 'role' ? 'active' : ''} onClick={() => setView('role')}>Rol</button>
          <button className={view === 'function' ? 'active' : ''} onClick={() => setView('function')}>Función</button>
        </div>
      </div>

      {view === 'role' ? (
        <>
          <div className="coverage-rows">
            {roles.map((role) => {
              const rowMax = Math.max(...weekBlocks.map((block) => block.byRole[role.id] || 0), 1);
              return (
                <div key={role.id} className="coverage-row">
                  <p className="coverage-mini-title">{role.nombre}</p>
                  <HeatbarRow
                    blocks={weekBlocks}
                    color={role.color || '#60a5fa'}
                    maxValue={rowMax}
                    valueFromBlock={(block) => block.byRole[role.id] || 0}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="coverage-rows">
            {roles.flatMap((role) => (groupedFunctions[role.id] || []).map((fn) => {
              const rowMax = Math.max(...weekBlocks.map((block) => block.byFunction[fn.id] || 0), 1);
              return (
                <div key={fn.id} className="coverage-row">
                  <p className="coverage-mini-title">{fn.nombre}</p>
                  <HeatbarRow
                    blocks={weekBlocks}
                    color={role.color || '#60a5fa'}
                    maxValue={rowMax}
                    valueFromBlock={(block) => block.byFunction[fn.id] || 0}
                  />
                </div>
              );
            }))}
          </div>
        </>
      )}
    </section>
  );
};
