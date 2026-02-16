const SCENARIO_KEY = 'chronoops.scenario.v1';
const SCHEDULE_KEY = 'chronoops.schedule.v1';
const SNAPSHOTS_KEY = 'chronoops.snapshots.v1';

export class LocalStorageAdapter {
  getScenario() {
    const raw = localStorage.getItem(SCENARIO_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  setScenario(scenario) {
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenario));
  }

  getSchedule() {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  setSchedule(schedule) {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  }

  getSnapshots() {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  setSnapshots(snapshots) {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
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
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido para importAll');
    }
    if (payload.scenario) this.setScenario(payload.scenario);
    if (payload.schedule) this.setSchedule(payload.schedule);
    if (Array.isArray(payload.snapshots)) this.setSnapshots(payload.snapshots);
  }
}

export function createStorageAdapter() {
  return new LocalStorageAdapter();
}
