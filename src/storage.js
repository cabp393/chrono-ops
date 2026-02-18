const SCENARIO_KEY = 'chronoops.scenario.v1';
const SCHEDULE_KEY = 'chronoops.schedule.v1';
const SNAPSHOTS_KEY = 'chronoops.snapshots.v1';

function safeParseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeGetItem(key) {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignora errores de quota o restricciones del navegador.
  }
}

export class LocalStorageAdapter {
  getScenario() {
    const raw = safeGetItem(SCENARIO_KEY);
    const value = safeParseJSON(raw, null);
    return isObject(value) ? value : null;
  }

  setScenario(scenario) {
    safeSetItem(SCENARIO_KEY, JSON.stringify(scenario));
  }

  getSchedule() {
    const raw = safeGetItem(SCHEDULE_KEY);
    const value = safeParseJSON(raw, null);
    if (!isObject(value)) return null;
    return Array.isArray(value.assignments) ? value : null;
  }

  setSchedule(schedule) {
    safeSetItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }

  getSnapshots() {
    const raw = safeGetItem(SNAPSHOTS_KEY);
    const value = safeParseJSON(raw, []);
    return Array.isArray(value) ? value : [];
  }

  setSnapshots(snapshots) {
    safeSetItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
  }

  exportAll() {
    return {
      version: 1,
      scenario: this.getScenario(),
      schedule: this.getSchedule(),
      snapshots: this.getSnapshots()
    };
  }

  importAll(payload) {
    if (!isObject(payload)) {
      throw new Error('Payload inválido para importAll');
    }
    if (isObject(payload.scenario)) this.setScenario(payload.scenario);
    if (isObject(payload.schedule) && Array.isArray(payload.schedule.assignments)) this.setSchedule(payload.schedule);
    if (Array.isArray(payload.snapshots)) this.setSnapshots(payload.snapshots);
  }
}

export function createStorageAdapter() {
  return new LocalStorageAdapter();
}
