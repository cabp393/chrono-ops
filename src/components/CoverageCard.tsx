import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Function, Person, Role, ScheduleBlock, TimeScale } from '../types';

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

type SelectedHeatbar = {
  mode: 'rol' | 'funcion';
  keyId: string;
  dayIndex: number;
  startMin: number;
  endMin: number;
};

type HeatbarRowProps = {
  blocks: WeekBlock[];
  color: string;
  maxValue: number;
  valueFromBlock: (block: WeekBlock) => number;
  onSelectBlock: (block: WeekBlock) => void;
};

type Props = {
  roles: Role[];
  functions: Function[];
  people: Person[];
  scheduleBlocks: ScheduleBlock[];
  weekStart: Date;
  scale: TimeScale;
  activePeople: number;
};

const MINUTES_IN_DAY = 24 * 60;

const HeatbarRow = ({ blocks, color, maxValue, valueFromBlock, onSelectBlock }: HeatbarRowProps) => {
  return (
    <div className="heatbar-line">
      {blocks.map((block) => {
        const value = valueFromBlock(block);
        return <button
          key={`${block.dayIndex}-${block.blockIndex}`}
          type="button"
          className="heatbar-segment"
          aria-label={`Abrir detalle ${block.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`}
          onClick={() => onSelectBlock(block)}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            opacity: value === 0 ? 0.1 : 0.15 + (value / Math.max(maxValue, 1)) * 0.85,
            backgroundColor: color
          }}
        />;
      })}
    </div>
  );
};

