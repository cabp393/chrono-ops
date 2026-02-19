import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { WeekGrid } from './components/WeekGrid';
import { SchedulesPage } from './components/schedules/SchedulesPage';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { buildWeekScheduleBlocks } from './lib/scheduleBlocks';
import { loadAll, saveAll } from './lib/scheduleStorage';
import { resolvePersonFunctionIdForWeek, toISODate } from './lib/scheduleUtils';
import { loadViewStatePreference, saveViewStatePreference } from './lib/storage';
import type { AppliedViewState } from './types';

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
  const [store, setStore] = useState(() => loadAll());
  const [appliedState, setAppliedState] = useState<AppliedViewState>(() => loadViewStatePreference());
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const weekStartISO = toISODate(weekStart);

  const filteredPersonIds = useMemo(() => {
    const search = appliedState.searchText.trim().toLowerCase();
    return new Set(store.people.filter((person) => {
      const functionId = resolvePersonFunctionIdForWeek(person.id, person.roleId, weekStartISO, store.functions, store.personFunctionWeeks);
      const fn = functionId ? store.functions.find((item) => item.id === functionId) : null;
      const roleOk = appliedState.roleIds.length === 0 || appliedState.roleIds.includes(person.roleId);
      const functionOk = appliedState.functionIds.length === 0 || (functionId ? appliedState.functionIds.includes(functionId) : false);
      const searchOk = !search || person.nombre.toLowerCase().includes(search) || (fn?.nombre.toLowerCase().includes(search) ?? false);
      return roleOk && functionOk && searchOk;
    }).map((person) => person.id));
  }, [store.people, store.functions, store.personFunctionWeeks, weekStartISO, appliedState]);

  const weekScheduleBlocks = useMemo(() => buildWeekScheduleBlocks(
    weekStart,
    store.people,
    store.functions,
    store.personFunctionWeeks,
    store.templates,
    store.personSchedules,
    store.overrides,
    appliedState.shiftLabelMode
  ).filter((block) => filteredPersonIds.has(block.personId)), [
    weekStart,
    store.people,
    store.functions,
    store.personFunctionWeeks,
    store.templates,
    store.personSchedules,
    store.overrides,
    appliedState.shiftLabelMode,
    filteredPersonIds
  ]);

  const coverage = useMemo(
    () => calculateCoverage(weekStart, weekScheduleBlocks, store.roles, appliedState.timeScale, (block) => block.roleId),
    [weekStart, weekScheduleBlocks, store.roles, appliedState.timeScale]
  );

  const activePeople = useMemo(
    () => new Set(weekScheduleBlocks.map((block) => block.personId)).size,
    [weekScheduleBlocks]
  );

  const coverageTotals = Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]));

  const updateStore = (next: typeof store) => {
    setStore(next);
    saveAll(next);
  };

  return (
    <div className="app-shell">
      <HeaderBar
        weekLabel={formatWeekRange(weekStart)}
        isCurrentWeek={weekStart.getTime() === todayWeekStart.getTime()}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        onOpenFilters={() => setFiltersOpen(true)}
        view={view}
        onChangeView={setView}
      />

      {view === 'week' ? (
        <main className="dashboard-layout">
          <section className="main-column">
            <CoverageCard
              roles={store.roles}
              functions={store.functions}
              scheduleBlocks={weekScheduleBlocks}
              weekStart={weekStart}
              scale={appliedState.timeScale}
              activePeople={activePeople}
              onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })}
            />
            <WeekGrid
              weekStart={weekStart}
              blocks={weekScheduleBlocks}
              roles={store.roles}
              scale={appliedState.timeScale}
              coverageTotals={coverageTotals}
              focusBlock={focusBlock}
              shiftLabelMode={appliedState.shiftLabelMode}
            />
          </section>
        </main>
      ) : (
        <SchedulesPage
          data={store}
          onSaveAll={updateStore}
        />
      )}

      <FiltersPanel
        roles={store.roles}
        functions={store.functions}
        people={store.people}
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
    </div>
  );
}

export default App;
