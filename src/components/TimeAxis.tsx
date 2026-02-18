import type { TimeScale } from '../types';

type Props = {
  scale: TimeScale;
  blockHeight: number;
};

export const TimeAxis = ({ scale, blockHeight }: Props) => (
  <div className="time-axis" style={{ gridTemplateRows: `repeat(${(24 * 60) / scale}, ${blockHeight}px)` }}>
    {Array.from({ length: (24 * 60) / scale }, (_, idx) => {
      const mins = idx * scale;
      const hh = `${Math.floor(mins / 60)}`.padStart(2, '0');
      const mm = `${mins % 60}`.padStart(2, '0');
      return <div key={idx}>{hh}:{mm}</div>;
    })}
  </div>
);
