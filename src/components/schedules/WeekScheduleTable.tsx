import { DAY_LABELS, formatDateCompact, formatSlot, getDayKey, resolveSchedule, toISODate, weekDates } from '../../lib/scheduleUtils';
import type { ScheduleOverride, ScheduleTemplate } from '../../types';

type Props = {
  personId: string;
  weekStart: Date;
  template: ScheduleTemplate | undefined;
  overrides: ScheduleOverride[];
  onUpsertOverride: (dateISO: string, start: string | null, end: string | null) => void;
  onRevertOverride: (dateISO: string) => void;
};

export const WeekScheduleTable = ({ personId, weekStart, template, overrides, onUpsertOverride, onRevertOverride }: Props) => {
  const dates = weekDates(weekStart);

  return (
    <section className="card schedule-week-card">
      <h3>Semana</h3>
      <div className="week-day-list">
        {dates.map((date) => {
          const dateISO = toISODate(date);
          const resolved = resolveSchedule(personId, dateISO, template, overrides);
          const override = overrides.find((item) => item.personId === personId && item.dateISO === dateISO);
          const dayKey = getDayKey(date);
          const badge = resolved.source === 'override' ? 'Ajuste' : resolved.source === 'template' ? 'Base' : 'Libre';
          return (
            <article key={dateISO} className="week-day-row">
              <div className="week-day-head">
                <strong>{DAY_LABELS[dayKey]} {formatDateCompact(date)}</strong>
                <span className={`chip ${resolved.source === 'override' ? 'warning' : 'muted'}`}>{badge}</span>
              </div>

              <div className="day-controls">
                <input
                  type="time"
                  value={override?.start ?? resolved.slot.start ?? ''}
                  onChange={(event) => {
                    const nextStart = event.target.value || null;
                    onUpsertOverride(dateISO, nextStart, override?.end ?? resolved.slot.end ?? null);
                  }}
                />
                <input
                  type="time"
                  value={override?.end ?? resolved.slot.end ?? ''}
                  onChange={(event) => {
                    const nextEnd = event.target.value || null;
                    onUpsertOverride(dateISO, override?.start ?? resolved.slot.start ?? null, nextEnd);
                  }}
                />
                <button className="ghost" onClick={() => onUpsertOverride(dateISO, null, null)}>Libre</button>
                {override ? <button onClick={() => onRevertOverride(dateISO)}>Revertir</button> : null}
              </div>
              <p className="week-day-preview">{formatSlot({ start: override?.start ?? resolved.slot.start, end: override?.end ?? resolved.slot.end })}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
