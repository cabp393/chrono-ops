/**
 * @typedef {'weekly40'|'weekly42'|'monthly40'} TargetMode
 *
 * @typedef {{
 *  dayIndex:number,
 *  start:string,
 *  end:string,
 *  closed:boolean
 * }} OperationDay
 *
 * @typedef {{
 *  id:string,
 *  name:string,
 *  start:string,
 *  end:string,
 *  breakMinutes?:number,
 *  color?:string,
 *  spansMidnight:boolean
 * }} Shift
 *
 * @typedef {{
 *  id:string,
 *  name:string,
 *  criticality:string,
 *  minByShiftId:Record<string, number>,
 *  minByDay?:Record<number, number>
 * }} Area
 *
 * @typedef {{
 *  id:string,
 *  name:string,
 *  skills:string[],
 *  team?:string
 * }} Person
 *
 * @typedef {{
 *  maxDailyMinutes?:number,
 *  minRestMinutes?:number
 * }} Rules
 *
 * @typedef {{
 *  id:string,
 *  name:string,
 *  targetMode:TargetMode,
 *  breakMinutes:number,
 *  bucketMinutes:number,
 *  operationWindow:OperationDay[],
 *  shifts:Shift[],
 *  areas:Area[],
 *  people:Person[],
 *  rules:Rules
 * }} Scenario
 *
 * @typedef {{
 *  personId:string,
 *  dayIndex:number,
 *  shiftId:string,
 *  areaId:string
 * }} Assignment
 *
 * @typedef {{ assignments: Assignment[] }} Schedule
 */

