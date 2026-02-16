export default function PlanSettings({ plan, onChange }) {
  return (
    <section className="panel">
      <div className="panel-title"><h2>Plan Settings</h2></div>
      <div className="form-grid">
        <label>Nombre
          <input value={plan.name} onChange={(e) => onChange({ ...plan, name: e.target.value })} />
        </label>
        <label>Start date
          <input type="date" value={plan.startDateISO} onChange={(e) => onChange({ ...plan, startDateISO: e.target.value })} />
        </label>
        <label>Target mode
          <select value={plan.targetMode} onChange={(e) => onChange({ ...plan, targetMode: e.target.value })}>
            <option value="weekly40">weekly40</option>
            <option value="weekly42">weekly42</option>
            <option value="monthly40">monthly40</option>
          </select>
        </label>
        <label>Default break (min)
          <input type="number" min="0" value={plan.defaultBreakMinutes} onChange={(e) => onChange({ ...plan, defaultBreakMinutes: Number(e.target.value) || 0 })} />
        </label>
        <label>Resolution
          <select value={plan.resolutionMinutes} onChange={(e) => onChange({ ...plan, resolutionMinutes: Number(e.target.value) })}>
            <option value="60">60</option>
            <option value="30">30</option>
            <option value="15">15</option>
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={plan.showLabels} onChange={(e) => onChange({ ...plan, showLabels: e.target.checked })} />
          Show labels
        </label>
      </div>
    </section>
  );
}
