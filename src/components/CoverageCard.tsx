import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDayHeader, formatHour } from '../lib/dateUtils';
import type { Function, Person, Role, Shift, TimeScale } from '../types';

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
  dayIndex: number;
  blockIndex: number;
  sourceBlocks: WeekBlock[];
};

type HeatbarRowProps = {
  blocks: WeekBlock[];
  color: string;
  maxValue: number;
  valueFromBlock: (block: WeekBlock) => number;
  onSelect: (bar: SampledBar) => void;
};

type Props = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  shifts: Shift[];
  weekStart: Date;
  scale: TimeScale;
  activePeople: number;
  onFocusBlock: (dayIndex: number, blockIndex: number) => void;
};

const BAR_WIDTH = 3;
const BAR_GAP = 1;

const sampleWeekBlocks = (blocks: WeekBlock[], barsCount: number, valueFromBlock: (block: WeekBlock) => number): SampledBar[] => {
  if (blocks.length === 0 || barsCount <= 0) return [];

  if (blocks.length <= barsCount) {
    return blocks.map((block) => ({
      value: valueFromBlock(block),
      dayIndex: block.dayIndex,
      blockIndex: block.blockIndex,
      sourceBlocks: [block]
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
      dayIndex: middle.dayIndex,
      blockIndex: middle.blockIndex,
      sourceBlocks: chunk
    });
  }

  return sampled;
};

const HeatbarRow = ({ blocks, color, maxValue, valueFromBlock, onSelect }: HeatbarRowProps) => {
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
        <button
          key={`${bar.dayIndex}-${bar.blockIndex}-${index}`}
          className="heatbar-segment"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            opacity: bar.value === 0 ? 0.1 : 0.15 + (bar.value / Math.max(maxValue, 1)) * 0.85,
            backgroundColor: color
          }}
          onClick={() => onSelect(bar)}
        />
      ))}
    </div>
  );
};

