import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { ShiftModal } from './components/ShiftModal';
import { WeekGrid } from './components/WeekGrid';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { buildFunctionMap, buildPersonMap, buildRoleMap, getShiftRole } from './lib/relations';
import { loadData, saveData } from './lib/storage';
import { clampScale } from './lib/timeScale';
import type { AppliedFilters, Shift, TimeScale } from './types';

const todayWeekStart = startOfWeekMonday(new Date());
const EMPTY_FILTERS: AppliedFilters = { searchText: '', roleIds: [], functionIds: [] };

function App() {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [data, setData] = useState(() => loadData(todayWeekStart));
  const [scale, setScale] = useState<TimeScale>(60);
  const [filters, setFilters] = useState<AppliedFilters>(EMPTY_FILTERS);
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const peopleById = useMemo(() => buildPersonMap(data.people), [data.people]);
  const functionsById = useMemo(() => buildFunctionMap(data.functions), [data.functions]);
  const rolesById = useMemo(() => buildRoleMap(data.roles), [data.roles]);

  const filteredPersonIds = useMemo(() => {
    const search = filters.searchText.trim().toLowerCase();
    return new Set(data.people.filter((person) => {
      const fn = functionsById.get(person.functionId);
      const roleOk = filters.roleIds.length === 0 || (fn ? filters.roleIds.includes(fn.roleId) : false);
      const functionOk = filters.functionIds.length === 0 || filters.functionIds.includes(person.functionId);
      const searchOk = !search || person.nombre.toLowerCase().includes(search) || (fn?.nombre.toLowerCase().includes(search) ?? false);
      return roleOk && functionOk && searchOk;
    }).map((person) => person.id));
  }, [data.people, functionsById, filters]);

  const visibleShifts = useMemo(() => data.shifts.filter((shift) => {
    const start = new Date(shift.startISO);
    const inWeek = start >= weekStart && start < addDays(weekStart, 7);
    return inWeek && filteredPersonIds.has(shift.personId);
  }), [data.shifts, weekStart, filteredPersonIds]);

  const shiftRoleId = (shift: Shift) => getShiftRole(shift, peopleById, functionsById, rolesById)?.id;

  const coverage = useMemo(
    () => calculateCoverage(weekStart, visibleShifts, data.roles, scale, shiftRoleId),
    [weekStart, visibleShifts, data.roles, scale, peopleById, functionsById, rolesById]
  );

  const roleTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    visibleShifts.forEach((shift) => {
      const roleId = shiftRoleId(shift);
      if (!roleId) return;
      totals[roleId] = (totals[roleId] || 0) + 1;
    });
    return totals;
  }, [visibleShifts, peopleById, functionsById, rolesById]);

  const activePeople = useMemo(() => new Set(visibleShifts.map((shift) => shift.personId)).size, [visibleShifts]);

  const coverageTotals = Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]));

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
            activeRoleIds={new Set(filters.roleIds)}
            onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })}
          />
          <WeekGrid
            weekStart={weekStart}
            shifts={visibleShifts}
            people={data.people}
            functions={data.functions}
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
          functions={data.functions}
          people={data.people}
          appliedFilters={filters}
          showLabels={showLabels}
          onlyGaps={onlyGaps}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onApplyFilters={setFilters}
          onResetFilters={() => setFilters(EMPTY_FILTERS)}
          onToggleLabels={setShowLabels}
          onToggleGaps={setOnlyGaps}
        />
      </main>

      <ShiftModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        people={data.people}
        functions={data.functions}
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