export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function parseTime(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function minutesBetween(startHHMM, endHHMM, spansMidnight = false) {
  const start = parseTime(startHHMM);
  const end = parseTime(endHHMM);
  return spansMidnight ? 24 * 60 - start + end : end - start;
}

export function shiftPaidMinutes(shift, defaultBreakMinutes = 30) {
  const duration = minutesBetween(shift.start, shift.end, shift.spansMidnight);
  return Math.max(0, duration - (shift.breakMinutes ?? defaultBreakMinutes));
}

export function defaultScenario() {
  return {
    id: crypto.randomUUID(),
    name: 'Escenario base',
    targetMode: 'weekly40',
    breakMinutes: 30,
    bucketMinutes: 60,
    operationWindow: DAYS.map((_, dayIndex) => ({
      dayIndex,
      start: '07:00',
      end: dayIndex === 5 ? '20:00' : '23:00',
      closed: dayIndex === 6
    })),
    shifts: [
      { id: 'M', name: 'Mañana', start: '07:00', end: '15:00', breakMinutes: 30, color: '#93c5fd', spansMidnight: false },
      { id: 'T', name: 'Tarde', start: '15:00', end: '23:00', breakMinutes: 30, color: '#f9a8d4', spansMidnight: false },
      { id: 'N', name: 'Noche', start: '23:00', end: '07:00', breakMinutes: 45, color: '#c4b5fd', spansMidnight: true }
    ],
    areas: [
      { id: 'picking', name: 'Picking', criticality: 'alta', minByShiftId: { M: 6, T: 5, N: 3 } },
      { id: 'repo', name: 'Reposición', criticality: 'media', minByShiftId: { M: 3, T: 4, N: 2 } },
      { id: 'qa', name: 'QA', criticality: 'alta', minByShiftId: { M: 2, T: 2, N: 1 } }
    ],
    people: Array.from({ length: 18 }, (_, i) => ({
      id: `P${String(i + 1).padStart(2, '0')}`,
      name: `Operario ${i + 1}`,
      team: i < 9 ? 'A' : 'B',
      skills: i % 4 === 0 ? ['picking', 'repo', 'qa'] : ['picking', 'repo']
    })),
    rules: {
      maxDailyMinutes: 10 * 60,
      minRestMinutes: 11 * 60
    }
  };
}

export function defaultSchedule(scenario = defaultScenario()) {
  return {
    assignments: scenario.people.flatMap((person, index) => {
      const dayBase = index % 3;
      return [0, 1, 2, 3, 4].map((dayOffset) => {
        const dayIndex = (dayBase + dayOffset) % 6;
        const shift = scenario.shifts[(index + dayOffset) % Math.min(2, scenario.shifts.length)];
        const areaId = person.skills[dayOffset % person.skills.length] ?? scenario.areas[0]?.id;
        return { personId: person.id, dayIndex, shiftId: shift?.id ?? '', areaId };
      });
    })
  };
}

function toAbsoluteRange(dayIndex, shift) {
  const start = dayIndex * 24 * 60 + parseTime(shift.start);
  const end = start + minutesBetween(shift.start, shift.end, shift.spansMidnight);
  return { start, end };
}

function bucketMeta(bucketIndex, bucketMinutes) {
  const minute = bucketIndex * bucketMinutes;
  const dayIndex = Math.floor(minute / (24 * 60));
  const minuteOfDay = minute % (24 * 60);
  return { dayIndex, minuteOfDay };
}

function isInsideOperation(operationWindow, dayIndex, minuteOfDay) {
  const config = operationWindow[dayIndex];
  if (!config || config.closed) return false;
  const start = parseTime(config.start);
  const end = parseTime(config.end);
  if (end <= start) return false;
  return minuteOfDay >= start && minuteOfDay < end;
}

export function computeMetricsFromSchedule(scenario, schedule, bucketMinutes = scenario.bucketMinutes ?? 60) {
  const safeBucket = [15, 30, 60].includes(bucketMinutes) ? bucketMinutes : 60;
  const bucketCount = Math.ceil((7 * 24 * 60) / safeBucket);

  const coverage = new Map();
  const required = new Map();
  const operationBuckets = new Array(bucketCount).fill(false);

  for (let i = 0; i < bucketCount; i += 1) {
    coverage.set(i, new Map());
    required.set(i, new Map());
    const { dayIndex, minuteOfDay } = bucketMeta(i, safeBucket);
    operationBuckets[i] = isInsideOperation(scenario.operationWindow, dayIndex, minuteOfDay);
  }

  for (let i = 0; i < bucketCount; i += 1) {
    if (!operationBuckets[i]) continue;
    const { dayIndex } = bucketMeta(i, safeBucket);
    for (const area of scenario.areas) {
      const shiftValues = Object.values(area.minByShiftId || {});
      const baseMin = shiftValues.length ? Math.max(...shiftValues.map(Number)) : 0;
      const dayOverride = area.minByDay?.[dayIndex];
      required.get(i).set(area.id, dayOverride ?? baseMin);
    }
  }

  const shiftsById = new Map(scenario.shifts.map((shift) => [shift.id, shift]));
  const peopleById = new Map(scenario.people.map((person) => [person.id, person]));

  const paidMinutesByPerson = new Map();
  const saturdayLoads = new Map();
  const nightShiftsByPerson = new Map();
  const assignmentsByPerson = new Map();
  const scheduleWarnings = [];

  for (const assignment of schedule.assignments || []) {
    const shift = shiftsById.get(assignment.shiftId);
    if (!shift) {
      scheduleWarnings.push({ type: 'missing_shift', assignment });
      continue;
    }

    if (!peopleById.has(assignment.personId)) {
      scheduleWarnings.push({ type: 'missing_person', assignment });
      continue;
    }

    const range = toAbsoluteRange(assignment.dayIndex, shift);
    for (let minute = range.start; minute < range.end; minute += safeBucket) {
      const bucketIndex = Math.floor(minute / safeBucket) % bucketCount;
      const covMap = coverage.get(bucketIndex);
      covMap.set(assignment.areaId, (covMap.get(assignment.areaId) || 0) + 1);
    }

    const paidMinutes = shiftPaidMinutes(shift, scenario.breakMinutes);
    paidMinutesByPerson.set(assignment.personId, (paidMinutesByPerson.get(assignment.personId) || 0) + paidMinutes);

    if (assignment.dayIndex === 5) {
      saturdayLoads.set(assignment.personId, (saturdayLoads.get(assignment.personId) || 0) + 1);
    }

    if (shift.spansMidnight) {
      nightShiftsByPerson.set(assignment.personId, (nightShiftsByPerson.get(assignment.personId) || 0) + 1);
    }

    const list = assignmentsByPerson.get(assignment.personId) || [];
    list.push({ ...assignment, start: range.start, end: range.end });
    assignmentsByPerson.set(assignment.personId, list);
  }

  const violations = [];
  for (let i = 0; i < bucketCount; i += 1) {
    if (!operationBuckets[i]) continue;
    const { dayIndex, minuteOfDay } = bucketMeta(i, safeBucket);
    const reqMap = required.get(i);
    const covMap = coverage.get(i);
    for (const [areaId, minReq] of reqMap.entries()) {
      const covered = covMap.get(areaId) || 0;
      if (covered < minReq) {
        violations.push({
          type: 'coverage_gap',
          bucket: i,
          dayIndex,
          minuteOfDay,
          areaId,
          required: minReq,
          covered,
          missing: minReq - covered,
          severity: minReq - covered
        });
      }
    }
  }

  const personRows = scenario.people.map((person) => {
    const paidMinutes = paidMinutesByPerson.get(person.id) || 0;
    const saturdayShifts = saturdayLoads.get(person.id) || 0;
    const nightShifts = nightShiftsByPerson.get(person.id) || 0;

    const warnings = [];
    const personAssignments = (assignmentsByPerson.get(person.id) || []).sort((a, b) => a.start - b.start);

    if (scenario.rules?.maxDailyMinutes) {
      const minutesByDay = new Map();
      for (const assignment of personAssignments) {
        const shift = shiftsById.get(assignment.shiftId);
        const paid = shift ? shiftPaidMinutes(shift, scenario.breakMinutes) : 0;
        minutesByDay.set(assignment.dayIndex, (minutesByDay.get(assignment.dayIndex) || 0) + paid);
      }

      for (const [dayIndex, total] of minutesByDay.entries()) {
        if (total > scenario.rules.maxDailyMinutes) {
          warnings.push({ type: 'maxDailyExceeded', dayIndex, total, allowed: scenario.rules.maxDailyMinutes });
        }
      }
    }

    if (scenario.rules?.minRestMinutes) {
      for (let i = 1; i < personAssignments.length; i += 1) {
        const rest = personAssignments[i].start - personAssignments[i - 1].end;
        if (rest < scenario.rules.minRestMinutes) {
          warnings.push({
            type: 'minRestViolation',
            fromDay: personAssignments[i - 1].dayIndex,
            toDay: personAssignments[i].dayIndex,
            rest,
            required: scenario.rules.minRestMinutes
          });
        }
      }
    }

    return {
      personId: person.id,
      paidMinutes,
      paidHours: paidMinutes / 60,
      saturdayShifts,
      nightShifts,
      warnings
    };
  });

  const hoursByPerson = new Map(personRows.map((row) => [row.personId, row.paidHours]));

  return {
    bucketMinutes: safeBucket,
    bucketCount,
    operationBuckets,
    coverage,
    required,
    gaps: violations.sort((a, b) => b.severity - a.severity),
    hoursByPerson,
    hoursSummary: personRows,
    fairnessStdDev: stddev(personRows.map((row) => row.paidHours)),
    saturdayLoads,
    nightShiftsByPerson,
    scheduleWarnings
  };
}

function stddev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function targetHoursForMode(targetMode) {
  if (targetMode === 'weekly42') return 42;
  if (targetMode === 'monthly40') return 160;
  return 40;
}
