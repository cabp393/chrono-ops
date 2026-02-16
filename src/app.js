import { DAYS, SHIFT_LIBRARY, defaultScenario, generateSolution } from './engine.js';
import { loadScenario, loadSolutions, saveScenario, saveSolutions } from './storage.js';

let scenario = loadScenario() || defaultScenario();
let solutions = loadSolutions();

const app = document.querySelector('#app');
const sectionTemplate = document.querySelector('#section-template');

function makeSection(title) {
  const node = sectionTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('h2').textContent = title;
  app.appendChild(node);
  return node.querySelector('.panel-body');
}

function render() {
  app.innerHTML = '';
  renderScenarioBuilder();
  renderWorkforceAreas();
  renderShiftLibrary();
  renderGenerator();
  renderVisualizer();
  renderCompare();
}

function renderScenarioBuilder() {
  const root = makeSection('A) Scenario Builder');
  root.innerHTML = `
    <label>Nombre escenario <input id="scenarioName" value="${scenario.name}" /></label>
    <div class="grid-2">
      <label>Objetivo
        <select id="targetMode">
          <option value="weekly40" ${scenario.targetMode === 'weekly40' ? 'selected' : ''}>40h semanal</option>
          <option value="weekly42" ${scenario.targetMode === 'weekly42' ? 'selected' : ''}>42h semanal</option>
          <option value="monthly40" ${scenario.targetMode === 'monthly40' ? 'selected' : ''}>40h promedio mensual</option>
        </select>
      </label>
      <label>Colación (min)
        <input id="breakMinutes" type="number" min="0" value="${scenario.breakMinutes}" />
      </label>
    </div>
    <label class="row"><input id="opCont" type="checkbox" ${scenario.operationContinuous ? 'checked' : ''}/> Operación continua</label>
    <small class="muted">Persistencia 100% LocalStorage (sin backend).</small>
    <button id="saveScenario">Guardar escenario</button>
  `;

  root.querySelector('#saveScenario').onclick = () => {
    scenario.name = root.querySelector('#scenarioName').value;
    scenario.targetMode = root.querySelector('#targetMode').value;
    scenario.breakMinutes = Number(root.querySelector('#breakMinutes').value);
    scenario.operationContinuous = root.querySelector('#opCont').checked;
    saveScenario(scenario);
    render();
  };
}

function renderWorkforceAreas() {
  const root = makeSection('B) Workforce & Areas');
  const rows = scenario.areas.map((a) => `
    <tr><td>${a.name}</td><td>${a.criticality}</td><td>${a.minByShift.M}/${a.minByShift.T}/${a.minByShift.N}</td></tr>
  `).join('');

  root.innerHTML = `
    <div class="row"><span class="badge">Personas: ${scenario.people.length}</span><span class="badge">Áreas: ${scenario.areas.length}</span></div>
    <table class="table">
      <thead><tr><th>Área</th><th>Criticidad</th><th>MIN M/T/N</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <small class="muted">Skills matrix inferida desde <code>people.skills</code>.</small>
  `;
}

