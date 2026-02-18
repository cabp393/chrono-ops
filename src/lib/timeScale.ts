import type { TimeScale } from '../types';

export const TIME_SCALE_OPTIONS: TimeScale[] = [30, 60, 120, 180, 240, 360];

export const scaleLabel = (scale: TimeScale) => {
  if (scale < 60) return `${scale} min`;
  const h = scale / 60;
  return `${h} h`;
};

export const clampScale = (scale: number): TimeScale => {
  const nearest = TIME_SCALE_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
  );
  return nearest;
};
