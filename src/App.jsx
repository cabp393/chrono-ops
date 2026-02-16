import { useEffect, useMemo, useState } from 'react';
import CalendarGrid4Weeks from './components/CalendarGrid4Weeks.jsx';
import DayEditorPanel from './components/DayEditorPanel.jsx';
import PlanSettings from './components/PlanSettings.jsx';
import TimelineView from './components/TimelineView.jsx';
import { cloneDay, normalizeImportedPlan, syncPlanDates, targetHoursForMode, weeklyTotals } from './engine.js';
import { exportPlan, importPlan, loadPlan, savePlan } from './storage.js';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [plan, setPlan] = useState(() => loadPlan());
  const [selectedDay, setSelectedDay] = useState(0);
  const [mode, setMode] = useState('text');
  const [range, setRange] = useState('all');
  const [clipboard, setClipboard] = useState({ day: null, week: null });

  const normalizedPlan = useMemo(() => syncPlanDates(plan), [plan]);
  const totals = useMemo(() => weeklyTotals(normalizedPlan), [normalizedPlan]);

  useEffect(() => {
    savePlan(normalizedPlan);
  }, [normalizedPlan]);

  const updatePlan = (next) => {
    setPlan(syncPlanDates(next));
  };

  const updateDay = (dayIndex, day) => {
    const days = normalizedPlan.days.map((item, idx) => (idx === dayIndex ? cloneDay(day) : item));
    updatePlan({ ...normalizedPlan, days });
  };

  const actions = {
    copyDay(dayIndex) {
      setClipboard((prev) => ({ ...prev, day: cloneDay(normalizedPlan.days[dayIndex]) }));
    },
    pasteDay(dayIndex) {
      if (!clipboard.day) return;
      updateDay(dayIndex, { ...cloneDay(clipboard.day), dateISO: normalizedPlan.days[dayIndex].dateISO });
    },
    copyWeek(weekIndex) {
      const start = weekIndex * 7;
      setClipboard((prev) => ({ ...prev, week: normalizedPlan.days.slice(start, start + 7).map(cloneDay) }));
    },
    pasteWeek(weekIndex) {
      if (!clipboard.week) return;
      const start = weekIndex * 7;
      const days = normalizedPlan.days.map((day, idx) => {
        if (idx < start || idx > start + 6) return day;
        const source = clipboard.week[idx - start];
        return { ...cloneDay(source), dateISO: day.dateISO };
      });
      updatePlan({ ...normalizedPlan, days });
    },
    repeatWeek1() {
      const week1 = normalizedPlan.days.slice(0, 7).map(cloneDay);
      const days = normalizedPlan.days.map((day, idx) => {
        if (idx < 7) return day;
        const source = week1[idx % 7];
        return { ...cloneDay(source), dateISO: day.dateISO };
      });
      updatePlan({ ...normalizedPlan, days });
    },
    clearWeek(weekIndex) {
      const start = weekIndex * 7;
      const days = normalizedPlan.days.map((day, idx) => {
        if (idx < start || idx > start + 6) return day;
        return { ...day, isOff: false, blocks: [] };
      });
      updatePlan({ ...normalizedPlan, days });
    },
    clearDay(dayIndex) {
      const day = normalizedPlan.days[dayIndex];
      updateDay(dayIndex, { ...day, isOff: false, blocks: [] });
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(exportPlan(normalizedPlan), null, 2)], { type: 'application/json' });
    downloadBlob(blob, `calendar-plan-${normalizedPlan.name || 'plan'}.json`);
  };

  const handleImport = async (file) => {
    const text = await file.text();
    const payload = JSON.parse(text);
    const imported = importPlan(payload);
    setPlan(normalizeImportedPlan(imported));
  };

  const target = targetHoursForMode(normalizedPlan.targetMode);
  const weeklyFlags = [totals.week1, totals.week2, totals.week3, totals.week4].map((value) => value > target);
  const monthlyFlag = normalizedPlan.targetMode === 'monthly40' ? totals.monthTotal > target : false;

  return (
    <>
      <header>
        <h1>Chrono Ops · 4-Week Calendar</h1>
        <p>Visualizador y editor rápido de turnos para una persona / perfil.</p>
      </header>

      <main className="app-layout">
        <div className="content-col">
          <PlanSettings plan={normalizedPlan} onChange={updatePlan} />

          <section className="panel">
            <div className="row wrap">
              <strong>Range</strong>
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="all">4 weeks</option>
                <option value="week1">Week 1</option>
                <option value="week2">Week 2</option>
                <option value="week3">Week 3</option>
                <option value="week4">Week 4</option>
                <option value="day">Day detail</option>
              </select>
              <strong>Mode</strong>
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="text">Texto</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
          </section>

          <CalendarGrid4Weeks
            plan={normalizedPlan}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            actions={actions}
            clipboard={clipboard}
          />

          {mode === 'timeline' && <TimelineView plan={normalizedPlan} range={range} selectedDay={selectedDay} />}

          <section className="panel">
            <div className="panel-title"><h2>Totals & Validation</h2></div>
            <div className="totals-grid">
              <div className={weeklyFlags[0] ? 'warn' : 'ok'}>Week 1: {totals.week1.toFixed(2)}h</div>
              <div className={weeklyFlags[1] ? 'warn' : 'ok'}>Week 2: {totals.week2.toFixed(2)}h</div>
              <div className={weeklyFlags[2] ? 'warn' : 'ok'}>Week 3: {totals.week3.toFixed(2)}h</div>
              <div className={weeklyFlags[3] ? 'warn' : 'ok'}>Week 4: {totals.week4.toFixed(2)}h</div>
              <div className={monthlyFlag ? 'warn' : 'ok'}>Month: {totals.monthTotal.toFixed(2)}h</div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title"><h2>Export / Import</h2></div>
            <div className="row wrap">
              <button className="secondary" onClick={exportJSON}>Export JSON</button>
              <label className="file">Import JSON
                <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
              </label>
            </div>
          </section>
        </div>

        <DayEditorPanel day={normalizedPlan.days[selectedDay]} onSave={(day) => updateDay(selectedDay, day)} />
      </main>
    </>
  );
}
