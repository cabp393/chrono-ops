import { ChevronLeft, ChevronRight, Plus, Target } from '../lib/icons';

type Props = {
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onAddShift: () => void;
  onOpenFilters: () => void;
};

export const HeaderBar = ({
  weekLabel,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onAddShift,
  onOpenFilters
}: Props) => (
  <header className="header-bar">
    <div className="header-top-row">
      <div className="brand">ShiftBoard</div>
      <div className="header-actions">
        <button className="ghost" onClick={onOpenFilters}>Filtros</button>
        <button className="primary add-shift-btn" onClick={onAddShift} title="Agregar turno" aria-label="Agregar turno">
          <Plus size={14} />
          <span>Agregar turno</span>
        </button>
      </div>
    </div>

    <div className="week-controls">
      <button className="icon-btn" onClick={onPrevWeek} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
      <span className="week-label">{weekLabel}</span>
      <button className="icon-btn" onClick={onNextWeek} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
      <button className="ghost current-week-btn" onClick={onCurrentWeek}><Target size={14} />Semana actual</button>
    </div>
  </header>
);
