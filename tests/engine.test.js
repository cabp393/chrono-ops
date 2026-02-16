import assert from 'node:assert/strict';
import {
  computeMetricsFromSchedule,
  defaultScenario,
  defaultSchedule,
  minutesBetween,
  parseTime,
  shiftPaidMinutes,
  targetHoursForMode
} from '../src/engine.js';

assert.equal(parseTime('00:00'), 0);
assert.equal(parseTime('07:30'), 450);
assert.equal(minutesBetween('23:00', '07:00', true), 480);

const scenario = defaultScenario();
assert.equal(shiftPaidMinutes(scenario.shifts[0], scenario.breakMinutes), 450);
assert.equal(targetHoursForMode('weekly42'), 42);

const schedule = defaultSchedule(scenario);
const metrics = computeMetricsFromSchedule(scenario, schedule, 60);

assert.ok(metrics.coverage.size > 0, 'Debe calcular cobertura');
assert.ok(metrics.required.size > 0, 'Debe calcular requerimientos');
assert.ok(metrics.hoursSummary.length === scenario.people.length, 'Debe incluir horas por persona');
assert.equal(metrics.bucketCount, 168);
assert.ok(Number.isFinite(metrics.fairnessStdDev), 'Fairness debe ser numérico');

console.log('engine tests ok');
