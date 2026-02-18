import type { Person, Role, Shift, TimeScale } from '../types';
import { addDays, formatDayHeader } from '../lib/dateUtils';
import { ShiftBlock } from './ShiftBlock';

type Props = {
  weekStart: Date;
  shifts: Shift[];
  people: Person[];
  roles: Role[];
  scale: TimeScale;
  coverageTotals: Record<string, number[]>;
  onShiftClick: (shift: Shift) => void;
  onlyGaps: boolean;
};

const BLOCK_HEIGHT: Record<TimeScale, number> = { 30: 34, 60: 28, 120: 22, 180: 20, 240: 18, 360: 16 };

export const WeekGrid = ({ weekStart, shifts, people, roles, scale, coverageTotals, onShiftClick, onlyGaps }: Props) => {
  const blockHeight = BLOCK_HEIGHT[scale];
  const dayHeight = ((24 * 60) / scale) * blockHeight;

  const dayShifts = Array.from({ length: 7 }, (_, d) => {
    const day = addDays(weekStart, d);
    return shifts.filter((s) => {
      const start = new Date(s.startISO);
      return start.toDateString() === day.toDateString();
    });
  });

  return (
    <section className="card week-grid-card">
      <div className="week-grid" style={{ gridTemplateColumns: `72px repeat(7, minmax(180px, 1fr))` }}>
        <div className="time-col-header" />
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(weekStart, i);
          const counts = coverageTotals[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ?? [];
          const max = Math.max(...counts, 1);
          return (
            <div key={i} className="day-header">
              <strong>{formatDayHeader(d)}</strong>
              <div className="day-heatrow">
                {counts.map((c, idx) => (
                  <div key={idx} title={`Cobertura: ${c}`} style={{ opacity: 0.15 + (c / max) * 0.85 }} />
                ))}
              </div>
            </div>
          );
        })}

        <div className="time-col" style={{ height: dayHeight }}>
          {Array.from({ length: (24 * 60) / scale }, (_, idx) => {
            const mins = idx * scale;
            const hh = `${Math.floor(mins / 60)}`.padStart(2, '0');
            const mm = `${mins % 60}`.padStart(2, '0');
            return <div key={idx} style={{ height: blockHeight }}>{hh}:{mm}</div>;
          })}
        </div>

        {dayShifts.map((list, dayIdx) => (
          <div key={dayIdx} className="day-column" style={{ height: dayHeight }}>
            {Array.from({ length: (24 * 60) / scale }, (_, idx) => (
              <div key={idx} className={onlyGaps && (coverageTotals[`${addDays(weekStart, dayIdx).getFullYear()}-${addDays(weekStart, dayIdx).getMonth()}-${addDays(weekStart, dayIdx).getDate()}`]?.[idx] ?? 0) > 0 ? 'filled' : ''} style={{ height: blockHeight }} />
            ))}
            {list.map((shift, idx) => {
              const start = new Date(shift.startISO);
              const end = new Date(shift.endISO);
              const top = ((start.getHours() * 60 + start.getMinutes()) / scale) * blockHeight;
              const height = Math.max((((end.getTime() - start.getTime()) / 60000) / scale) * blockHeight, blockHeight * 0.9);
              const stack = list.filter((s) => {
                const ss = new Date(s.startISO);
                const se = new Date(s.endISO);
                return ss < end && se > start;
              });
              const col = stack.findIndex((s) => s.id === shift.id);
              const width = 100 / Math.max(stack.length, 1);
              const person = people.find((p) => p.id === shift.personId);
              const role = roles.find((r) => r.id === shift.rolId);
              return (
                <ShiftBlock
                  key={shift.id}
                  shift={shift}
                  person={person}
                  role={role}
                  onClick={() => onShiftClick(shift)}
                  style={{ top, height, left: `${col * width}%`, width: `${width}%`, zIndex: 2 + idx }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};
