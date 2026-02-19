import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { WeekGrid } from './components/WeekGrid';
import { SchedulesPage } from './components/schedules/SchedulesPage';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { buildFunctionMap } from './lib/relations';
import { buildWeekScheduleBlocks } from './lib/scheduleBlocks';
import { loadScheduleData, saveScheduleData } from './lib/scheduleStorage';
import { loadData, loadViewStatePreference, saveViewStatePreference } from './lib/storage';
import type { AppliedViewState } from './types';

const todayWeekStart = startOfWeekMonday(new Date());
const DEFAULT_VIEW_STATE: AppliedViewState = {
  timeScale: 60,
  shiftLabelMode: 'function',
  searchText: '',
  selectedPersonId: null,
  roleIds: [],
  functionIds: []
};

function App() {
  const [view, setView] = useState<'week' | 'schedules'>('week');
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [data] = useState(() => loadData(todayWeekStart));
  const [schedulesState, setSchedulesState] = useState(() => loadScheduleData(data.people));
  const [appliedState, setAppliedState] = useState<AppliedViewState>(() => loadViewStatePreference());
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const functionsById = useMemo(() => buildFunctionMap(data.functions), [data.functions]);

  const filteredPersonIds = useMemo(() => {
    const search = appliedState.searchText.trim().toLowerCase();
    return new Set(data.people.filter((person) => {
      const fn = functionsById.get(person.functionId);
      const roleOk = appliedState.roleIds.length === 0 || (fn ? appliedState.roleIds.includes(fn.roleId) : false);
      const functionOk = appliedState.functionIds.length === 0 || appliedState.functionIds.includes(person.functionId);
      const selectedPersonOk = !appliedState.selectedPersonId || person.id === appliedState.selectedPersonId;
      const searchOk = !search || person.nombre.toLowerCase().includes(search);
      return roleOk && functionOk && selectedPersonOk && searchOk;
    }).map((person) => person.id));
  }, [data.people, functionsById, appliedState]);

  const weekScheduleBlocks = useMemo(() => buildWeekScheduleBlocks(
    weekStart,
    data.people,
    data.functions,
    schedulesState.templates,
    schedulesState.personWeekPlans,
    schedulesState.overrides,
    appliedState.shiftLabelMode
  ).filter((block) => filteredPersonIds.has(block.personId)), [
    weekStart,
    data.people,
    data.functions,
    schedulesState.templates,
    schedulesState.personWeekPlans,
    schedulesState.overrides,
    appliedState.shiftLabelMode,
    filteredPersonIds
  ]);

  const coverage = useMemo(
    () => calculateCoverage(weekStart, weekScheduleBlocks, data.roles, appliedState.timeScale, (block) => block.roleId),
    [weekStart, weekScheduleBlocks, data.roles, appliedState.timeScale]
  );

  const activePeople = useMemo(
    () => new Set(weekScheduleBlocks.map((block) => block.personId)).size,
    [weekScheduleBlocks]
  );

  const coverageTotals = Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]));

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
              roles={data.roles}
              functions={data.functions}
              scheduleBlocks={weekScheduleBlocks}
              weekStart={weekStart}
              scale={appliedState.timeScale}
              activePeople={activePeople}
              onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })}
            />
            <WeekGrid
              weekStart={weekStart}
              blocks={weekScheduleBlocks}
              roles={data.roles}
              scale={appliedState.timeScale}
              coverageTotals={coverageTotals}
              focusBlock={focusBlock}
              shiftLabelMode={appliedState.shiftLabelMode}
            />
          </section>
        </main>
      ) : (
        <SchedulesPage
          people={data.people}
          functions={data.functions}
          scheduleData={schedulesState}
          onScheduleDataChange={(next) => {
            setSchedulesState(next);
            saveScheduleData(next);
          }}
        />
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
    </div>
  );
}

export default App;