export const CoverageCard = ({ roles, functions, people, scheduleBlocks, weekStart, scale, activePeople }: Props) => {
  const [view, setView] = useState<'role' | 'function'>('role');
  const [selectedHeatbar, setSelectedHeatbar] = useState<SelectedHeatbar | null>(null);

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedHeatbar(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

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

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const functionsById = useMemo(() => new Map(functions.map((fn) => [fn.id, fn])), [functions]);

  const blocksPerDay = MINUTES_IN_DAY / scale;

  const selectedRange = useMemo(() => {
    if (!selectedHeatbar) return null;
    const dayStart = new Date(weekStart);
    dayStart.setDate(weekStart.getDate() + selectedHeatbar.dayIndex);
    dayStart.setHours(0, 0, 0, 0);
    const start = new Date(dayStart.getTime() + selectedHeatbar.startMin * 60 * 1000);
    const end = new Date(dayStart.getTime() + selectedHeatbar.endMin * 60 * 1000);
    return { start, end };
  }, [selectedHeatbar, weekStart]);

  const selectedWorkers = useMemo(() => {
    if (!selectedHeatbar || !selectedRange) return [];
    const workersById = new Map<string, { person: Person; functionNames: Set<string> }>();

    scheduleBlocks.forEach((block) => {
      const matchesMode = selectedHeatbar.mode === 'rol'
        ? block.roleId === selectedHeatbar.keyId
        : block.functionId === selectedHeatbar.keyId;
      if (!matchesMode) return;

      const start = new Date(block.startISO).getTime();
      const end = new Date(block.endISO).getTime();
      if (Math.min(end, selectedRange.end.getTime()) <= Math.max(start, selectedRange.start.getTime())) return;

      const person = peopleById.get(block.personId);
      if (!person) return;

      const entry = workersById.get(person.id) ?? { person, functionNames: new Set<string>() };
      const functionName = functionsById.get(block.functionId)?.nombre;
      if (functionName) entry.functionNames.add(functionName);
      workersById.set(person.id, entry);
    });

    return Array.from(workersById.values())
      .map((entry) => ({ ...entry, functionLabel: Array.from(entry.functionNames).sort((a, b) => a.localeCompare(b, 'es')).join(', ') }))
      .sort((a, b) => a.person.nombre.localeCompare(b.person.nombre, 'es'));
  }, [functionsById, peopleById, scheduleBlocks, selectedHeatbar, selectedRange]);

  const selectedLabel = useMemo(() => {
    if (!selectedHeatbar) return '';
    return selectedHeatbar.mode === 'rol'
      ? (rolesById.get(selectedHeatbar.keyId)?.nombre ?? '')
      : (functionsById.get(selectedHeatbar.keyId)?.nombre ?? '');
  }, [functionsById, rolesById, selectedHeatbar]);

  const selectedLinear = selectedHeatbar ? (selectedHeatbar.dayIndex * blocksPerDay) + (selectedHeatbar.startMin / scale) : -1;
  const maxLinear = (7 * blocksPerDay) - 1;

  const navigateBlock = (direction: -1 | 1) => {
    if (!selectedHeatbar) return;
    const nextLinear = selectedLinear + direction;
    if (nextLinear < 0 || nextLinear > maxLinear) return;
    const dayIndex = Math.floor(nextLinear / blocksPerDay);
    const blockIndex = nextLinear % blocksPerDay;
    setSelectedHeatbar({
      ...selectedHeatbar,
      dayIndex,
      startMin: blockIndex * scale,
      endMin: (blockIndex + 1) * scale
    });
  };

  const selectedTitle = useMemo(() => {
    if (!selectedRange) return '';
    const dayLabel = selectedRange.start.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const normalizedDay = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1).replace('.', '');
    const startTime = selectedRange.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTime = selectedRange.end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${normalizedDay} · ${startTime}–${endTime}`;
  }, [selectedRange]);

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
                    onSelectBlock={(block) => setSelectedHeatbar({ mode: 'rol', keyId: role.id, dayIndex: block.dayIndex, startMin: block.blockIndex * scale, endMin: (block.blockIndex + 1) * scale })}
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
                    onSelectBlock={(block) => setSelectedHeatbar({ mode: 'funcion', keyId: fn.id, dayIndex: block.dayIndex, startMin: block.blockIndex * scale, endMin: (block.blockIndex + 1) * scale })}
                  />
                </div>
              );
            }))}
          </div>
        </>
      )}

      {selectedHeatbar && selectedRange ? <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setSelectedHeatbar(null)}>
        <section className="modal coverage-detail-modal" onClick={(event) => event.stopPropagation()}>
          <div className="coverage-detail-head">
            <div>
              <h3>{selectedTitle}</h3>
              <p>{selectedHeatbar.mode === 'funcion' ? 'Función' : 'Rol'}: {selectedLabel}</p>
            </div>
            <div className="coverage-detail-actions">
              <button type="button" className="icon-btn" onClick={() => navigateBlock(-1)} disabled={selectedLinear <= 0} aria-label="Bloque anterior"><ChevronLeft size={14} /></button>
              <button type="button" className="icon-btn" onClick={() => navigateBlock(1)} disabled={selectedLinear >= maxLinear} aria-label="Bloque siguiente"><ChevronRight size={14} /></button>
              <button type="button" className="icon-btn" onClick={() => setSelectedHeatbar(null)} aria-label="Cerrar"><X size={14} /></button>
            </div>
          </div>

          <p className="coverage-detail-count">{selectedWorkers.length} {selectedWorkers.length === 1 ? 'trabajador' : 'trabajadores'}</p>
          {selectedWorkers.length === 0 ? <p className="empty-state">Sin cobertura en este rango.</p> : <div className="coverage-detail-list">
            {selectedWorkers.map((worker) => {
              const role = rolesById.get(worker.person.roleId);
              return <article key={worker.person.id} className="coverage-worker-item">
                <span className="coverage-worker-dot" style={{ backgroundColor: role?.color || '#60a5fa' }} />
                <div>
                  <p className="coverage-worker-name">{worker.person.nombre}</p>
                  <p className="coverage-worker-function">{worker.functionLabel || 'Sin función'}</p>
                </div>
              </article>;
            })}
          </div>}
        </section>
      </div> : null}
    </section>
  );
};
