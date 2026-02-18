import { useMemo, useState } from 'react';
import type { CoverageBlock, Role } from '../types';
import { formatDayHeader, formatHour } from '../lib/dateUtils';

type DayCoverage = {
  dayKey: string;
  dayDate: Date;
  blocks: CoverageBlock[];
};

type Props = {
  roles: Role[];
  coverage: DayCoverage[];
  activePeople: number;
  roleTotals: Record<string, number>;
  activeRoleIds: Set<string>;
  onFocusBlock: (dayIndex: number, blockIndex: number) => void;
};

export const CoverageCard = ({ roles, coverage, activePeople, roleTotals, activeRoleIds, onFocusBlock }: Props) => {
  const [view, setView] = useState<'total' | 'role'>('total');
  const weekBlocks = useMemo(
    () => coverage.flatMap((day, dayIndex) => day.blocks.map((block, blockIndex) => ({ ...block, dayIndex, blockIndex, dayDate: day.dayDate }))),
    [coverage]
  );
  const maxTotal = Math.max(...weekBlocks.map((b) => b.total), 1);

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

      {view === 'total' ? (
        <div className="heatbar">
          {weekBlocks.map((block, i) => {
            const roleLines = Object.entries(block.byRole)
              .map(([id, count]) => `${roles.find((role) => role.id === id)?.nombre ?? id}: ${count}`)
              .join(' · ');
            const title = `${formatDayHeader(block.dayDate)} ${formatHour(block.start)}-${formatHour(block.end)} | Total: ${block.total}${roleLines ? ` | ${roleLines}` : ''}`;
            return (
              <button
                key={i}
                className="heatbar-segment"
                style={{ opacity: 0.15 + (block.total / maxTotal) * 0.85 }}
                title={title}
                onClick={() => onFocusBlock(block.dayIndex, block.blockIndex)}
              />
            );
          })}
        </div>
      ) : (
        <div className="role-rows">
          {roles.map((role) => {
            const rowMax = Math.max(
              ...coverage.flatMap((day) => day.blocks.map((block) => block.byRole[role.id] || 0)),
              1
            );
            return (
              <div key={role.id} className="role-row">
                <span>{role.nombre}</span>
                <div className="role-row-bars">
                  {coverage.flatMap((day, dayIndex) => day.blocks.map((block, blockIndex) => {
                    const value = block.byRole[role.id] || 0;
                    return (
                      <button
                        key={`${role.id}-${dayIndex}-${blockIndex}`}
                        title={`${formatDayHeader(day.dayDate)} ${formatHour(block.start)}-${formatHour(block.end)} | ${role.nombre}: ${value}`}
                        style={{ opacity: value === 0 ? 0.1 : 0.2 + (value / rowMax) * 0.8, backgroundColor: role.color || '#60a5fa' }}
                        onClick={() => onFocusBlock(dayIndex, blockIndex)}
                      />
                    );
                  }))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