export const CoverageCard = ({ roles, functions, people, shifts, weekStart, scale, activePeople, onFocusBlock }: Props) => {
  const [view, setView] = useState<'role' | 'function'>('role');
  const [popover, setPopover] = useState<{ title: string; details: string } | null>(null);

  const functionById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

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

    shifts.forEach((shift) => {
      const shiftStart = new Date(shift.startISO).getTime();
      const shiftEnd = new Date(shift.endISO).getTime();
      if (shiftEnd <= shiftStart) return;
      const person = personById.get(shift.personId);
      if (!person) return;
      const fn = functionById.get(person.functionId);
      if (!fn) return;

      for (let dayIndex = 0; dayIndex < matrix.length; dayIndex += 1) {
        const dayStart = matrix[dayIndex][0].dayDate.getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        if (shiftEnd <= dayStart || shiftStart >= dayEnd) continue;

        const overlapStart = Math.max(shiftStart, dayStart);
        const overlapEnd = Math.min(shiftEnd, dayEnd);
        const startIdx = Math.floor((overlapStart - dayStart) / blockMs);
        const endIdx = Math.ceil((overlapEnd - dayStart) / blockMs) - 1;

        for (let i = Math.max(0, startIdx); i <= Math.min(totalBlocks - 1, endIdx); i += 1) {
          const block = matrix[dayIndex][i];
          block.totalSet.add(shift.personId);
          block.byRoleSet[fn.roleId] = block.byRoleSet[fn.roleId] || new Set<string>();
          block.byFunctionSet[fn.id] = block.byFunctionSet[fn.id] || new Set<string>();
          block.byRoleSet[fn.roleId].add(shift.personId);
          block.byFunctionSet[fn.id].add(shift.personId);
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
  }, [shifts, weekStart, scale, personById, functionById]);

  const roleTotals = useMemo(() => {
    const counts: Record<string, number> = {};
    const seen = new Set<string>();
    shifts.forEach((shift) => {
      if (seen.has(shift.personId)) return;
      const person = personById.get(shift.personId);
      const fn = person ? functionById.get(person.functionId) : undefined;
      if (!fn) return;
      seen.add(shift.personId);
      counts[fn.roleId] = (counts[fn.roleId] || 0) + 1;
    });
    return counts;
  }, [shifts, personById, functionById]);

  const functionTotals = useMemo(() => {
    const counts: Record<string, number> = {};
    const seen = new Set<string>();
    shifts.forEach((shift) => {
      if (seen.has(shift.personId)) return;
      const person = personById.get(shift.personId);
      if (!person) return;
      seen.add(shift.personId);
      counts[person.functionId] = (counts[person.functionId] || 0) + 1;
    });
    return counts;
  }, [shifts, personById]);

  const groupedFunctions = useMemo(() => {
    const byRole: Record<string, Function[]> = {};
    functions.forEach((fn) => {
      byRole[fn.roleId] = byRole[fn.roleId] || [];
      byRole[fn.roleId].push(fn);
    });
    return byRole;
  }, [functions]);

  const roleById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);

  const showPopover = (bar: SampledBar, entityName: string, value: number, roleName?: string) => {
    const source = bar.sourceBlocks[Math.floor(bar.sourceBlocks.length / 2)] ?? bar.sourceBlocks[0];
    setPopover({
      title: `${entityName} · ${formatDayHeader(source.dayDate)} · ${formatHour(source.start)}-${formatHour(source.end)}`,
      details: `Cobertura: ${Math.round(value)} personas${roleName ? ` · Rol: ${roleName}` : ''}`
    });
    onFocusBlock(bar.dayIndex, bar.blockIndex);
  };

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
          <div className="chip-row">
            {roles.map((role) => (
              <span key={role.id} className="chip" style={{ borderColor: role.color, color: role.color }}>
                {role.nombre}: {roleTotals[role.id] || 0}
              </span>
            ))}
          </div>
          <div className="coverage-rows">
            {roles.map((role) => {
              const rowMax = Math.max(...weekBlocks.map((block) => block.byRole[role.id] || 0), 1);
              return (
                <div key={role.id} className="coverage-row">
                  <HeatbarRow
                    blocks={weekBlocks}
                    color={role.color || '#60a5fa'}
                    maxValue={rowMax}
                    valueFromBlock={(block) => block.byRole[role.id] || 0}
                    onSelect={(bar) => {
                      const source = bar.sourceBlocks[Math.floor(bar.sourceBlocks.length / 2)] ?? bar.sourceBlocks[0];
                      showPopover(bar, role.nombre, source.byRole[role.id] || 0);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="chip-row">
            {roles.flatMap((role) => (groupedFunctions[role.id] || []).map((fn) => (
              <span key={fn.id} className="chip" style={{ borderColor: role.color, color: role.color }}>
                {fn.nombre}: {functionTotals[fn.id] || 0}
              </span>
            )))}
          </div>
          <div className="coverage-rows">
            {roles.map((role) => (
              <div key={role.id} className="function-coverage-group">
                <p>{role.nombre}</p>
                {(groupedFunctions[role.id] || []).map((fn) => {
                  const rowMax = Math.max(...weekBlocks.map((block) => block.byFunction[fn.id] || 0), 1);
                  return (
                    <div key={fn.id} className="coverage-row">
                      <HeatbarRow
                        blocks={weekBlocks}
                        color={role.color || '#60a5fa'}
                        maxValue={rowMax}
                        valueFromBlock={(block) => block.byFunction[fn.id] || 0}
                        onSelect={(bar) => {
                          const source = bar.sourceBlocks[Math.floor(bar.sourceBlocks.length / 2)] ?? bar.sourceBlocks[0];
                          showPopover(bar, fn.nombre, source.byFunction[fn.id] || 0, roleById.get(fn.roleId)?.nombre);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}


      {popover && (
        <button className="coverage-popover" onClick={() => setPopover(null)}>
          <strong>{popover.title}</strong>
          <span>{popover.details}</span>
        </button>
      )}
    </section>
  );
};
