import { useState } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/icons';
import { DAY_LABELS, createEmptyDaySlot, getDayKey, slotValidationError, resolveSchedule, toISODate, weekDates } from '../../lib/scheduleUtils';
import type { ScheduleOverride, ScheduleTemplate } from '../../types';
import { TimeInput24 } from '../TimeInput24';

type Props = {
  personId: string;
  weekStart: Date;
  template: ScheduleTemplate | undefined;
  overrides: ScheduleOverride[];
  weekAssigned: boolean;
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
};

export const WeekScheduleTable = ({ personId, weekStart, template, overrides, weekAssigned, onUpsertOverride }: Props) => {
  const dates = weekDates(weekStart);
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="card schedule-week-card">
      <button className="week-section-toggle" onClick={() => setExpanded((current) => !current)}>
        <span>Semana</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded ? <div className="week-day-list">
        {dates.map((date) => {
          const dateISO = toISODate(date);
          const resolved = weekAssigned ? resolveSchedule(personId, dateISO, template, overrides) : { source: 'none' as const, slot: createEmptyDaySlot() };
          const override = weekAssigned ? overrides.find((item) => item.personId === personId && item.dateISO === dateISO) : undefined;
          const dayKey = getDayKey(date);
          const slot = { start: override?.start ?? resolved.slot.start, end: override?.end ?? resolved.slot.end };
          const invalid = !!slotValidationError(slot);

          return (
            <article key={dateISO} className={`week-day-row compact ${invalid ? 'invalid' : ''}`}>
              <strong>{DAY_LABELS[dayKey]}</strong>
              <TimeInput24
                disabled={!weekAssigned}
                value={slot.start ?? ''}
                onChange={(value) => {
                  const nextStart = value || null;
                  onUpsertOverride(dateISO, nextStart, slot.end ?? null);
                }}
                step={60}
              />
              <TimeInput24
                disabled={!weekAssigned}
                value={slot.end ?? ''}
                onChange={(value) => {
                  const nextEnd = value || null;
                  onUpsertOverride(dateISO, slot.start ?? null, nextEnd);
                }}
                step={60}
              />
            </article>
          );
        })}
      </div> : null}
    </section>
  );
};
