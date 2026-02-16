const SCENARIO_KEY = 'chronoops.scenario.v1';
const SOLUTIONS_KEY = 'chronoops.solutions.v1';

export function saveScenario(scenario) {
  localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario));
}

export function loadScenario() {
  const raw = localStorage.getItem(SCENARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSolutions(solutions) {
  localStorage.setItem(SOLUTIONS_KEY, JSON.stringify(solutions));
}

export function loadSolutions() {
  const raw = localStorage.getItem(SOLUTIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}
