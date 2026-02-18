import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { ShiftModal } from './components/ShiftModal';
import { WeekGrid } from './components/WeekGrid';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatDayHeader, formatWeekRange, formatHour, startOfWeekMonday } from './lib/dateUtils';
import { loadData, saveData } from './lib/storage';
import { clampScale } from './lib/timeScale';
import type { Shift, TimeScale } from './types';

const todayWeekStart = startOfWeekMonday(new Date());

function App() {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [data, setData] = useState(() => loadData(todayWeekStart));
  const [scale, setScale] = useState<TimeScale>(60);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const peopleFiltered = useMemo(
    () => data.people.filter((person) => person.nombre.toLowerCase().includes(personQuery.toLowerCase())),
    [data.people, personQuery]
  );
  const peopleSet = new Set(peopleFiltered.map((person) => person.id));

  const visibleShifts = useMemo(() => data.shifts.filter((shift) => {
    const start = new Date(shift.startISO);
    const inWeek = start >= weekStart && start < addDays(weekStart, 7);
    const roleOk = selectedRoles.length === 0 || selectedRoles.includes(shift.rolId);
    const personOk = peopleSet.has(shift.personId);
    return inWeek && roleOk && personOk;
  }), [data.shifts, weekStart, selectedRoles, peopleSet]);

  const coverage = useMemo(() => calculateCoverage(weekStart, visibleShifts, data.roles, scale), [weekStart, visibleShifts, data.roles, scale]);

  const roleTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    visibleShifts.forEach((shift) => {
      totals[shift.rolId] = (totals[shift.rolId] || 0) + 1;
    });
    return totals;
  }, [visibleShifts]);

  const activePeople = useMemo(() => new Set(visibleShifts.map((shift) => shift.personId)).size, [visibleShifts]);

  const coverageTotals = Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]));

  const metrics = useMemo(() => {
    const list = coverage.flatMap((day, dayIndex) => day.blocks.map((block, blockIndex) => ({ block, dayIndex, blockIndex, dayDate: day.dayDate })));
    if (list.length === 0) return [{ label: 'Máx cobertura (bloque)', value: 'N/A' }, { label: 'Min cobertura (bloque)', value: 'N/A' }];
    const max = list.reduce((prev, current) => (current.block.total > prev.block.total ? current : prev), list[0]);
    const min = list.reduce((prev, current) => (current.block.total < prev.block.total ? current : prev), list[0]);
    return [
      { label: 'Máx cobertura (bloque)', value: `${max.block.total} · ${formatDayHeader(max.dayDate)} ${formatHour(max.block.start)}` },
      { label: 'Min cobertura (bloque)', value: `${min.block.total} · ${formatDayHeader(min.dayDate)} ${formatHour(min.block.start)}` }
    ];
  }, [coverage]);

  const persist = (nextShifts: Shift[]) => {
    const next = { ...data, shifts: nextShifts };
    setData(next);
    saveData(next);
  };

  const duplicateShift = (shift: Shift, dayOffset = 1) => {
    const start = addDays(new Date(shift.startISO), dayOffset);
    const end = addDays(new Date(shift.endISO), dayOffset);
    persist([...data.shifts, { ...shift, id: crypto.randomUUID(), startISO: start.toISOString(), endISO: end.toISOString() }]);
  };

  return (
    <div className="app-shell">
      <HeaderBar
        weekLabel={formatWeekRange(weekStart)}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        scale={scale}
        onScaleDown={() => setScale(clampScale(scale - 1))}
        onScaleUp={() => setScale(clampScale(scale + 1))}
        onScaleChange={setScale}
        onAddShift={() => { setEditing(null); setModalOpen(true); }}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <main className="dashboard-layout">
        <section className="main-column">
          <CoverageCard
            roles={data.roles}
            coverage={coverage}
            activePeople={activePeople}
            roleTotals={roleTotals}
            onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })}
          />
          <WeekGrid
            weekStart={weekStart}
            shifts={visibleShifts}
            people={data.people}
            roles={data.roles}
            scale={scale}
            coverageTotals={coverageTotals}
            onShiftClick={(shift) => { setEditing(shift); setModalOpen(true); }}
            onDuplicateShift={(shift) => duplicateShift(shift, 1)}
            onlyGaps={onlyGaps}
            focusBlock={focusBlock}
            showLabels={showLabels}
          />
        </section>

        <FiltersPanel
          roles={data.roles}
          people={peopleFiltered}
          selectedRoles={selectedRoles}
          personQuery={personQuery}
          onlyGaps={onlyGaps}
          showLabels={showLabels}
          metrics={metrics}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onPersonQuery={setPersonQuery}
          onToggleGaps={setOnlyGaps}
          onToggleLabels={setShowLabels}
          onToggleRole={(id) => setSelectedRoles((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])}
        />
      </main>

      <ShiftModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        people={peopleFiltered}
        roles={data.roles}
        onSave={(shift) => {
          const exists = data.shifts.some((item) => item.id === shift.id);
          persist(exists ? data.shifts.map((item) => (item.id === shift.id ? shift : item)) : [...data.shifts, shift]);
        }}
        onDuplicate={(shift, dayOffset) => duplicateShift(shift, dayOffset)}
      />
    </div>
  );
}

export default App;
