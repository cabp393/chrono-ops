import { useMemo, useState } from 'react';
import { DAYS, SHIFT_LIBRARY, defaultScenario, generateSolution } from './engine.js';
import { loadScenario, loadSolutions, saveScenario, saveSolutions } from './storage.js';

function toMap(value) {
  if (value instanceof Map) return value;
  if (!value || typeof value !== 'object') return new Map();
  return new Map(Object.entries(value).map(([key, nested]) => [Number(key), new Map(Object.entries(nested || {}))]));
}

function hydrateSolutions(raw) {
  return (raw || []).map((solution) => ({
    ...solution,
    metrics: {
      ...solution.metrics,
      coverage: toMap(solution.metrics?.coverage),
      required: toMap(solution.metrics?.required),
      hoursByPerson: toMap(solution.metrics?.hoursByPerson),
      saturdayLoads: toMap(solution.metrics?.saturdayLoads)
    }
  }));
}

export default function App() {
  const [scenario, setScenario] = useState(() => loadScenario() || defaultScenario());
  const [solutions, setSolutions] = useState(() => hydrateSolutions(loadSolutions()));
  const [modelId, setModelId] = useState('5x8');
  const [count, setCount] = useState(3);

  const best = useMemo(() => solutions[0] || null, [solutions]);

  const saveScenarioState = () => saveScenario(scenario);

  const handleGenerate = () => {
    const generated = Array.from({ length: count }, (_, i) =>
      generateSolution(scenario, { modelId: i % 2 === 0 ? modelId : '5plus1half' })
    );
    const sorted = generated.sort((a, b) => b.score - a.score);
    setSolutions(sorted);
    saveSolutions(sorted);
  };

  const handleReset = () => {
    setSolutions([]);
    saveSolutions([]);
  };

  return (
    <>
      <header>
        <h1>Chrono Ops Planner</h1>
        <p>
          Planificador de turnos con escenarios en <strong>LocalStorage</strong>.
        </p>
      </header>

      <main id="app">
        <section className="panel">
          <h2>A) Scenario Builder</h2>
          <div className="panel-body">
            <label>
              Nombre escenario
              <input
                value={scenario.name}
                onChange={(event) => setScenario({ ...scenario, name: event.target.value })}
              />
            </label>
            <div className="grid-2">
              <label>
                Objetivo
                <select
                  value={scenario.targetMode}
                  onChange={(event) => setScenario({ ...scenario, targetMode: event.target.value })}
                >
                  <option value="weekly40">40h semanal</option>
                  <option value="weekly42">42h semanal</option>
                  <option value="monthly40">40h promedio mensual</option>
                </select>
              </label>
              <label>
                Colación (min)
                <input
                  type="number"
                  min="0"
                  value={scenario.breakMinutes}
                  onChange={(event) => setScenario({ ...scenario, breakMinutes: Number(event.target.value) })}
                />
              </label>
            </div>
            <label className="row">
              <input
                type="checkbox"
                checked={scenario.operationContinuous}
                onChange={(event) =>
                  setScenario({ ...scenario, operationContinuous: event.target.checked })
                }
              />
              Operación continua
            </label>
            <small className="muted">Persistencia 100% LocalStorage (sin backend).</small>
            <button onClick={saveScenarioState}>Guardar escenario</button>
          </div>
        </section>

        <section className="panel">
          <h2>B) Workforce & Areas</h2>
          <div className="panel-body">
            <div className="row">
              <span className="badge">Personas: {scenario.people.length}</span>
              <span className="badge">Áreas: {scenario.areas.length}</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Criticidad</th>
                  <th>MIN M/T/N</th>
                </tr>
              </thead>
              <tbody>
                {scenario.areas.map((area) => (
                  <tr key={area.id}>
                    <td>{area.name}</td>
                    <td>{area.criticality}</td>
                    <td>
                      {area.minByShift.M}/{area.minByShift.T}/{area.minByShift.N}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <small className="muted">Skills matrix inferida desde <code>people.skills</code>.</small>
          </div>
        </section>

        <section className="panel">
          <h2>C) Shift Models Library</h2>
          <div className="panel-body">
            <div className="grid-2">
              <div>
                <strong>5×8</strong>
                <p className="muted">Patrón W W W W W L L</p>
              </div>
              <div>
                <strong>4×10</strong>
                <p className="muted">Patrón W W W W L L L</p>
              </div>
              <div>
                <strong>12h 2-2-3</strong>
                <p className="muted">Patrón W W L L W W W</p>
              </div>
              <div>
                <strong>5+1 medio</strong>
                <p className="muted">W W W W W C L</p>
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(SHIFT_LIBRARY).map((shift) => (
                  <tr key={shift.id}>
                    <td>{shift.name}</td>
                    <td>{shift.start}</td>
                    <td>{shift.end}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>D) Generator / Optimizer</h2>
          <div className="panel-body">
            <div className="grid-2">
              <label>
                Modelo base
                <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                  <option value="5x8">5x8</option>
                  <option value="4x10">4x10</option>
                  <option value="223-12h">223-12h</option>
                  <option value="5plus1half">5+1 medio</option>
                </select>
              </label>
              <label>
                N° soluciones
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                />
              </label>
            </div>
            <button onClick={handleGenerate}>Generar</button>
            <small className="muted">Motor determinista en módulo puro (sin UI state acoplado).</small>
          </div>
        </section>

        <section className="panel">
          <h2>E) Visualizer</h2>
          <div className="panel-body">
            {!best ? (
              <p className="muted">Genera una propuesta para visualizar cobertura, reglas y equidad.</p>
            ) : (
              <>
                <div className="row">
                  <span className="badge">Score: {best.score.toFixed(1)}</span>
                  <span className="badge">Gaps: {best.metrics.gaps.length}</span>
                  <span className="badge">Fairness σ: {best.metrics.fairnessStdDev.toFixed(2)}</span>
                </div>
                <div className="heatmap">
                  <Heatmap solution={best} />
                </div>
                <strong>Violations</strong>
                <ul>
                  {best.metrics.gaps.length ? (
                    best.metrics.gaps.slice(0, 8).map((violation, idx) => (
                      <li key={`${violation.bucket}-${violation.areaId}-${idx}`} className="err">
                        Bucket {violation.bucket}, área {violation.areaId}, faltan {violation.missing}
                      </li>
                    ))
                  ) : (
                    <li className="ok">Sin violaciones</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>F) Compare</h2>
          <div className="panel-body">
            {!solutions.length ? (
              <p className="muted">Aún no hay escenarios para comparar.</p>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Solución</th>
                      <th>Modelo</th>
                      <th>Score</th>
                      <th>Incumplimientos</th>
                      <th>Equidad σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solutions.slice(0, 5).map((solution, index) => (
                      <tr key={solution.id}>
                        <td>#{index + 1}</td>
                        <td>{solution.modelId}</td>
                        <td>{solution.score.toFixed(1)}</td>
                        <td>{solution.metrics.gaps.length}</td>
                        <td>{solution.metrics.fairnessStdDev.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="secondary" onClick={handleReset}>
                  Limpiar soluciones
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function Heatmap({ solution }) {
  const cells = [];

  cells.push(
    <div key="header-title" style={{ fontWeight: 600 }}>
      Día/Hora
    </div>
  );

  for (let hour = 0; hour < 24; hour += 1) {
    cells.push(
      <div key={`header-${hour}`} style={{ fontWeight: 600 }}>
        {hour}
      </div>
    );
  }

  for (let day = 0; day < 7; day += 1) {
    cells.push(
      <div key={`day-${day}`} style={{ fontWeight: 600 }}>
        {DAYS[day]}
      </div>
    );

    for (let hour = 0; hour < 24; hour += 1) {
      const idx = day * 24 + hour;
      const cov = solution.metrics.coverage.get(idx) || new Map();
      const req = solution.metrics.required.get(idx) || new Map();
      const totalCov = [...cov.values()].reduce((acc, value) => acc + Number(value), 0);
      const totalReq = [...req.values()].reduce((acc, value) => acc + Number(value), 0);
      const ratio = totalReq ? totalCov / totalReq : 1;
      const background = ratio < 0.7 ? '#fee2e2' : ratio < 1 ? '#fef3c7' : '#dcfce7';

      cells.push(
        <div key={`cell-${day}-${hour}`} style={{ background }}>
          {totalCov}
        </div>
      );
    }
  }

  return cells;
}
