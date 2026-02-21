import { ChevronLeft, ChevronRight, SlidersHorizontal, Target } from 'lucide-react';

type ViewMode = 'week' | 'schedules' | 'personal';

type Props = {
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onOpenFilters: () => void;
  hasActiveFilters: boolean;
  view: ViewMode;
  onChangeView: (view: ViewMode) => void;
};

export const HeaderBar = ({
  weekLabel,
  isCurrentWeek,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onOpenFilters,
  hasActiveFilters,
  view,
  onChangeView
}: Props) => (
  <header className="header-bar">
    <div className="header-top-row">
      <div className="brand-wrap">
        <div className="brand">ShiftBoard</div>
        <div className="segmented nav-tabs">
          <button className={view === 'week' ? 'active' : ''} onClick={() => onChangeView('week')}>Semana</button>
          <button className={view === 'schedules' ? 'active' : ''} onClick={() => onChangeView('schedules')}>Personal</button>
          <button className={view === 'personal' ? 'active' : ''} onClick={() => onChangeView('personal')}>Ajustes</button>
        </div>
      </div>
      <div className="header-actions">
        {view === 'week' || view === 'schedules' ? (
          <button className="icon-btn ghost filter-toggle-btn" onClick={onOpenFilters} aria-label="Abrir filtros" title="Filtros">
            <SlidersHorizontal size={15} />
            {hasActiveFilters ? <span className="filter-active-dot" aria-hidden="true" /> : null}
          </button>
        ) : null}
      </div>
    </div>

    {view === 'week' || view === 'schedules' ? (
      <div className="week-controls">
        <button
          className={`icon-btn current-week-icon ${isCurrentWeek ? 'active' : ''}`}
          onClick={onCurrentWeek}
          title="Ir a semana actual"
          aria-label="Ir a semana actual"
        >
          <Target size={15} />
        </button>
        <button className="icon-btn" onClick={onPrevWeek} aria-label="Semana anterior"><ChevronLeft size={16} /></button>
        <span className="week-label">{weekLabel}</span>
        <button className="icon-btn" onClick={onNextWeek} aria-label="Semana siguiente"><ChevronRight size={16} /></button>
      </div>
    ) : null}
  </header>
);
