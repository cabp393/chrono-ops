import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut } from './lib/icons';
import { CoverageSummary } from './components/CoverageSummary';
import { Filters } from './components/Filters';
import { ShiftModal } from './components/ShiftModal';
import { WeekGrid } from './components/WeekGrid';
import { calculateCoverage } from './lib/coverageCalc';
import { addDays, formatWeekRange, startOfWeekMonday } from './lib/dateUtils';
import { loadData, saveData } from './lib/storage';
import { TIME_SCALE_OPTIONS, clampScale, scaleLabel } from './lib/timeScale';
import type { Shift, TimeScale } from './types';

const todayWeekStart = startOfWeekMonday(new Date());

function App() {
  const [weekStart, setWeekStart] = useState(todayWeekStart);
  const [data, setData] = useState(() => loadData(todayWeekStart));
  const [scale, setScale] = useState<TimeScale>(60);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  const peopleFiltered = useMemo(() => data.people.filter((p) => p.nombre.toLowerCase().includes(personQuery.toLowerCase())), [data.people, personQuery]);
  const peopleSet = new Set(peopleFiltered.map((p) => p.id));

  const visibleShifts = useMemo(() => data.shifts.filter((s) => {
    const start = new Date(s.startISO);
    const inWeek = start >= weekStart && start < addDays(weekStart, 7);
    const roleOk = selectedRoles.length === 0 || selectedRoles.includes(s.rolId);
    const personOk = peopleSet.has(s.personId);
    return inWeek && roleOk && personOk;
  }), [data.shifts, weekStart, selectedRoles, peopleSet]);

  const coverage = useMemo(() => calculateCoverage(weekStart, visibleShifts, data.roles, scale, selectedRoles), [weekStart, visibleShifts, data.roles, scale, selectedRoles]);
  const roleTotals = useMemo(() => {
    const map: Record<string, number> = {};
    visibleShifts.forEach((s) => {
      map[s.rolId] = (map[s.rolId] || 0) + 1;
    });
    return map;
  }, [visibleShifts]);

  const weekBlocks = coverage.flatMap((d) => d.blocks);
  const coverageTotals = Object.fromEntries(coverage.map((d) => [d.dayKey, d.blocks.map((b) => b.total)]));

  const persist = (nextShifts: Shift[]) => {
    const next = { ...data, shifts: nextShifts };
    setData(next);
    saveData(next);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><Calendar size={18} /> ShiftBoard</div>
        <div className="week-nav">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} />Anterior</button>
          <button onClick={() => setWeekStart(todayWeekStart)}>Semana actual</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))}>Siguiente<ChevronRight size={16} /></button>
          <span>{formatWeekRange(weekStart)}</span>
        </div>
        <div className="actions">
          <button onClick={() => setScale(clampScale(scale - 1))}><ZoomOut size={16} /></button>
          <select value={scale} onChange={(e) => setScale(Number(e.target.value) as TimeScale)}>
            {TIME_SCALE_OPTIONS.map((option) => <option key={option} value={option}>{scaleLabel(option)}</option>)}
          </select>
          <button onClick={() => setScale(clampScale(scale + 1))}><ZoomIn size={16} /></button>
          <button className="primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} />Agregar turno</button>
        </div>
      </header>

      <main className="content-grid">
        <div>
          <CoverageSummary roles={data.roles} people={peopleFiltered} weekBlocks={weekBlocks} roleTotals={roleTotals} />
          <WeekGrid weekStart={weekStart} shifts={visibleShifts} people={data.people} roles={data.roles} scale={scale} coverageTotals={coverageTotals} onShiftClick={(shift) => { setEditing(shift); setModalOpen(true); }} onlyGaps={onlyGaps} />
        </div>
        <Filters
          roles={data.roles}
          people={peopleFiltered}
          selectedRoles={selectedRoles}
          personQuery={personQuery}
          onlyGaps={onlyGaps}
          onPersonQuery={setPersonQuery}
          onToggleGaps={setOnlyGaps}
          onToggleRole={(id) => setSelectedRoles((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])}
        />
      </main>

      <ShiftModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        people={peopleFiltered}
        roles={data.roles}
        onSave={(shift) => {
          const exists = data.shifts.some((s) => s.id === shift.id);
          persist(exists ? data.shifts.map((s) => (s.id === shift.id ? shift : s)) : [...data.shifts, shift]);
        }}
        onDuplicate={(shift, dayOffset) => {
          const start = addDays(new Date(shift.startISO), dayOffset);
          const end = addDays(new Date(shift.endISO), dayOffset);
          persist([...data.shifts, { ...shift, id: crypto.randomUUID(), startISO: start.toISOString(), endISO: end.toISOString() }]);
        }}
      />
    </div>
  );
}

export default App;
