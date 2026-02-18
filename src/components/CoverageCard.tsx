import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoverageBlock, Role } from '../types';
import { formatDayHeader, formatHour } from '../lib/dateUtils';

type DayCoverage = {
  dayKey: string;
  dayDate: Date;
  blocks: CoverageBlock[];
};

type WeekBlock = CoverageBlock & {
  dayIndex: number;
  blockIndex: number;
  dayDate: Date;
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
  coverage: DayCoverage[];
  activePeople: number;
  roleTotals: Record<string, number>;
  activeRoleIds: Set<string>;
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
            width: BAR_WIDTH,
            minWidth: BAR_WIDTH,
            opacity: bar.value === 0 ? 0.1 : 0.15 + (bar.value / Math.max(maxValue, 1)) * 0.85,
            backgroundColor: color
          }}
          onClick={() => onSelect(bar)}
        />
      ))}
    </div>
  );
};

export const CoverageCard = ({ roles, coverage, activePeople, roleTotals, activeRoleIds, onFocusBlock }: Props) => {
  const [view, setView] = useState<'total' | 'role'>('total');
  const [popover, setPopover] = useState<{ title: string; details: string } | null>(null);

  const weekBlocks = useMemo(
    () => coverage.flatMap((day, dayIndex) => day.blocks.map((block, blockIndex) => ({ ...block, dayIndex, blockIndex, dayDate: day.dayDate }))),
    [coverage]
  );

  const roleNameById = useMemo(
    () => new Map(roles.map((role) => [role.id, role.nombre])),
    [roles]
  );

  const maxTotal = Math.max(...weekBlocks.map((b) => b.total), 1);

  const compactRoleLabel = (name: string, count: number) => {
    const clean = name.trim();
    const short = clean.length > 10 ? `${clean.slice(0, 1)} ${count}` : `${clean} ${count}`;
    return clean.length > 14 ? short : `${clean} ${count}`;
  };

  const showPopover = (bar: SampledBar, roleId?: string) => {
    const source = bar.sourceBlocks[Math.floor(bar.sourceBlocks.length / 2)] ?? bar.sourceBlocks[0];
    const roleLines = Object.entries(source.byRole)
      .map(([id, count]) => `${roleNameById.get(id) ?? id}: ${count}`)
      .join(' · ');
    const roleLine = roleId ? `${roleNameById.get(roleId) ?? roleId}: ${source.byRole[roleId] || 0}` : '';

    setPopover({
      title: `${formatDayHeader(source.dayDate)} · ~${formatHour(source.start)}`,
      details: `Total: ${source.total}${roleLine ? ` · ${roleLine}` : ''}${roleLines ? `\n${roleLines}` : ''}`
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
          <button className={view === 'total' ? 'active' : ''} onClick={() => setView('total')}>Total</button>
          <button className={view === 'role' ? 'active' : ''} onClick={() => setView('role')}>Por rol</button>
        </div>
      </div>

      {view === 'role' && (
        <div className="chip-row">
          {roles.map((role) => {
            const active = activeRoleIds.size === 0 || activeRoleIds.has(role.id);
            return (
              <span key={role.id} className={`chip ${active ? 'active' : 'muted'}`} style={{ borderColor: role.color, color: role.color }}>
                {role.nombre}: {roleTotals[role.id] || 0}
              </span>
            );
          })}
        </div>
      )}

      {view === 'total' ? (
        <div className="role-rows total-row-wrap">
          <div className="role-row total-row">
            <span className="chip role-chip total-row-label" aria-hidden="true">Total</span>
            <div className="role-row-bars">
              <HeatbarRow
                blocks={weekBlocks}
                color="#2563eb"
                maxValue={maxTotal}
                valueFromBlock={(block) => block.total}
                onSelect={(bar) => showPopover(bar)}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="role-rows">
          {roles.map((role) => {
            const rowMax = Math.max(
              ...weekBlocks.map((block) => block.byRole[role.id] || 0),
              1
            );
            return (
              <div key={role.id} className="role-row">
                <span className="chip role-chip" style={{ borderColor: role.color, color: role.color }} title={`${role.nombre} ${roleTotals[role.id] || 0}`}>
                  {compactRoleLabel(role.nombre, roleTotals[role.id] || 0)}
                </span>
                <div className="role-row-bars">
                  <HeatbarRow
                    blocks={weekBlocks}
                    color={role.color || '#60a5fa'}
                    maxValue={rowMax}
                    valueFromBlock={(block) => block.byRole[role.id] || 0}
                    onSelect={(bar) => showPopover(bar, role.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
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
