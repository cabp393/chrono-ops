import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut } from '../lib/icons';
import { TIME_SCALE_OPTIONS, scaleLabel } from '../lib/timeScale';
import type { TimeScale } from '../types';

type Props = {
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  scale: TimeScale;
  onScaleDown: () => void;
  onScaleUp: () => void;
  onScaleChange: (scale: TimeScale) => void;
  onAddShift: () => void;
  onOpenFilters: () => void;
};

export const HeaderBar = ({
  weekLabel,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  scale,
  onScaleDown,
  onScaleUp,
  onScaleChange,
  onAddShift,
  onOpenFilters
}: Props) => (
  <header className="header-bar">
    <div className="brand">ShiftBoard</div>
    <div className="week-controls">
      <button onClick={onPrevWeek}><ChevronLeft size={14} />Anterior</button>
      <button onClick={onCurrentWeek}>Semana actual</button>
      <button onClick={onNextWeek}>Siguiente<ChevronRight size={14} /></button>
      <span className="week-label">{weekLabel}</span>
    </div>
    <div className="header-actions">
      <div className="zoom-control">
        <button onClick={onScaleDown} aria-label="Alejar"><ZoomOut size={14} /></button>
        <select value={scale} onChange={(e) => onScaleChange(Number(e.target.value) as TimeScale)}>
          {TIME_SCALE_OPTIONS.map((option) => <option key={option} value={option}>{scaleLabel(option)}</option>)}
        </select>
        <button onClick={onScaleUp} aria-label="Acercar"><ZoomIn size={14} /></button>
      </div>
      <button className="ghost mobile-only" onClick={onOpenFilters}>Filtros</button>
      <button className="primary" onClick={onAddShift}><Plus size={14} />Agregar turno</button>
    </div>
  </header>
);
