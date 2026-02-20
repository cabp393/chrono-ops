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
import { normalizeRoleColor } from './lib/roleColor';
import { buildWeekScheduleBlocks } from './lib/scheduleBlocks';
import { splitShiftByDay } from './lib/shiftSegments';
import { clearIncompatibleWeekFunction, loadAll, loadViewStatePreference, removePersonCascade, saveAll, saveViewStatePreference, weekStartISOFromDate } from './lib/storage';
import type { AppliedViewState } from './types';

const todayWeekStart = startOfWeekMonday(new Date());
const DEFAULT_VIEW_STATE: AppliedViewState = {
  timeScale: 60,
  shiftLabelMode: 'function',
  searchText: '',
  selectedPersonId: null,
  roleIds: [],
  functionIds: [],
  dayKeys: [],
  timeRangeStart: '',
  timeRangeEnd: ''
};

const MINUTES_IN_DAY = 24 * 60;

const timeToMinutes = (value: string): number | null => {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
};

const buildRangeIntervals = (start: string, end: string): Array<[number, number]> => {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null && endMin === null) return [];
  if (startMin !== null && endMin !== null) {
    if (startMin === endMin) return [[0, MINUTES_IN_DAY]];
    if (startMin < endMin) return [[startMin, endMin]];
    return [[startMin, MINUTES_IN_DAY], [0, endMin]];
  }
  if (startMin !== null) return [[startMin, MINUTES_IN_DAY]];
  return [[0, endMin ?? MINUTES_IN_DAY]];
};

const intersects = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function App() {
  const [view, setView] = useState<'week' | 'schedules' | 'personal'>('week');
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [state, setState] = useState(() => loadAll(todayWeekStart));
  const [appliedState, setAppliedState] = useState<AppliedViewState>(() => loadViewStatePreference());
  const focusBlock = null;
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredPersonIds = useMemo(() => new Set(state.people.filter((person) => {
    const roleOk = appliedState.roleIds.length === 0 || appliedState.roleIds.includes(person.roleId);
    const selectedPersonOk = !appliedState.selectedPersonId || person.id === appliedState.selectedPersonId;
    const searchOk = !appliedState.searchText.trim() || person.nombre.toLowerCase().includes(appliedState.searchText.trim().toLowerCase());
    return roleOk && selectedPersonOk && searchOk;
  }).map((person) => person.id)), [state.people, appliedState]);

  const rangeIntervals = useMemo(
    () => buildRangeIntervals(appliedState.timeRangeStart, appliedState.timeRangeEnd),
    [appliedState.timeRangeStart, appliedState.timeRangeEnd]
  );
  const selectedDays = useMemo(() => new Set(appliedState.dayKeys), [appliedState.dayKeys]);

  const weekScheduleBlocks = useMemo(() => buildWeekScheduleBlocks(
    weekStart,
    state.people,
    state.functions,
    state.templates,
    state.personWeekPlans,
    state.personFunctionWeeks,
    state.overrides,
    appliedState.shiftLabelMode
  ).filter((block) => {
    if (!filteredPersonIds.has(block.personId)) return false;
    if (appliedState.functionIds.length > 0 && !appliedState.functionIds.includes(block.functionId)) return false;

    const segments = splitShiftByDay(block);

    if (selectedDays.size > 0) {
      const dayMatched = segments.some((segment) => {
        const weekday = new Date(`${segment.dayKey}T00:00:00`).getDay();
        const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday] as AppliedViewState['dayKeys'][number];
        return selectedDays.has(dayKey);
      });
      if (!dayMatched) return false;
    }

    if (rangeIntervals.length > 0) {
      const timeMatched = segments.some((segment) => {
        const start = new Date(segment.segStartISO);
        const end = new Date(segment.segEndISO);
        const segStart = (start.getHours() * 60) + start.getMinutes();
        const segEndRaw = (end.getHours() * 60) + end.getMinutes();
        const segEnd = segEndRaw === 0 && end.getTime() > start.getTime() ? MINUTES_IN_DAY : segEndRaw;
        return rangeIntervals.some(([rangeStart, rangeEnd]) => intersects(segStart, segEnd, rangeStart, rangeEnd));
      });
      if (!timeMatched) return false;
    }

    return true;
  }), [weekStart, state, appliedState.shiftLabelMode, appliedState.functionIds, filteredPersonIds, selectedDays, rangeIntervals]);

  const coverage = useMemo(() => calculateCoverage(weekStart, weekScheduleBlocks, state.roles, appliedState.timeScale, (block) => block.roleId), [weekStart, weekScheduleBlocks, state.roles, appliedState.timeScale]);
  const hasActiveFilters = appliedState.searchText.trim().length > 0
    || !!appliedState.selectedPersonId
    || appliedState.roleIds.length > 0
    || appliedState.functionIds.length > 0
    || appliedState.dayKeys.length > 0
    || !!appliedState.timeRangeStart
    || !!appliedState.timeRangeEnd;

  return (
    <div className="app-shell">
      <HeaderBar
        weekLabel={formatWeekRange(weekStart)}
        isCurrentWeek={weekStart.getTime() === todayWeekStart.getTime()}
        onPrevWeek={() => setWeekStart(addDays(weekStart, -7))}
        onCurrentWeek={() => setWeekStart(todayWeekStart)}
        onNextWeek={() => setWeekStart(addDays(weekStart, 7))}
        onOpenFilters={() => setFiltersOpen(true)}
        hasActiveFilters={hasActiveFilters}
        view={view}
        onChangeView={setView}
      />

      {view === 'week' ? (
        <main className="dashboard-layout"><section className="main-column"><CoverageCard roles={state.roles} functions={state.functions} scheduleBlocks={weekScheduleBlocks} weekStart={weekStart} scale={appliedState.timeScale} activePeople={new Set(weekScheduleBlocks.map((b) => b.personId)).size} /><WeekGrid weekStart={weekStart} blocks={weekScheduleBlocks} roles={state.roles} scale={appliedState.timeScale} coverageTotals={Object.fromEntries(coverage.map((day) => [day.dayKey, day.blocks.map((block) => block.total)]))} focusBlock={focusBlock} shiftLabelMode={appliedState.shiftLabelMode} /></section></main>
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
        onImportWeekConfirm={(next) => {
          const merged = saveAll({ ...state, ...next });
          setState(merged);
        }}
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
          const role = { id: crypto.randomUUID(), nombre: name, color: normalizeRoleColor(color) };
          const next = saveAll({ ...state, roles: [...state.roles, role] });
          setState(next);
          return role.id;
        }}
        onRenameRole={(roleId, name, color) => setState(saveAll({ ...state, roles: state.roles.map((role) => role.id === roleId ? { ...role, nombre: name, color: normalizeRoleColor(color) } : role) }))}
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
        <a className="app-footer-pill" href="https://github.com/cabp393/chrono-ops/" target="_blank" rel="noreferrer">
          <Github size={14} />
          ShiftBoard
        </a>
      </footer>
    </div>
  );
}

export default App;
