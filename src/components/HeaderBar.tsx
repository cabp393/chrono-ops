import { ChevronLeft, ChevronRight, Target } from '../lib/icons';

type ViewMode = 'week' | 'schedules';

type Props = {
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
  onOpenFilters: () => void;
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
  view,
  onChangeView
}: Props) => (
  <header className="header-bar">
    <div className="header-top-row">
      <div className="brand-wrap">
        <div className="brand">ShiftBoard</div>
        <div className="segmented nav-tabs">
          <button className={view === 'week' ? 'active' : ''} onClick={() => onChangeView('week')}>Semana</button>
          <button className={view === 'schedules' ? 'active' : ''} onClick={() => onChangeView('schedules')}>Horarios</button>
        </div>
      </div>
      <div className="header-actions">
        {view === 'week' ? <button className="ghost" onClick={onOpenFilters}>Filtros</button> : null}
      </div>
    </div>

    {view === 'week' ? (
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
