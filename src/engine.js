const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function parseTime(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return 0;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function blockDurationMinutes(block) {
  const start = parseTime(block.start);
  const end = parseTime(block.end);
  const spansMidnight = end < start;
  return spansMidnight ? (1440 - start) + end : Math.max(0, end - start);
}

export function paidMinutes(block, defaultBreakMinutes = 30) {
  const breakMinutes = Number.isFinite(block.breakMinutes) ? block.breakMinutes : defaultBreakMinutes;
  return Math.max(0, blockDurationMinutes(block) - Math.max(0, breakMinutes || 0));
}

export function computeSpansMidnight(block) {
  return parseTime(block.end) < parseTime(block.start);
}

function addDays(dateISO, amount) {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekMondayISO(inputDate = new Date()) {
  const d = new Date(inputDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function createDay(dateISO) {
  return {
    dateISO,
    isOff: false,
    blocks: []
  };
}

export function createDefaultPlan() {
  const startDateISO = startOfWeekMondayISO();
  return {
    id: crypto.randomUUID(),
    name: 'Nuevo calendario',
    startDateISO,
    targetMode: 'weekly40',
    defaultBreakMinutes: 30,
    resolutionMinutes: 30,
    showLabels: true,
    days: Array.from({ length: 28 }, (_, index) => createDay(addDays(startDateISO, index)))
  };
}

export function syncPlanDates(plan) {
  return {
    ...plan,
    days: Array.from({ length: 28 }, (_, idx) => {
      const baseDay = plan.days[idx] || createDay(addDays(plan.startDateISO, idx));
      const dateISO = addDays(plan.startDateISO, idx);
      return {
        dateISO,
        isOff: !!baseDay.isOff,
        blocks: (baseDay.blocks || []).map((block) => ({
          ...block,
          spansMidnight: computeSpansMidnight(block)
        }))
      };
    })
  };
}

export function cloneDay(day) {
  return {
    ...day,
    blocks: day.blocks.map((block) => ({ ...block }))
  };
}

export function weeklyTotals(plan) {
  const weekTotals = [0, 1, 2, 3].map((week) => {
    const start = week * 7;
    const totalPaidMinutes = plan.days.slice(start, start + 7).reduce((acc, day) => {
      if (day.isOff) return acc;
      return acc + day.blocks.reduce((sum, block) => sum + paidMinutes(block, plan.defaultBreakMinutes), 0);
    }, 0);
    return totalPaidMinutes / 60;
  });

  return {
    week1: weekTotals[0],
    week2: weekTotals[1],
    week3: weekTotals[2],
    week4: weekTotals[3],
    monthTotal: weekTotals.reduce((a, b) => a + b, 0)
  };
}

export function targetHoursForMode(mode) {
  if (mode === 'weekly42') return 42;
  if (mode === 'monthly40') return 160;
  return 40;
}

export function dayTimelineBuckets(plan, dayIndex, resolutionMinutes = 30) {
  const day = plan.days[dayIndex];
  const totalBuckets = Math.ceil(1440 / resolutionMinutes);
  const buckets = Array.from({ length: totalBuckets }, (_, i) => ({
    minuteStart: i * resolutionMinutes,
    occupied: false,
    label: ''
  }));

  if (!day || day.isOff) return buckets;

  for (const piece of blocksForDayView(plan, dayIndex)) {
    const startBucket = Math.floor(piece.startMinute / resolutionMinutes);
    const endBucket = Math.ceil(piece.endMinute / resolutionMinutes);
    for (let i = startBucket; i < endBucket; i += 1) {
      if (buckets[i]) {
        buckets[i].occupied = true;
        buckets[i].label = piece.label || buckets[i].label;
      }
    }
  }
  return buckets;
}

export function blocksForDayView(plan, dayIndex) {
  const day = plan.days[dayIndex];
  if (!day) return [];
  const pieces = [];

  for (const block of day.blocks || []) {
    const start = parseTime(block.start);
    const end = parseTime(block.end);
    const spans = computeSpansMidnight(block);
    if (spans) {
      pieces.push({
        id: `${block.id}-a`,
        sourceId: block.id,
        startMinute: start,
        endMinute: 1440,
        label: block.label,
        continuesNextDay: true,
        fromPreviousDay: false
      });
    } else {
      pieces.push({
        id: block.id,
        sourceId: block.id,
        startMinute: start,
        endMinute: end,
        label: block.label,
        continuesNextDay: false,
        fromPreviousDay: false
      });
    }
  }

  const prev = plan.days[dayIndex - 1];
  if (prev && !prev.isOff) {
    for (const block of prev.blocks || []) {
      if (computeSpansMidnight(block)) {
        pieces.push({
          id: `${block.id}-b`,
          sourceId: block.id,
          startMinute: 0,
          endMinute: parseTime(block.end),
          label: block.label,
          continuesNextDay: false,
          fromPreviousDay: true
        });
      }
    }
  }

  return pieces.sort((a, b) => a.startMinute - b.startMinute);
}

export function dayLabel(dateISO) {
  const date = new Date(`${dateISO}T00:00:00`);
  const dayIdx = (date.getDay() + 6) % 7;
  return `${WEEK_DAYS[dayIdx]} ${date.getDate()}`;
}

export function normalizeImportedPlan(raw) {
  const base = createDefaultPlan();
  const merged = {
    ...base,
    ...raw,
    defaultBreakMinutes: Number(raw?.defaultBreakMinutes ?? base.defaultBreakMinutes),
    resolutionMinutes: Number(raw?.resolutionMinutes ?? base.resolutionMinutes),
    days: Array.isArray(raw?.days) ? raw.days : base.days
  };

  return syncPlanDates(merged);
}
