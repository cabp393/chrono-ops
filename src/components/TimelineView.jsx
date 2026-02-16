import { Fragment, useMemo } from 'react';
import { dayLabel, dayTimelineBuckets, formatTime } from '../engine.js';

export default function TimelineView({ plan, range, selectedDay }) {
  let dayIndexes = [];
  if (range === 'all') dayIndexes = Array.from({ length: 28 }, (_, i) => i);
  if (range.startsWith('week')) {
    const week = Number(range.replace('week', ''));
    dayIndexes = Array.from({ length: 7 }, (_, i) => (week - 1) * 7 + i);
  }
  if (range === 'day') dayIndexes = [selectedDay];

  const bucketMap = useMemo(() => {
    const entries = dayIndexes.map((dayIndex) => [dayIndex, dayTimelineBuckets(plan, dayIndex, plan.resolutionMinutes)]);
    return new Map(entries);
  }, [dayIndexes.join(','), plan, plan.resolutionMinutes]);

  const rows = Math.ceil(1440 / plan.resolutionMinutes);

  return (
    <section className="panel">
      <div className="panel-title"><h2>Timeline</h2></div>
      <div className="timeline-grid" style={{ gridTemplateColumns: `110px repeat(${dayIndexes.length}, minmax(60px, 1fr))` }}>
        <div className="timeline-head" />
        {dayIndexes.map((dayIndex) => <div key={dayIndex} className="timeline-head">{dayLabel(plan.days[dayIndex].dateISO)}</div>)}

        {Array.from({ length: rows }, (_, row) => {
          const minute = row * plan.resolutionMinutes;
          return (
            <Fragment key={`row-${row}`}>
              <div className="tick-label">{formatTime(minute)}</div>
              {dayIndexes.map((dayIndex) => {
                const bucket = bucketMap.get(dayIndex)?.[row];
                return <div key={`${dayIndex}-${row}`} className={bucket?.occupied ? 'bucket on' : 'bucket'} title={bucket?.label || ''} />;
              })}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
