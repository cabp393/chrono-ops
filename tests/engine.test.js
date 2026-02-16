import assert from 'node:assert/strict';
import { defaultScenario, generateSolution, parseTime, scoreSolution, shiftPaidMinutes, SHIFT_LIBRARY } from '../src/engine.js';

assert.equal(parseTime('00:00'), 0);
assert.equal(parseTime('07:30'), 450);

assert.equal(shiftPaidMinutes(SHIFT_LIBRARY.M, 45), 435);
assert.equal(shiftPaidMinutes(SHIFT_LIBRARY.N, 60), 420);

const scenario = defaultScenario();
const solution = generateSolution(scenario, { modelId: '5x8' });
assert.ok(solution.assignments.length > 0, 'Debe crear asignaciones');
assert.ok(solution.metrics.coverage.size > 0, 'Debe calcular cobertura');
assert.ok(Number.isFinite(solution.score), 'Score debe ser numérico');
assert.equal(solution.score, scoreSolution(solution.metrics));

console.log('engine tests ok');