function renderShiftLibrary() {
  const root = makeSection('C) Shift Models Library');
  root.innerHTML = `
    <div class="grid-2">
      <div><strong>5×8</strong><p class="muted">Patrón W W W W W L L</p></div>
      <div><strong>4×10</strong><p class="muted">Patrón W W W W L L L</p></div>
      <div><strong>12h 2-2-3</strong><p class="muted">Patrón W W L L W W W</p></div>
      <div><strong>5+1 medio</strong><p class="muted">W W W W W C L</p></div>
    </div>
    <table class="table">
      <thead><tr><th>Turno</th><th>Inicio</th><th>Fin</th></tr></thead>
      <tbody>
        ${Object.values(SHIFT_LIBRARY).map((s) => `<tr><td>${s.name}</td><td>${s.start}</td><td>${s.end}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function renderGenerator() {
  const root = makeSection('D) Generator / Optimizer');
  root.innerHTML = `
    <div class="grid-2">
      <label>Modelo base
        <select id="modelId">
          <option value="5x8">5x8</option>
          <option value="4x10">4x10</option>
          <option value="223-12h">223-12h</option>
          <option value="5plus1half">5+1 medio</option>
        </select>
      </label>
      <label>N° soluciones <input id="count" type="number" min="1" max="5" value="3" /></label>
    </div>
    <button id="generate">Generar</button>
    <small class="muted">Motor determinista en módulo puro (sin UI state acoplado).</small>
  `;

  root.querySelector('#generate').onclick = () => {
    const modelId = root.querySelector('#modelId').value;
    const count = Number(root.querySelector('#count').value);
    const generated = Array.from({ length: count }, (_, i) => generateSolution(scenario, { modelId: i % 2 === 0 ? modelId : '5plus1half' }));
    solutions = generated.sort((a, b) => b.score - a.score);
    saveSolutions(solutions);
    render();
  };
}

function renderVisualizer() {
  const root = makeSection('E) Visualizer');
  if (!solutions.length) {
    root.innerHTML = '<p class="muted">Genera una propuesta para visualizar cobertura, reglas y equidad.</p>';
    return;
  }

  const best = solutions[0];
  const violations = best.metrics.gaps.slice(0, 8);
  root.innerHTML = `
    <div class="row">
      <span class="badge">Score: ${best.score.toFixed(1)}</span>
      <span class="badge">Gaps: ${best.metrics.gaps.length}</span>
      <span class="badge">Fairness σ: ${best.metrics.fairnessStdDev.toFixed(2)}</span>
    </div>
    <div id="heatmap" class="heatmap"></div>
    <strong>Violations</strong>
    <ul>
      ${violations.map((v) => `<li class="err">Bucket ${v.bucket}, área ${v.areaId}, faltan ${v.missing}</li>`).join('') || '<li class="ok">Sin violaciones</li>'}
    </ul>
  `;

  const heatmap = root.querySelector('#heatmap');
  heatmap.append(...buildHeatmap(best));
}

function buildHeatmap(solution) {
  const nodes = [];
  nodes.push(cell('Día/Hora', true));
  for (let h = 0; h < 24; h++) nodes.push(cell(String(h), true));

  for (let d = 0; d < 7; d++) {
    nodes.push(cell(DAYS[d], true));
    for (let h = 0; h < 24; h++) {
      const idx = d * 24 + h;
      const cov = solution.metrics.coverage.get(idx) || new Map();
      const req = solution.metrics.required.get(idx) || new Map();
      const totalCov = [...cov.values()].reduce((a, b) => a + b, 0);
      const totalReq = [...req.values()].reduce((a, b) => a + b, 0);
      const ratio = totalReq ? totalCov / totalReq : 1;
      const el = cell(totalCov.toString(), false);
      el.style.background = ratio < 0.7 ? '#fee2e2' : ratio < 1 ? '#fef3c7' : '#dcfce7';
      nodes.push(el);
    }
  }

  return nodes;
}

function cell(text, header) {
  const div = document.createElement('div');
  div.textContent = text;
  if (header) div.style.fontWeight = '600';
  return div;
}

function renderCompare() {
  const root = makeSection('F) Compare');
  if (!solutions.length) {
    root.innerHTML = '<p class="muted">Aún no hay escenarios para comparar.</p>';
    return;
  }

  const rows = solutions.slice(0, 5).map((s, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${s.modelId}</td>
      <td>${s.score.toFixed(1)}</td>
      <td>${s.metrics.gaps.length}</td>
      <td>${s.metrics.fairnessStdDev.toFixed(2)}</td>
    </tr>
  `).join('');

  root.innerHTML = `
    <table class="table">
      <thead><tr><th>Solución</th><th>Modelo</th><th>Score</th><th>Incumplimientos</th><th>Equidad σ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <button id="reset" class="secondary">Limpiar soluciones</button>
  `;

  root.querySelector('#reset').onclick = () => {
    solutions = [];
    saveSolutions(solutions);
    render();
  };
}

render();
