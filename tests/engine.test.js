import assert from 'node:assert/strict';
import {
  blockDurationMinutes,
  createDefaultPlan,
  dayTimelineBuckets,
  normalizeImportedPlan,
  paidMinutes,
  parseTime,
  weeklyTotals
} from '../src/engine.js';

assert.equal(parseTime('07:30'), 450);
assert.equal(blockDurationMinutes({ start: '23:00', end: '07:00' }), 480);
assert.equal(paidMinutes({ start: '09:00', end: '17:00' }, 30), 450);

const plan = createDefaultPlan();
plan.days[0].blocks = [{ id: 'a', start: '09:00', end: '17:00', spansMidnight: false }];
plan.days[1].blocks = [{ id: 'b', start: '23:00', end: '07:00', spansMidnight: true }];
const totals = weeklyTotals(plan);
assert.equal(Number(totals.week1.toFixed(2)), 15);

const day2Buckets = dayTimelineBuckets(plan, 2, 30);
assert.ok(day2Buckets.some((b, idx) => idx < 14 && b.occupied), 'midnight carry should occupy day 3 first hours');

const imported = normalizeImportedPlan({
  name: 'Imported',
  startDateISO: plan.startDateISO,
  days: [{ dateISO: plan.startDateISO, isOff: true, blocks: [] }]
});
assert.equal(imported.days.length, 28);

console.log('engine tests ok');
