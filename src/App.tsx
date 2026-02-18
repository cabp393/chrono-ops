import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { ShiftModal } from './components/ShiftModal';
import { WeekGrid } from './components/WeekGrid';
import { SchedulesPage } from './components/schedules/SchedulesPage';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { buildFunctionMap, buildPersonMap, buildRoleMap, getShiftRole } from './lib/relations';
import { loadData, loadViewStatePreference, saveData, saveViewStatePreference } from './lib/storage';
import type { AppliedViewState, Shift } from './types';

const todayWeekStart = startOfWeekMonday(new Date());
const DEFAULT_VIEW_STATE: AppliedViewState = {
  timeScale: 60,
  shiftLabelMode: 'function',
  searchText: '',
  roleIds: [],
  functionIds: []
};

function App() {
  const [view, setView] = useState<'week' | 'schedules'>('week');
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [data, setData] = useState(() => loadData(todayWeekStart));
  const [appliedState, setAppliedState] = useState<AppliedViewState>(() => loadViewStatePreference());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const peopleById = useMemo(() => buildPersonMap(data.people), [data.people]);
  const functionsById = useMemo(() => buildFunctionMap(data.functions), [data.functions]);
  const rolesById = useMemo(() => buildRoleMap(data.roles), [data.roles]);

  const filteredPersonIds = useMemo(() => {
    const search = appliedState.searchText.trim().toLowerCase();
    return new Set(data.people.filter((person) => {
      const fn = functionsById.get(person.functionId);
      const roleOk = appliedState.roleIds.length === 0 || (fn ? appliedState.roleIds.includes(fn.roleId) : false);
      const functionOk = appliedState.functionIds.length === 0 || appliedState.functionIds.includes(person.functionId);
      const searchOk = !search || person.nombre.toLowerCase().includes(search) || (fn?.nombre.toLowerCase().includes(search) ?? false);
      return roleOk && functionOk && searchOk;
    }).map((person) => person.id));
  }, [data.people, functionsById, appliedState]);

  const visibleShifts = useMemo(() => data.shifts.filter((shift) => {
    const start = new Date(shift.startISO);
    const end = new Date(shift.endISO);
    const inWeek = end > weekStart && start < addDays(weekStart, 7);
    return inWeek && filteredPersonIds.has(shift.personId);
  }), [data.shifts, weekStart, filteredPersonIds]);

  const shiftRoleId = (shift: Shift) => getShiftRole(shift, peopleById, functionsById, rolesById)?.id;

  const coverage = useMemo(
    () => calculateCoverage(weekStart, visibleShifts, data.roles, appliedState.timeScale, shiftRoleId),
    [weekStart, visibleShifts, data.roles, appliedState.timeScale, peopleById, functionsById, rolesById]
  );

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
        isCurrentWeek={weekStart.getTime() === todayWeekStart.getTime()}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        onAddShift={() => { setEditing(null); setModalOpen(true); }}
        onOpenFilters={() => setFiltersOpen(true)}
        view={view}
        onChangeView={setView}
      />

      {view === 'week' ? (
        <main className="dashboard-layout">
          <section className="main-column">
            <CoverageCard
              roles={data.roles}
              functions={data.functions}
              people={data.people}
              shifts={visibleShifts}
              weekStart={weekStart}
              scale={appliedState.timeScale}
              activePeople={activePeople}
              onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })}
            />
            <WeekGrid
              weekStart={weekStart}
              shifts={visibleShifts}
              people={data.people}
              functions={data.functions}
              roles={data.roles}
              scale={appliedState.timeScale}
              coverageTotals={coverageTotals}
              onShiftClick={(shift) => { setEditing(shift); setModalOpen(true); }}
              focusBlock={focusBlock}
              shiftLabelMode={appliedState.shiftLabelMode}
            />
          </section>
        </main>
      ) : (
        <SchedulesPage people={data.people} functions={data.functions} />
      )}

      <FiltersPanel
        roles={data.roles}
        functions={data.functions}
        people={data.people}
        appliedState={appliedState}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={(nextState) => {
          setAppliedState(nextState);
          saveViewStatePreference(nextState);
        }}
        onReset={() => {
          setAppliedState(DEFAULT_VIEW_STATE);
          saveViewStatePreference(DEFAULT_VIEW_STATE);
        }}
      />

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
