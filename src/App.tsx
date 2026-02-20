import { Github } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CoverageCard } from './components/CoverageCard';
import { FiltersPanel } from './components/FiltersPanel';
import { HeaderBar } from './components/HeaderBar';
import { WeekGrid } from './components/WeekGrid';
import { PersonalPage } from './components/personal/PersonalPage';
import { SchedulesPage } from './components/schedules/SchedulesPage';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { buildWeekScheduleBlocks } from './lib/scheduleBlocks';
import { clearIncompatibleWeekFunction, loadAll, loadViewStatePreference, removePersonCascade, saveAll, saveViewStatePreference, weekStartISOFromDate } from './lib/storage';
import type { AppliedViewState } from './types';

const todayWeekStart = startOfWeekMonday(new Date());
const DEFAULT_VIEW_STATE: AppliedViewState = { timeScale: 60, shiftLabelMode: 'function', searchText: '', selectedPersonId: null, roleIds: [], functionIds: [] };

function App() {
  const [view, setView] = useState<'week' | 'schedules' | 'personal'>('week');
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [state, setState] = useState(() => loadAll(todayWeekStart));
  const [appliedState, setAppliedState] = useState<AppliedViewState>(() => loadViewStatePreference());
  const [focusBlock, setFocusBlock] = useState<{ dayIndex: number; blockIndex: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredPersonIds = useMemo(() => new Set(state.people.filter((person) => {
    const roleOk = appliedState.roleIds.length === 0 || appliedState.roleIds.includes(person.roleId);
    const selectedPersonOk = !appliedState.selectedPersonId || person.id === appliedState.selectedPersonId;
    const searchOk = !appliedState.searchText.trim() || person.nombre.toLowerCase().includes(appliedState.searchText.trim().toLowerCase());
    return roleOk && selectedPersonOk && searchOk;
  }).map((person) => person.id)), [state.people, appliedState]);

  const weekScheduleBlocks = useMemo(() => buildWeekScheduleBlocks(
    weekStart,
    state.people,
    state.functions,
    state.templates,
    state.personWeekPlans,
    state.personFunctionWeeks,
    state.overrides,
    appliedState.shiftLabelMode
  ).filter((block) => filteredPersonIds.has(block.personId)), [weekStart, state, appliedState.shiftLabelMode, filteredPersonIds]);

  const coverage = useMemo(() => calculateCoverage(weekStart, weekScheduleBlocks, state.roles, appliedState.timeScale, (block) => block.roleId), [weekStart, weekScheduleBlocks, state.roles, appliedState.timeScale]);

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
        <main className="dashboard-layout"><section className="main-column"><CoverageCard roles={state.roles} functions={state.functions} scheduleBlocks={weekScheduleBlocks} weekStart={weekStart} scale={appliedState.timeScale} activePeople={new Set(weekScheduleBlocks.map((b) => b.personId)).size} onFocusBlock={(dayIndex, blockIndex) => setFocusBlock({ dayIndex, blockIndex })} /><WeekGrid weekStart={weekStart} blocks={weekScheduleBlocks} roles={state.roles} scale={appliedState.timeScale} coverageTotals={Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]))} focusBlock={focusBlock} shiftLabelMode={appliedState.shiftLabelMode} /></section></main>
      ) : null}

      {view === 'schedules' ? <SchedulesPage
        weekStart={weekStart}
        people={state.people}
        roles={state.roles}
        functions={state.functions}
        templates={state.templates}
        personWeekPlans={state.personWeekPlans}
        personFunctionWeeks={state.personFunctionWeeks}
        overrides={state.overrides}
        onChange={(next) => { const merged = saveAll({ ...state, ...next }); setState(merged); }}
        onCreatePerson={({ nombre, roleId }) => {
          const next = saveAll({ ...state, people: [...state.people, { id: crypto.randomUUID(), nombre, roleId }] });
          setState(next);
        }}
        onUpdatePerson={(person) => {
          const weekISO = weekStartISOFromDate(new Date());
          const validFunctionIds = new Set(state.functions.filter((fn) => fn.roleId === person.roleId).map((fn) => fn.id));
          const next = saveAll({ ...state, people: state.people.map((row) => row.id === person.id ? person : row), personFunctionWeeks: clearIncompatibleWeekFunction(state.personFunctionWeeks, person.id, weekISO, validFunctionIds) });
          setState(next);
        }}
        onDeletePerson={(personId) => setState(saveAll(removePersonCascade(state, personId)))}
      /> : null}

      {view === 'personal' ? <PersonalPage
        roles={state.roles}
        functions={state.functions}
        templates={state.templates}
        onSaveTemplates={(templates) => setState(saveAll({ ...state, templates }))}
        onCreateRole={(name, color) => {
          const role = { id: crypto.randomUUID(), nombre: name, color };
          const next = saveAll({ ...state, roles: [...state.roles, role] });
          setState(next);
          return role.id;
        }}
        onRenameRole={(roleId, name) => setState(saveAll({ ...state, roles: state.roles.map((role) => role.id === roleId ? { ...role, nombre: name } : role) }))}
        onDeleteRole={(roleId) => {
          if (state.people.some((person) => person.roleId === roleId)) return false;
          const next = saveAll({ ...state, roles: state.roles.filter((role) => role.id !== roleId), functions: state.functions.filter((fn) => fn.roleId !== roleId) });
          setState(next);
          return true;
        }}
        onCreateFunction={(roleId, name) => setState(saveAll({ ...state, functions: [...state.functions, { id: crypto.randomUUID(), roleId, nombre: name }] }))}
        onRenameFunction={(functionId, name) => setState(saveAll({ ...state, functions: state.functions.map((fn) => fn.id === functionId ? { ...fn, nombre: name } : fn) }))}
        onDeleteFunction={(functionId) => {
          if (state.personFunctionWeeks.some((row) => row.functionId === functionId)) return false;
          setState(saveAll({ ...state, functions: state.functions.filter((fn) => fn.id !== functionId) }));
          return true;
        }}
      /> : null}

      <FiltersPanel roles={state.roles} functions={state.functions} people={state.people} appliedState={appliedState} open={filtersOpen} onClose={() => setFiltersOpen(false)} onApply={(nextState) => { setAppliedState(nextState); saveViewStatePreference(nextState); }} onReset={() => { setAppliedState(DEFAULT_VIEW_STATE); saveViewStatePreference(DEFAULT_VIEW_STATE); }} />

      <footer className="app-footer">
        <p className="app-footer-brand">ShiftBoard</p>
        <a className="app-footer-link" href="https://github.com" target="_blank" rel="noreferrer">
          <Github size={14} />
          Repositorio
        </a>
      </footer>
    </div>
  );
}

export default App;
