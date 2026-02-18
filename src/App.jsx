import { useMemo, useState } from 'react';
import {
  DAYS,
  computeMetricsFromSchedule,
  defaultScenario,
  defaultSchedule,
  parseTime,
  targetHoursForMode
} from './engine.js';
import { createStorageAdapter } from './storage.js';
import { useSileoToast } from './lib/sileoToast.jsx';

const storage = createStorageAdapter();
const TARGET_TOLERANCE = 0.25;

export default function App() {
  const toast = useSileoToast();
  const [scenario, setScenario] = useState(() => {
    const storedScenario = storage.getScenario();
    return storedScenario || defaultScenario();
  });
  const [schedule, setSchedule] = useState(() => {
    const storedScenario = storage.getScenario() || defaultScenario();
    return storage.getSchedule() || defaultSchedule(storedScenario);
  });
  const [snapshots, setSnapshots] = useState(() => storage.getSnapshots());
  const [activeTab, setActiveTab] = useState('config');
  const [selectedDay, setSelectedDay] = useState(0);
  const [bulk, setBulk] = useState({ team: 'ALL', shiftId: '', areaId: '', startDay: 0, endDay: 4 });

  const [areaFilter, setAreaFilter] = useState('ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [bucketMinutes, setBucketMinutes] = useState(scenario.bucketMinutes || 60);
  const [selectedGapBucket, setSelectedGapBucket] = useState(null);
  const [compareSelection, setCompareSelection] = useState({ left: '', right: '' });

  const filteredSchedule = useMemo(() => {
    if (shiftFilter === 'ALL') return schedule;
    return {
      assignments: schedule.assignments.filter((assignment) => assignment.shiftId === shiftFilter)
    };
  }, [schedule, shiftFilter]);

  const metrics = useMemo(
    () => computeMetricsFromSchedule(scenario, filteredSchedule, bucketMinutes),
    [scenario, filteredSchedule, bucketMinutes]
  );

  const weeklyOperationHours = useMemo(
    () => scenario.operationWindow.reduce((acc, day) => {
      if (day.closed) return acc;
      const minutes = Math.max(0, parseTime(day.end) - parseTime(day.start));
      return acc + minutes / 60;
    }, 0),
    [scenario.operationWindow]
  );

  const persistScenario = (next) => {
    setScenario(next);
    storage.setScenario(next);
  };

  const persistSchedule = (next) => {
    setSchedule(next);
    storage.setSchedule(next);
  };

  const saveSnapshot = () => {
    const item = {
      id: crypto.randomUUID(),
      name: `Snapshot ${new Date().toLocaleString()}`,
      createdAt: new Date().toISOString(),
      schedule: structuredClone(schedule)
    };
    const next = [item, ...snapshots].slice(0, 20);
    setSnapshots(next);
    storage.setSnapshots(next);
    toast.success('Snapshot guardado');
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(storage.exportAll(), null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${slug(scenario.name)}.json`);
    toast.info('Export JSON generado');
  };

  const exportCSV = () => {
    const lines = ['personId,dayIndex,shiftId,areaId'];
    for (const a of schedule.assignments) {
      lines.push([a.personId, a.dayIndex, a.shiftId, a.areaId].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, `${slug(scenario.name)}.csv`);
    toast.info('Export CSV generado');
  };

  const handleJSONImport = async (file) => {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      storage.importAll(payload);
      const nextScenario = storage.getScenario() || defaultScenario();
      const nextSchedule = storage.getSchedule() || { assignments: [] };
      const nextSnapshots = storage.getSnapshots();
      setScenario(nextScenario);
      setSchedule(nextSchedule);
      setSnapshots(nextSnapshots);
      toast.success('Import JSON completado');
    } catch {
      toast.error('No se pudo importar el JSON');
    }
  };

  const handleCSVImport = async (file) => {
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      const assignments = rows.slice(1).map((line) => {
        const [personId, dayIndex, shiftId, areaId] = line.split(',');
        return { personId, dayIndex: Number(dayIndex), shiftId, areaId };
      });
      persistSchedule({ assignments });
      toast.success('Import CSV completado');
    } catch {
      toast.error('No se pudo importar el CSV');
    }
  };

  return (
    <>
      <header>
        <h1>Chrono Ops · Visualizador de turnos</h1>
        <p>Configura escenario y calendario manual. Sin optimizador automático.</p>
      </header>

      <main>
        <nav className="tabs">
          {[
            ['config', 'Config'],
            ['schedule', 'Schedule'],
            ['visualize', 'Visualize'],
            ['compare', 'Compare']
          ].map(([key, label]) => (
            <button key={key} className={activeTab === key ? 'tab active' : 'tab'} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </nav>

        {activeTab === 'config' && (
          <section className="panel-stack">
            <ConfigPanel scenario={scenario} persistScenario={persistScenario} weeklyOperationHours={weeklyOperationHours} />
          </section>
        )}

        {activeTab === 'schedule' && (
          <section className="panel-stack">
            <SchedulePanel
              scenario={scenario}
              schedule={schedule}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
              bulk={bulk}
              setBulk={setBulk}
              persistSchedule={persistSchedule}
              exportJSON={exportJSON}
              exportCSV={exportCSV}
              handleJSONImport={handleJSONImport}
              handleCSVImport={handleCSVImport}
            />
          </section>
        )}

        {activeTab === 'visualize' && (
          <section className="panel-stack">
            <VisualizePanel
              scenario={scenario}
              schedule={schedule}
              metrics={metrics}
              areaFilter={areaFilter}
              setAreaFilter={setAreaFilter}
              shiftFilter={shiftFilter}
              setShiftFilter={setShiftFilter}
              bucketMinutes={bucketMinutes}
              setBucketMinutes={setBucketMinutes}
              selectedGapBucket={selectedGapBucket}
              setSelectedGapBucket={setSelectedGapBucket}
            />
          </section>
        )}

        {activeTab === 'compare' && (
          <section className="panel-stack">
            <ComparePanel
              scenario={scenario}
              snapshots={snapshots}
              saveSnapshot={saveSnapshot}
              compareSelection={compareSelection}
              setCompareSelection={setCompareSelection}
            />
          </section>
        )}
      </main>
    </>
  );
}

function ConfigPanel({ scenario, persistScenario, weeklyOperationHours }) {
  const setOperationDay = (dayIndex, patch) => {
    const operationWindow = scenario.operationWindow.map((day) => (
      day.dayIndex === dayIndex ? { ...day, ...patch } : day
    ));
    persistScenario({ ...scenario, operationWindow });
  };

  const addShift = () => {
    const shift = { id: `S${scenario.shifts.length + 1}`, name: 'Nuevo', start: '09:00', end: '17:00', spansMidnight: false };
    persistScenario({ ...scenario, shifts: [...scenario.shifts, shift] });
  };

  const updateShift = (index, patch) => {
    const shifts = scenario.shifts.map((shift, i) => {
      if (i !== index) return shift;
      const next = { ...shift, ...patch };
      next.spansMidnight = parseTime(next.end) < parseTime(next.start);
      return next;
    });
    persistScenario({ ...scenario, shifts });
  };

  const removeShift = (index) => {
    const shifts = scenario.shifts.filter((_, i) => i !== index);
    persistScenario({ ...scenario, shifts });
  };

  const updateArea = (index, patch) => {
    persistScenario({ ...scenario, areas: scenario.areas.map((area, i) => (i === index ? { ...area, ...patch } : area)) });
  };

  const updateAreaMin = (areaIndex, shiftId, value) => {
    const area = scenario.areas[areaIndex];
    const minByShiftId = { ...area.minByShiftId, [shiftId]: Math.max(0, Number(value || 0)) };
    updateArea(areaIndex, { minByShiftId });
  };

  const updatePerson = (index, patch) => {
    persistScenario({ ...scenario, people: scenario.people.map((person, i) => (i === index ? { ...person, ...patch } : person)) });
  };

  const addPeople = (count) => {
    const start = scenario.people.length;
    const generated = Array.from({ length: count }, (_, i) => ({
      id: `P${String(start + i + 1).padStart(2, '0')}`,
      name: `Demo ${start + i + 1}`,
      team: i % 2 === 0 ? 'A' : 'B',
      skills: scenario.areas.slice(0, 2).map((area) => area.id)
    }));
    persistScenario({ ...scenario, people: [...scenario.people, ...generated] });
  };

  return (
    <>
      <div className="panel">
        <div className="panel-title"><h2>Operation Window</h2><span className="badge">{weeklyOperationHours.toFixed(1)} hrs/semana</span></div>
        <table className="table dense">
          <thead><tr><th>Día</th><th>Start</th><th>End</th><th>Closed</th></tr></thead>
          <tbody>
            {scenario.operationWindow.map((day) => {
              const invalid = !day.closed && parseTime(day.end) <= parseTime(day.start);
              return (
                <tr key={day.dayIndex}>
                  <td>{DAYS[day.dayIndex]}</td>
                  <td><input type="time" value={day.start} onChange={(e) => setOperationDay(day.dayIndex, { start: e.target.value })} /></td>
                  <td><input type="time" value={day.end} onChange={(e) => setOperationDay(day.dayIndex, { end: e.target.value })} /></td>
                  <td>
                    <label className="row"><input type="checkbox" checked={day.closed} onChange={(e) => setOperationDay(day.dayIndex, { closed: e.target.checked })} />{invalid ? <span className="err">end ≤ start</span> : ' '}</label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-title"><h2>Shifts</h2><button onClick={addShift}>Add shift</button></div>
        <table className="table dense">
          <thead><tr><th>ID</th><th>Nombre</th><th>Start</th><th>End</th><th>Break</th><th>Spans</th><th /></tr></thead>
          <tbody>
            {scenario.shifts.map((shift, index) => (
              <tr key={`${shift.id}-${index}`}>
                <td><input value={shift.id} onChange={(e) => updateShift(index, { id: e.target.value })} /></td>
                <td><input value={shift.name} onChange={(e) => updateShift(index, { name: e.target.value })} /></td>
                <td><input type="time" value={shift.start} onChange={(e) => updateShift(index, { start: e.target.value })} /></td>
                <td><input type="time" value={shift.end} onChange={(e) => updateShift(index, { end: e.target.value })} /></td>
                <td><input type="number" min="0" value={shift.breakMinutes ?? ''} onChange={(e) => updateShift(index, { breakMinutes: e.target.value ? Number(e.target.value) : undefined })} /></td>
                <td>{shift.spansMidnight ? 'Sí' : 'No'}</td>
                <td><button className="danger" onClick={() => removeShift(index)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Areas</h2>
        <table className="table dense">
          <thead>
            <tr>
              <th>Área</th><th>Criticidad</th>
              {scenario.shifts.map((shift) => <th key={shift.id}>Min {shift.id}</th>)}
            </tr>
          </thead>
          <tbody>
            {scenario.areas.map((area, areaIndex) => (
              <tr key={area.id}>
                <td><input value={area.name} onChange={(e) => updateArea(areaIndex, { name: e.target.value })} /></td>
                <td><input value={area.criticality} onChange={(e) => updateArea(areaIndex, { criticality: e.target.value })} /></td>
                {scenario.shifts.map((shift) => (
                  <td key={`${area.id}-${shift.id}`}>
                    <input type="number" min="0" value={area.minByShiftId[shift.id] ?? 0} onChange={(e) => updateAreaMin(areaIndex, shift.id, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-title"><h2>People</h2><button onClick={() => addPeople(5)}>Generate 5 people</button></div>
        <table className="table dense">
          <thead><tr><th>Nombre</th><th>Team</th><th>Skills</th></tr></thead>
          <tbody>
            {scenario.people.map((person, index) => (
              <tr key={person.id}>
                <td><input value={person.name} onChange={(e) => updatePerson(index, { name: e.target.value })} /></td>
                <td><input value={person.team || ''} onChange={(e) => updatePerson(index, { team: e.target.value })} /></td>
                <td>
                  <select
                    multiple
                    value={person.skills}
                    onChange={(e) => {
                      const skills = Array.from(e.target.selectedOptions).map((option) => option.value);
                      updatePerson(index, { skills });
                    }}
                  >
                    {scenario.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SchedulePanel({
  scenario,
  schedule,
  selectedDay,
  setSelectedDay,
  bulk,
  setBulk,
  persistSchedule,
  exportJSON,
  exportCSV,
  handleJSONImport,
  handleCSVImport
}) {
  const peopleById = new Map(scenario.people.map((person) => [person.id, person]));

  const byPersonDay = new Map();
  for (const assignment of schedule.assignments) {
    byPersonDay.set(`${assignment.personId}-${assignment.dayIndex}`, assignment);
  }

  const setAssignment = (personId, dayIndex, patch) => {
    const key = `${personId}-${dayIndex}`;
    const next = [...schedule.assignments];
    const index = next.findIndex((assignment) => `${assignment.personId}-${assignment.dayIndex}` === key);
    const base = index >= 0 ? next[index] : { personId, dayIndex, shiftId: '', areaId: '' };
    const merged = { ...base, ...patch };
    if (!merged.shiftId) {
      if (index >= 0) next.splice(index, 1);
    } else if (index >= 0) {
      next[index] = merged;
    } else {
      next.push(merged);
    }
    persistSchedule({ assignments: next });
  };

  const applyBulk = () => {
    const teams = scenario.people.filter((person) => bulk.team === 'ALL' || person.team === bulk.team);
    let next = [...schedule.assignments];
    for (const person of teams) {
      for (let day = Number(bulk.startDay); day <= Number(bulk.endDay); day += 1) {
        const idx = next.findIndex((a) => a.personId === person.id && a.dayIndex === day);
        const candidate = { personId: person.id, dayIndex: day, shiftId: bulk.shiftId, areaId: bulk.areaId || person.skills[0] || '' };
        if (idx >= 0) next[idx] = candidate;
        else next.push(candidate);
      }
    }
    persistSchedule({ assignments: next });
  };

  const teams = ['ALL', ...new Set(scenario.people.map((person) => person.team).filter(Boolean))];

  return (
    <>
      <div className="panel">
        <div className="panel-title"><h2>Grid por día</h2><div className="row">{DAYS.map((day, idx) => <button key={day} className={selectedDay === idx ? 'chip active' : 'chip'} onClick={() => setSelectedDay(idx)}>{day}</button>)}</div></div>
        <table className="table dense">
          <thead><tr><th>Persona</th><th>Shift</th><th>Area</th><th>Validación</th></tr></thead>
          <tbody>
            {scenario.people.map((person) => {
              const current = byPersonDay.get(`${person.id}-${selectedDay}`) || { shiftId: '', areaId: '' };
              const skillOk = !current.areaId || person.skills.includes(current.areaId);
              const closed = scenario.operationWindow[selectedDay]?.closed;
              return (
                <tr key={`${person.id}-${selectedDay}`}>
                  <td>{person.name}</td>
                  <td>
                    <select value={current.shiftId} onChange={(e) => setAssignment(person.id, selectedDay, { shiftId: e.target.value })}>
                      <option value="">--</option>
                      {scenario.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.id}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={current.areaId} onChange={(e) => setAssignment(person.id, selectedDay, { areaId: e.target.value })}>
                      <option value="">--</option>
                      {scenario.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                    </select>
                  </td>
                  <td>
                    {!skillOk && <span className="warn">skill mismatch</span>}
                    {closed && current.shiftId && <span className="warn"> · día cerrado</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Bulk edit</h2>
        <div className="grid-5">
          <select value={bulk.team} onChange={(e) => setBulk({ ...bulk, team: e.target.value })}>{teams.map((team) => <option key={team}>{team}</option>)}</select>
          <select value={bulk.shiftId} onChange={(e) => setBulk({ ...bulk, shiftId: e.target.value })}><option value="">Shift</option>{scenario.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.id}</option>)}</select>
          <select value={bulk.areaId} onChange={(e) => setBulk({ ...bulk, areaId: e.target.value })}><option value="">Area</option>{scenario.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
          <select value={bulk.startDay} onChange={(e) => setBulk({ ...bulk, startDay: Number(e.target.value) })}>{DAYS.map((day, idx) => <option key={day} value={idx}>Desde {day}</option>)}</select>
          <select value={bulk.endDay} onChange={(e) => setBulk({ ...bulk, endDay: Number(e.target.value) })}>{DAYS.map((day, idx) => <option key={day} value={idx}>Hasta {day}</option>)}</select>
        </div>
        <button onClick={applyBulk} disabled={!bulk.shiftId}>Aplicar</button>
      </div>

      <div className="panel">
        <h2>Import / Export</h2>
        <div className="row wrap">
          <button onClick={exportJSON}>Export JSON</button>
          <button onClick={exportCSV}>Export CSV</button>
          <label className="file">Import JSON<input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && handleJSONImport(e.target.files[0])} /></label>
          <label className="file">Import CSV<input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleCSVImport(e.target.files[0])} /></label>
        </div>
      </div>
    </>
  );
}

function VisualizePanel({
  scenario,
  schedule,
  metrics,
  areaFilter,
  setAreaFilter,
  shiftFilter,
  setShiftFilter,
  bucketMinutes,
  setBucketMinutes,
  selectedGapBucket,
  setSelectedGapBucket
}) {
  return (
    <>
      <div className="panel">
        <div className="panel-title">
          <h2>Coverage Heatmap</h2>
          <div className="row">
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
              <option value="ALL">All areas</option>
              {scenario.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
            <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
              <option value="ALL">All shifts</option>
              {scenario.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
            </select>
            <select value={bucketMinutes} onChange={(e) => setBucketMinutes(Number(e.target.value))}>
              {[15, 30, 60].map((bucket) => <option key={bucket} value={bucket}>{bucket} min</option>)}
            </select>
          </div>
        </div>
        <Heatmap scenario={scenario} metrics={metrics} areaFilter={areaFilter} selectedGapBucket={selectedGapBucket} />
      </div>

      <div className="panel">
        <h2>Gaps / Violations</h2>
        <ul className="list">
          {metrics.gaps.slice(0, 120).map((gap, idx) => (
            <li key={`${gap.bucket}-${gap.areaId}-${idx}`}>
              <button className="link" onClick={() => setSelectedGapBucket(gap.bucket)}>
                {DAYS[gap.dayIndex]} {String(Math.floor(gap.minuteOfDay / 60)).padStart(2, '0')}:00 · {gap.areaId} · req {gap.required} / cov {gap.covered} · missing {gap.missing}
              </button>
            </li>
          ))}
          {!metrics.gaps.length && <li className="ok">Sin gaps.</li>}
        </ul>
      </div>

      <div className="panel">
        <h2>Hours per person</h2>
        <HoursTable scenario={scenario} schedule={schedule} metrics={metrics} />
      </div>
    </>
  );
}

function Heatmap({ scenario, metrics, areaFilter, selectedGapBucket }) {
  const cols = (24 * 60) / metrics.bucketMinutes;
  const rows = [];

  for (let day = 0; day < 7; day += 1) {
    for (let bucket = 0; bucket < cols; bucket += 1) {
      const idx = day * cols + bucket;
      const reqMap = metrics.required.get(idx) || new Map();
      const covMap = metrics.coverage.get(idx) || new Map();

      const required = areaFilter === 'ALL'
        ? [...reqMap.values()].reduce((acc, value) => acc + Number(value), 0)
        : Number(reqMap.get(areaFilter) || 0);
      const covered = areaFilter === 'ALL'
        ? [...covMap.values()].reduce((acc, value) => acc + Number(value), 0)
        : Number(covMap.get(areaFilter) || 0);

      const ratio = required ? covered / required : 1;
      const op = metrics.operationBuckets[idx];
      let className = 'cell';
      if (!op) className += ' disabled';
      else if (ratio < 0.7) className += ' low';
      else if (ratio < 1) className += ' mid';
      else className += ' high';
      if (selectedGapBucket === idx) className += ' selected';

      rows.push(<div key={`c-${idx}`} className={className} title={`cov ${covered} / req ${required}`}>{covered}</div>);
    }
  }

  return (
    <div className="heat-wrap">
      <div className="heat-labels">{DAYS.map((day) => <div key={day}>{day}</div>)}</div>
      <div className="heatmap" style={{ gridTemplateColumns: `repeat(${cols}, minmax(10px, 1fr))` }}>{rows}</div>
    </div>
  );
}

function HoursTable({ scenario, metrics }) {
  const target = targetHoursForMode(scenario.targetMode);

  return (
    <table className="table dense">
      <thead><tr><th>Persona</th><th>Horas semana</th><th>Horas sábado</th><th>#Noches</th><th>Warnings</th><th>Target</th></tr></thead>
      <tbody>
        {metrics.hoursSummary.map((row) => {
          const saturdayHours = row.saturdayShifts * 8;
          const delta = scenario.targetMode === 'monthly40' ? row.paidHours * 4 - target : row.paidHours - target;
          const targetText = `${scenario.targetMode === 'monthly40' ? (row.paidHours * 4).toFixed(1) : row.paidHours.toFixed(1)}h (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`;
          return (
            <tr key={row.personId}>
              <td>{row.personId}</td>
              <td>{row.paidHours.toFixed(2)}</td>
              <td>{saturdayHours.toFixed(2)}</td>
              <td>{row.nightShifts}</td>
              <td>{row.warnings.map((warning) => warning.type).join(', ') || '-'}</td>
              <td className={Math.abs(delta) <= TARGET_TOLERANCE ? 'ok' : 'warn'}>{targetText}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ComparePanel({ scenario, snapshots, saveSnapshot, compareSelection, setCompareSelection }) {
  const options = snapshots.map((snapshot) => ({ value: snapshot.id, label: snapshot.name }));
  const left = snapshots.find((snapshot) => snapshot.id === compareSelection.left);
  const right = snapshots.find((snapshot) => snapshot.id === compareSelection.right);

  const leftMetrics = left ? computeMetricsFromSchedule(scenario, left.schedule, scenario.bucketMinutes) : null;
  const rightMetrics = right ? computeMetricsFromSchedule(scenario, right.schedule, scenario.bucketMinutes) : null;

  return (
    <>
      <div className="panel">
        <div className="panel-title"><h2>Snapshots</h2><button onClick={saveSnapshot}>Save snapshot</button></div>
        <ul className="list">
          {snapshots.map((snapshot) => <li key={snapshot.id}>{snapshot.name}</li>)}
          {!snapshots.length && <li className="muted">No snapshots aún.</li>}
        </ul>
      </div>
      <div className="panel">
        <h2>Comparar</h2>
        <div className="grid-2">
          <select value={compareSelection.left} onChange={(e) => setCompareSelection({ ...compareSelection, left: e.target.value })}><option value="">Snapshot A</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          <select value={compareSelection.right} onChange={(e) => setCompareSelection({ ...compareSelection, right: e.target.value })}><option value="">Snapshot B</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </div>
        {leftMetrics && rightMetrics && (
          <table className="table dense">
            <tbody>
              <tr><th>Gaps</th><td>{leftMetrics.gaps.length}</td><td>{rightMetrics.gaps.length}</td></tr>
              <tr><th>Fairness σ</th><td>{leftMetrics.fairnessStdDev.toFixed(2)}</td><td>{rightMetrics.fairnessStdDev.toFixed(2)}</td></tr>
              <tr><th>Horas totales</th><td>{leftMetrics.hoursSummary.reduce((acc, row) => acc + row.paidHours, 0).toFixed(1)}</td><td>{rightMetrics.hoursSummary.reduce((acc, row) => acc + row.paidHours, 0).toFixed(1)}</td></tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
