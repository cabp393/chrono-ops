import { Fragment } from 'react';
import { dayLabel } from '../engine.js';

export default function CalendarGrid4Weeks({ plan, selectedDay, onSelectDay, actions, clipboard }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h2>4-Week Calendar</h2>
        <div className="row wrap toolbar">
          <button className="secondary" onClick={() => actions.copyDay(selectedDay)}>Copy Day</button>
          <button className="secondary" onClick={() => actions.pasteDay(selectedDay)} disabled={!clipboard.day}>Paste Day</button>
          <button className="secondary" onClick={() => actions.copyWeek(Math.floor(selectedDay / 7))}>Copy Week</button>
          <button className="secondary" onClick={() => actions.pasteWeek(Math.floor(selectedDay / 7))} disabled={!clipboard.week}>Paste Week</button>
          <button className="secondary" onClick={actions.repeatWeek1}>Repeat Week1 → all</button>
          <button className="secondary" onClick={() => actions.clearWeek(Math.floor(selectedDay / 7))}>Clear Week</button>
          <button className="secondary" onClick={() => actions.clearDay(selectedDay)}>Clear Day</button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="head">Week 1</div>
        <div className="head">Week 2</div>
        <div className="head">Week 3</div>
        <div className="head">Week 4</div>
        {Array.from({ length: 7 }, (_, dayOffset) => (
          <Fragment key={dayOffset}>
            {Array.from({ length: 4 }, (_, weekIdx) => {
              const dayIndex = weekIdx * 7 + dayOffset;
              const day = plan.days[dayIndex];
              return (
                <button
                  key={`${weekIdx}-${dayOffset}`}
                  className={selectedDay === dayIndex ? 'day-card selected' : 'day-card'}
                  onClick={() => onSelectDay(dayIndex)}
                >
                  <div className="day-title">{dayLabel(day.dateISO)}</div>
                  {day.isOff ? <div className="off-tag">Libre</div> : day.blocks.map((b) => (
                    <div key={b.id} className="block-line">
                      {b.start}–{b.end} {b.spansMidnight ? '↷' : ''}
                      {plan.showLabels && b.label ? ` · ${b.label}` : ''}
                    </div>
                  ))}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
