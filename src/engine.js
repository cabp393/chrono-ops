/** @typedef {'weekly40'|'weekly42'|'monthly40'} TargetMode */

export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const SHIFT_LIBRARY = {
  M: { id: 'M', name: 'Mañana', start: '07:00', end: '15:00', spansMidnight: false },
  T: { id: 'T', name: 'Tarde', start: '15:00', end: '23:00', spansMidnight: false },
  N: { id: 'N', name: 'Noche', start: '23:00', end: '07:00', spansMidnight: true },
  C: { id: 'C', name: 'Corto', start: '10:00', end: '16:00', spansMidnight: false }
};

export function parseTime(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function shiftPaidMinutes(shift, breakMinutes) {
  const start = parseTime(shift.start);
  const end = parseTime(shift.end);
  const duration = shift.spansMidnight ? (24 * 60 - start) + end : end - start;
  return Math.max(0, duration - breakMinutes);
}

export function weekMinute(dayIndex, hhmm) {
  return dayIndex * 24 * 60 + parseTime(hhmm);
}

export function defaultScenario() {
  return {
    id: crypto.randomUUID(),
    name: 'Escenario base',
    targetMode: 'weekly40',
    breakMinutes: 45,
    maxDailyMinutes: 10 * 60,
    minRestMinutes: 11 * 60,
    operationContinuous: false,
    operationWindow: DAYS.map((day, index) => ({ day, index, start: '07:00', end: index === 5 ? '22:00' : '23:00', closed: index === 6 })),
    areas: [
      { id: 'picking', name: 'Picking', criticality: 'alta', minByShift: { M: 6, T: 5, N: 3, C: 2 } },
      { id: 'repo', name: 'Reposición', criticality: 'media', minByShift: { M: 3, T: 4, N: 2, C: 1 } },
      { id: 'qa', name: 'QA', criticality: 'alta', minByShift: { M: 2, T: 2, N: 1, C: 0 } }
    ],
    people: Array.from({ length: 24 }, (_, i) => ({
      id: `P${String(i + 1).padStart(2, '0')}`,
      name: `Operario ${i + 1}`,
      skills: i % 5 === 0 ? ['picking', 'repo', 'qa'] : ['picking', 'repo']
    }))
  };
}

function patternByModel(modelId) {
  const lib = {
    '5x8': ['W', 'W', 'W', 'W', 'W', 'L', 'L'],
    '4x10': ['W', 'W', 'W', 'W', 'L', 'L', 'L'],
    '223-12h': ['W', 'W', 'L', 'L', 'W', 'W', 'W'],
    '5plus1half': ['W', 'W', 'W', 'W', 'W', 'C', 'L']
  };
  return lib[modelId] || lib['5x8'];
}

export function generateSolution(scenario, { modelId = '5x8', bucketMinutes = 60 }) {
  const pattern = patternByModel(modelId);
  const assignments = [];

  scenario.people.forEach((person, idx) => {
    const offset = idx % 7;
    for (let day = 0; day < 7; day++) {
      const token = pattern[(day + offset) % 7];
      if (token === 'L') continue;
      const shiftId = token === 'C' ? 'C' : idx % 3 === 0 ? 'N' : idx % 2 === 0 ? 'M' : 'T';
      assignments.push({ personId: person.id, day, shiftId, areaId: person.skills[day % person.skills.length] });
    }
  });

  const metrics = computeMetrics(scenario, assignments, bucketMinutes);
  return {
    id: crypto.randomUUID(),
    modelId,
    createdAt: new Date().toISOString(),
    assignments,
    metrics,
    score: scoreSolution(metrics)
  };
}

export function computeMetrics(scenario, assignments, bucketMinutes = 60) {
  const buckets = Math.ceil((7 * 24 * 60) / bucketMinutes);
  const coverage = new Map();
  const required = new Map();

  for (let i = 0; i < buckets; i++) {
    coverage.set(i, new Map());
    required.set(i, new Map());
  }

  for (let day = 0; day < 7; day++) {
    scenario.areas.forEach((area) => {
      const minHourly = Math.max(...Object.values(area.minByShift));
      for (let hour = 0; hour < 24; hour++) {
        const idx = Math.floor((day * 24 * 60 + hour * 60) / bucketMinutes);
        required.get(idx).set(area.id, minHourly);
      }
    });
  }

  for (const a of assignments) {
    const shift = SHIFT_LIBRARY[a.shiftId];
    if (!shift) continue;
    const start = weekMinute(a.day, shift.start);
    let end = weekMinute(a.day, shift.end);
    if (shift.spansMidnight) end += 24 * 60;

    for (let minute = start; minute < end; minute += bucketMinutes) {
      const idx = Math.floor(minute / bucketMinutes) % buckets;
      const areaMap = coverage.get(idx);
      areaMap.set(a.areaId, (areaMap.get(a.areaId) || 0) + 1);
    }
  }

  const hoursByPerson = new Map();
  for (const a of assignments) {
    const shift = SHIFT_LIBRARY[a.shiftId];
    const paid = shiftPaidMinutes(shift, scenario.breakMinutes);
    hoursByPerson.set(a.personId, (hoursByPerson.get(a.personId) || 0) + paid / 60);
  }

  const violations = [];
  for (const [bucket, reqByArea] of required.entries()) {
    for (const [areaId, minReq] of reqByArea.entries()) {
      const got = coverage.get(bucket).get(areaId) || 0;
      if (got < minReq) violations.push({ type: 'coverage_gap', bucket, areaId, missing: minReq - got });
    }
  }

  return {
    bucketMinutes,
    coverage,
    required,
    gaps: violations,
    hoursByPerson,
    fairnessStdDev: stddev(Array.from(hoursByPerson.values())),
    saturdayLoads: saturdayLoads(assignments)
  };
}

function saturdayLoads(assignments) {
  const map = new Map();
  assignments.filter((a) => a.day === 5).forEach((a) => map.set(a.personId, (map.get(a.personId) || 0) + 1));
  return map;
}

function stddev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((acc, x) => acc + x, 0) / values.length;
  const variance = values.reduce((acc, x) => acc + (x - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function scoreSolution(metrics) {
  const hardPenalty = metrics.gaps.length * 100;
  const fairnessPenalty = metrics.fairnessStdDev * 5;
  const saturdayPenalty = stddev(Array.from(metrics.saturdayLoads.values())) * 3;
  return Math.max(0, 1000 - hardPenalty - fairnessPenalty - saturdayPenalty);
}
